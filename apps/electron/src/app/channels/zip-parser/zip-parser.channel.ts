import * as fs from 'fs';
import * as path from 'path';
import { Channel, Path, Req } from '@oam-kit/decorators';
import { IpcRequest } from '@oam-kit/shared-interfaces';
import * as unzipper from 'unzipper';
import * as temp from 'temp';
import * as escapeStringRegexp from 'escape-string-regexp';
import * as xzStream from 'node-liblzma';
import * as shell from 'shelljs';

export interface Rule {
  name: string;
  pathList: string[];
  firstRegex: RegExp;
  secondRegex: RegExp;
  defaultEditor: string;
  targetPath: string;
}

export enum CompressionType {
  ZIP = 'zip',
  XZ = 'xz',
}

const decompressorMap = {
  [CompressionType.XZ]: (src: string, dest: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(src);
      const output = fs.createWriteStream(dest);

      output.on('finish', () => resolve());
      output.on('error', (err) => {
        reject(err);
      });

      input.pipe(new xzStream.Unxz()).pipe(output);
    });
  },
  [CompressionType.ZIP]: (src: string, dest: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const unzip = unzipper.Extract({ path: dest });
      const input = fs.createReadStream(src);

      unzip.on('finish', () => resolve());
      unzip.on('error', (err) => {
        reject(err);
      });

      input.pipe(unzip);
    });
  },
};

temp.track();

@Channel('zip_parser')
export class ZipParser {
  private _tmpzipfolder: string;

  @Path('/getFilesByRules')
  public async getFilesByRules(@Req req: IpcRequest): Promise<Rule[]> {
    try {
      const rules: Rule[] = req.data.rules;
      const zipPath: string = req.data.zipPath;
      
      if (!/(\.zip)$/.test(zipPath))
        throw(new Error(`Invalid zip file path=${zipPath}`));

      for (const rule of rules) {
        const firstParts = await this.getFirstParts(zipPath, rule);
        for (const firstPart of firstParts) {
          if (rule.secondRegex) {
            const secondParts = await this.getSecondParts(firstPart, rule);
            for (const secondPart of secondParts) {
              rule.pathList.push(`${firstPart}/${secondPart}`);
            }
          } else {
            rule.pathList.push(firstPart);
          }
        }
      }
      return rules;
    } catch (error) {
      console.error(error);
    } finally {
      temp.cleanup();
      this._tmpzipfolder = null;
    }
  }

  @Path('OpenFileByRule')
  public async openFileByRule(@Req req: IpcRequest) {
    const rule = req.data as Rule;
    shell.exec(`open ${rule.targetPath} -a ${rule.defaultEditor}`);
  }

  private async getFirstParts(zipPath: string, rule: Rule): Promise<string[]> {
    const ret = [];
    this._tmpzipfolder = this._tmpzipfolder ? this._tmpzipfolder : await this.decompressToTempDir(zipPath);
    const snapshotFileListContent = fs.readFileSync(path.join(this._tmpzipfolder, 'snapshot_file_list.txt'), 'utf8');
    const firstPartRet = snapshotFileListContent.match(new RegExp(rule.firstRegex, 'g'));

    if (!firstPartRet) {
      throw new Error(`Unable to find first part of rule ${rule.name}`);
    }

    for (let part of firstPartRet) {
      if (this.isUnderSubfolder(part)) {
        part = part.trim();
        const preRegex = /([^\s]+):[^:]+/.source;
        const postRegex = escapeStringRegexp(part);
        const regexRet = snapshotFileListContent.match(new RegExp(preRegex + postRegex));
        if (!regexRet) {
          throw new Error(`Unable to find subfolder`);
        }

        let subfolder = regexRet[1];
        if (this.isCompressed(subfolder)) {
          const dest = await this.decompress(path.join(this._tmpzipfolder, subfolder));
          subfolder = this.getFileOrFolderNameByPath(dest);
        }

        if (this.isCompressed(part)) {
          const dest = await this.decompress(path.join(this._tmpzipfolder, subfolder, part));
          part = this.getFileOrFolderNameByPath(dest);
        }
        ret.push(`${subfolder}/${part}`);
      } else {
        part = part.trim();
        if (this.isCompressed(part)) {
          const dest = await this.decompress(path.join(this._tmpzipfolder, part));
          part = this.getFileOrFolderNameByPath(dest);
        }
        ret.push(part);
      }
    }

    return ret;
  }

  private async getSecondParts(firstPart: string, rule: Rule): Promise<string[]> {
    const ret = [];
    const files = fs.readdirSync(path.join(this._tmpzipfolder, firstPart));
    for (let file of files) {
      if (rule.secondRegex.test(file)) {
        if (this.isCompressed(file)) {
          const dest = await this.decompress(path.join(this._tmpzipfolder, firstPart, file));
          file = this.getFileOrFolderNameByPath(dest);
        }
        ret.push(file);
      }
    }
    return ret;
  }

  private getFileOrFolderNameByPath(src: string): string {
    const regexRet = src.match(/\/([^/]+)$/);
    if (!regexRet)
      throw(new Error(`Unable to find file or folder name by path=${src}`));
    return regexRet[1];
  }

  private async decompressToTempDir(zipPath: string): Promise<string> {
    const zipName = zipPath.match(/([^/]+?)\.zip$/)[1];
    const tmpdir = temp.mkdirSync('oam-kit/');
    const tmpzipfolder = path.join(tmpdir, zipName);
    await this.decompress(zipPath, tmpzipfolder);
    return tmpzipfolder;
  }

  private async decompress(src: string, dest?: string, type?: CompressionType): Promise<string> {
    type = type || this.getCompressionType(src);

    const decompressor = decompressorMap[type];
    if (!decompressor)
      throw(new Error(`Unsupported compression type: ${type}`));

    dest = dest || src.match(new RegExp(`(.+).${type}$`))[1];

    if (!dest)
      throw(new Error(`Unable to find correct destination path, src=${src}`));

    await decompressor(src, dest);

    return dest;
  }

  private getCompressionType(file: string): CompressionType {
    const regexRet = file.match(/\.(zip|xz)$/);
    if (!regexRet) throw new Error(`Unable to find correct compression type by regex, file=${file}`);

    if (!(regexRet[1] in decompressorMap)) throw new Error(`Unsupported compression type: ${regexRet[1]}`);

    return regexRet[1] as CompressionType;
  }

  private isUnderSubfolder(name: string): boolean {
    return /^\s{4}/.test(name);
  }

  private isCompressed(file: string): boolean {
    return /\.(zip|xz)/.test(file);
  }
}

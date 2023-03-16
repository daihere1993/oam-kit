import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import * as escapeStringRegexp from 'escape-string-regexp';
import * as xzStream from 'node-liblzma';
import * as shell from 'shelljs';
import * as zlib from 'zlib';
import { Rule } from '@oam-kit/shared-interfaces';
import { Channel, Path, Req } from '@oam-kit/decorators';
import { IpcRequest, ZipParser } from '@oam-kit/shared-interfaces';
import { StoreService } from '@electron/app/services/store.service';

export enum CompressionType {
  ZIP = 'zip',
  XZ = 'xz',
  GZ = 'gz'
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
  [CompressionType.GZ]: (src: string, dest: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(src);
      const output = fs.createWriteStream(dest);

      output.on('finish', () => resolve());
      output.on('error', (err) => {
        reject(err);
      });

      input.pipe(zlib.createGunzip()).pipe(output);
    });
  }
};

@Channel('zip_parser')
export class ZipParserChannel {
  private _tmpzipfolder: string;

  constructor(private _store: StoreService) {}

  @Path('/unzipByRules')
  public async unzipByRules(@Req req: IpcRequest): Promise<Rule[]> {
    let rules: Rule[];
    let src: string;
    if (this._store) {
      src = req.data;
      rules = this._store.getModel<ZipParser>('zipParser').get('rules');
    } else {
      rules = req.data.rules;
      src = req.data.zipPath;
    }

    const dest = path.join(path.dirname(src), this.getZipFileName(src));

    // can only parse '.zip' file
    if (path.extname(src) != '.zip')
      throw(new Error(`Don't support decompress '${path.extname(src)}' file, can only parse '.zip' file`));
    // if file had been unzipped, delete it
    if (fs.existsSync(dest))
      fs.rmSync(dest, { recursive: true, force: true });
    // unzip the zip file to the current folder
    await this.decompress(src);
    // check if the zip file has snapshot_file_list.txt, if not, throw an error
    if (!fs.existsSync(path.join(dest, 'snapshot_file_list.txt')))
      throw new Error('The zip file does not have snapshot_file_list.txt, thus I can not parse it.');
    
    const snapshotFileListContent = fs.readFileSync(path.join(dest, 'snapshot_file_list.txt'), 'utf8');
    if (!snapshotFileListContent)
      throw new Error('The snapshot_file_list.txt is empty, thus I can not parse it.');

    for (const rule of rules) {
      rule.parsingInfos.rootDir = dest;
      rule.parsingInfos.pathList = [];
      const firstParts = await this.handleFirstRegex(dest, snapshotFileListContent, rule);
      for (const firstPart of firstParts) {
        if (rule.secondRegex) {
          const secondParts = await this.handleSecondRegex(dest, firstPart, rule);
          for (const secondPart of secondParts) {
            rule.parsingInfos.pathList.push(`${firstPart}/${secondPart}`);
          }
        } else {
          rule.parsingInfos.pathList.push(firstPart);
        }
      }
    }

    return rules;
  }

  @Path('/openFileByRule')
  public openFileByRule(@Req req: IpcRequest) {
    try {
      const { editor, filePath } = req.data;
      shell.exec(`open ${filePath} -a ${editor}`, (code, stdout, stderr) => {
        if (code === 0) {
          return null;
        } else {
          console.error(code);
          Promise.reject();
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  private async handleFirstRegex(src: string, snapshotFileListContent: string, rule: Rule): Promise<string[]> {
    const pathList = [];
    const results = snapshotFileListContent.match(new RegExp(rule.firstRegex, 'g'));

    if (!results)
      throw new Error(`Unable to find file by regext ${rule.firstRegex} for rule=${rule.name}`);

    for (let item of results) {
      if (this.isUnderSubfolder(item)) {
        item = item.trim();
        const preRegex = /([^\s]+):[^:]+/.source;
        const postRegex = escapeStringRegexp(item);
        const regexRet = snapshotFileListContent.match(new RegExp(preRegex + postRegex));
        if (!regexRet)
          throw new Error(`Unable to find subfolder for rule=${rule.name}`);

        let subfolder = regexRet[1];
        if (this.isCompressed(subfolder)) {
          const dest = await this.decompress(path.join(rule.parsingInfos.rootDir, subfolder));
          subfolder = path.parse(dest).base;
        }

        if (this.isCompressed(item)) {
          const dest = await this.decompress(path.join(rule.parsingInfos.rootDir, subfolder, item));
          item = path.parse(dest).base;
        }
        pathList.push(`${subfolder}/${item}`);
      } else {
        item = item.trim();
        if (this.isCompressed(item)) {
          const dest = await this.decompress(path.join(rule.parsingInfos.rootDir, item));
          item = path.parse(dest).base;
        }
        pathList.push(item);
      }
    }

    return pathList;
  }

  private async handleSecondRegex(src: string, firstPart: string, rule: Rule): Promise<string[]> {
    const ret = [];
    const files = fs.readdirSync(path.join(src, firstPart));
    for (let file of files) {
      if (rule.secondRegex.test(file)) {
        if (this.isCompressed(file)) {
          const dest = await this.decompress(path.join(src, firstPart, file));
          file = path.parse(dest).base;
        }
        ret.push(file);
      }
    }
    return ret;
  }

  private async decompress(src: string, dest?: string, type?: CompressionType): Promise<string> {
    type = type || this.getCompressionType(src);

    if (!type) {
      console.log('can not find correct compression type, then no need cot decompress');
      return;
    }

    const decompressor = decompressorMap[type];
    if (!decompressor)
      throw(new Error(`Unsupported compression type: ${type}`));

    dest = dest || src.match(new RegExp(`(.+).${type}$`))[1];

    if (!dest)
      throw(new Error(`Unable to find correct destination path, src=${src}`));

    await decompressor(src, dest);

    return dest;
  }

  private getZipFileName(src: string): string {
    const regexRet = src.match(/([^/]+?)\.zip$/);
    if (!regexRet)
      throw(new Error(`Unable to find zip file name by path=${src}`));
    return regexRet[1];
  }

  private getCompressionType(file: string): CompressionType {
    const type = path.extname(file).match(/\.(.+)/)[1];
    if (!(type in decompressorMap)) {
      console.log(`Don't support decompress '${path.extname(file)}' file, can only parse '.zip' file`);
      return null;
    }

    return type as CompressionType;
  }

  private isUnderSubfolder(name: string): boolean {
    return /^\s{4}/.test(name);
  }

  private isCompressed(file: string): boolean {
    return !!this.getCompressionType(file);
  }
}

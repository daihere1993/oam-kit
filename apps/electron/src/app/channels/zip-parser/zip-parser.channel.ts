import * as fs from 'fs';
import * as path from 'path';
import { Channel, Path, Req } from '@oam-kit/decorators';
import { IpcRequest } from '@oam-kit/shared-interfaces';
import * as unzipper from 'unzipper';
import * as temp from 'temp';
import escapeStringRegexp from 'escape-string-regexp';

export interface Rule {
  name: string;
  pathList: string[];
  firstRegex: RegExp;
  secondRegex: RegExp;
  defaultEditor: string;
}

temp.track();

@Channel('zip_parser')
export class ZipParser {
  private _tmpzipfolder: string;

  @Path('/getFilesByRules')
  public async getFilesByRules(@Req req: IpcRequest): Promise<Rule[]> {
    try {
      const rules: Rule[] = req.data.rules;
      const zipPath: string = req.data.zipPath;
      for (const rule of rules) {
        const firstParts = await this.getFristParts(zipPath, rule);
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
      console.error(error.message);
    } finally {
      temp.cleanup();
      this._tmpzipfolder = null;
    }
  }

  @Path('OpenFileByRule')
  public async openFileByRule(@Req req: IpcRequest) {
  }

  private async getFristParts(zipPath: string, rule: Rule): Promise<string[]> {
    const ret = [];
    this._tmpzipfolder = this._tmpzipfolder ? this._tmpzipfolder : await this.unzipToTempDir(zipPath);
    const snapshotFileListContent = fs.readFileSync(path.join(this._tmpzipfolder, 'snapshot_file_list.txt'), 'utf8');
    const firstPartRet = snapshotFileListContent.match(new RegExp(rule.firstRegex, 'g'));

    if (!firstPartRet) {
      throw(new Error(`Unable to find first part of rule ${rule.name}`));
    }

    for (let part of firstPartRet) {
      if (this.isUnderSubfolder(part)) {
        part = part.trim();
        const preRegex = /([^\s]+):[^:]+/.source;
        const postRegex = part
          .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
          .replace(/-/g, '\\x2d');
        const regexRet = snapshotFileListContent.match(new RegExp(preRegex + postRegex));
        if (!regexRet) {
          throw(new Error(`Unable to find subfolder`));
        }

        let fullname: string;
        let subfolder = regexRet[1];
        if (this.isZipped(subfolder)) {
          [fullname, subfolder] = subfolder.match(/([^.]+)\.\w+/);
          const source = path.join(this._tmpzipfolder, fullname);
          const target = path.join(this._tmpzipfolder, subfolder);
          await this.unzipFile(source, target);
        }

        if (this.isZipped(part)) {
          [fullname, part] = part.match(/([^.]+)\.\w+/);
          const source = path.join(this._tmpzipfolder, subfolder, fullname);
          const target = path.join(this._tmpzipfolder, subfolder, part);
          await this.unzipFile(source, target);
        }
        ret.push(`${subfolder}/${part}`);
      } else {
        part = part.trim();
        if (this.isZipped(part)) {
          let fullname: string;
          const source = path.join(this._tmpzipfolder, fullname);
          const target = path.join(this._tmpzipfolder, part);
          await this.unzipFile(source, target);
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
        if (this.isZipped(file)) {
          let fullname: string;
          [fullname, file] = file.match(/(.+)\.\w+/);
          const source = path.join(this._tmpzipfolder, firstPart, fullname);
          const target = path.join(this._tmpzipfolder, firstPart);
          await this.unzipFile(source, target);
        }
        ret.push(file);
      }
    }
    return ret;
  }

  private getZipName(zipPath: string): string {
    const regexRet = zipPath.match(/([^/]+?)\.zip$/);
    if (!regexRet)
      throw(new Error(`Unable to find correct zip file name by regex, zipPath=${zipPath}`));
    return regexRet[1];
  }

  private async unzipToTempDir(zipPath: string): Promise<string> {
    const zipName = this.getZipName(zipPath);
    const tmpdir = temp.mkdirSync('oam-kit/');
    const tmpzipfolder = path.join(tmpdir, zipName);
    await this.unzipFile(zipPath, tmpzipfolder);
    return tmpzipfolder;
  }

  private unzipFile(source: string, target: string): Promise<void> {
    const unzipExtractor = unzipper.Extract({ path: target });

    return new Promise((resolve, reject) => {
      unzipExtractor.on('close', () => {
        resolve();
      });

      unzipExtractor.on('error', (e) => {
        reject(`Exception during unzip for ${source}, reason: ${e.message}`);
      });

      fs.createReadStream(source)
        .pipe(unzipExtractor);
    });
  }

  private isUnderSubfolder(name: string): boolean {
    return /^\s{4}/.test(name);
  }

  private isZipped(file: string): boolean {
    return /\.(zip|tar|xz|tgz)/.test(file);
  }
}
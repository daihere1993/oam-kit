import * as fs from 'fs';
import * as path from 'path';
import * as StreamZip from 'node-stream-zip';
import * as escapeStringRegexp from 'escape-string-regexp';
// import * as xzStream from 'node-liblzma';
import * as zlib from 'zlib';
import { Rule } from '@oam-kit/shared-interfaces';
import { Channel, Path, Req } from '@oam-kit/decorators';
import { IpcRequest, ZipParser } from '@oam-kit/shared-interfaces';
import { StoreService } from '@electron/app/services/store.service';
import Logger from '@electron/app/core/logger';

const logger = Logger.for('ZipParserChannel');
const COMPRESSION_TYPES = new Set(['.zip', '.gz', '.xz']);

const decompressorMap = {
  // 由于在 windows 下使用 node-liblzma 来解压 xz 文件特别慢，W/A 就是让用户自己来解压
  // ['.xz']: (src: string, dest: string): Promise<void> => {
  //   return new Promise((resolve, reject) => {
  //     const input = fs.createReadStream(src);
  //     const output = fs.createWriteStream(dest);
  //     console.time('decompress xz file');
  //     output.on('finish', () => {
  //       console.timeEnd('decompress xz file');
  //       resolve()
  //     });
  //     output.on('error', (err) => {
  //       reject(err);
  //     });

  //     input.pipe(new xzStream.Unxz()).pipe(output);
  //   });
  // },
  ['.zip']: async (src: string, dest: string): Promise<void> => {
    const zip = new StreamZip.async({ file: src });
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    await zip.extract(null, dest);
    await zip.close();
  },
  ['.gz']: (src: string, dest: string): Promise<void> => {
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
    const src = req.data;
    const rules = this._store.getModel<ZipParser>('zipParser').get('rules');
    return await this._unzipByRules(src, rules);
  }

  private async _unzipByRules(src: string, rules: Rule[]): Promise<Rule[]> {
    if (!rules)
      throw new Error(`Can not find any rules, please clean legacy data.`);

    if (!fs.existsSync(src))
      throw new Error(`Can not find the file ${src}`);

    let dest: string;

    if (this.isFolder(src)) {
      dest = src;
    } else {
      // can only parse '.zip' file
      if (path.extname(src) != '.zip')
        throw(new Error(`Don't support decompress '${path.extname(src)}' file, can only parse '.zip' file`));
  
      dest = path.join(path.dirname(src), path.parse(src).name);
      // unzip the zip file to the current folder
      if (this.isCompressed(src)) {
        console.time('decompress snapshot');
        await this.decompress(src);
        console.timeEnd('decompress snapshot');
      }
    }

    // check if the zip file has snapshot_file_list.txt, if not, throw an error
    if (!fs.existsSync(path.join(dest, 'snapshot_file_list.txt')))
      throw new Error('The zip file does not have snapshot_file_list.txt, thus I can not parse it.');

    const snapshotFileListContent = fs.readFileSync(path.join(dest, 'snapshot_file_list.txt'), 'utf8');
    if (!snapshotFileListContent)
      throw new Error('The snapshot_file_list.txt is empty, thus I can not parse it.');

    for (const rule of rules) {
      rule.parsingInfos.rootDir = dest;
      rule.parsingInfos.pathList = [];
      console.time(`decompress for rule=${rule.name}`);
      const firstParts = await this.handleFirstRegex(snapshotFileListContent, rule);
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
      console.timeEnd(`decompress for rule=${rule.name}`);
    }

    return rules;
  }

  private async handleFirstRegex(snapshotFileListContent: string, rule: Rule): Promise<string[]> {
    const pathList = [];
    const results = snapshotFileListContent.match(new RegExp(rule.firstRegex, 'g'));

    if (!results) {
      logger.info(`Unable to find file by regex ${rule.firstRegex} for rule=${rule.name}`);
      return [];
    }

    for (let item of results) {
      if (this.isUnderSubfolder(item)) {
        item = item.trim();
        const preRegex = /([^\s]+):[^:]+/.source;
        const postRegex = escapeStringRegexp(item);
        const regexRet = snapshotFileListContent.match(new RegExp(preRegex + postRegex));
        if (!regexRet) {
          logger.warn((`Unable to find subfolder for rule=${rule.name}`));
          return [];
        }

        let subfolder = regexRet[1];
        subfolder = this.isCompressed(subfolder) ?
          await this.decompress(path.join(rule.parsingInfos.rootDir, subfolder)) : subfolder;

        item = this.isCompressed(item) ?
          await this.decompress(path.join(rule.parsingInfos.rootDir, subfolder, item)) : item;
        pathList.push(`${subfolder}/${item}`);
      } else {
        item = item.trim();
        item = this.isCompressed(item) ?
          await this.decompress(path.join(rule.parsingInfos.rootDir, item)) : item;
        pathList.push(item);
      }
    }

    return pathList;
  }

  private async handleSecondRegex(src: string, firstPart: string, rule: Rule): Promise<string[]> {
    const ret: Set<string> = new Set();
    const files = fs.readdirSync(path.join(src, firstPart));
    for (let file of files) {
      if (rule.secondRegex.test(file)) {
        file = this.isCompressed(file) ?
          await this.decompress(path.join(src, firstPart, file)) : file;
        ret.add(file);
      }
    }
    return Array.from(ret);
  }

  private async decompress(src: string, dest?: string, type?: string): Promise<string> {
    type = type || this.getCompressionType(src);

    const filename = path.parse(src).base;
    if (!type) {
      logger.info(`${filename} has not been compressed, then no needs to decompress`);
      return filename;
    }

    dest = dest || src.match(new RegExp(`(.+)${type}$`))[1];
    if (!dest)
      throw(new Error(`Unable to find correct destination path, src=${src}`));
    if (fs.existsSync(dest)) {
      logger.info(`${src} has been decompressed to ${dest}`);
      return path.parse(dest).base;
    }

    const decompressor = decompressorMap[type];
    if (!decompressor) {
      logger.info(`Unsupported compression type: ${type}`);
      return filename;
    }
    await decompressor(src, dest);

    return path.parse(dest).base;
  }

  private getCompressionType(file: string): string {
    const type = path.extname(file);

    if (COMPRESSION_TYPES.has(type)) {
      return type;
    } else {
      return null;
    }
  }

  private isUnderSubfolder(name: string): boolean {
    return /^\s{4}/.test(name);
  }

  private isCompressed(file: string): boolean {
    return COMPRESSION_TYPES.has(path.extname(file));
  }

  private isFolder(src: string): boolean {
    if (fs.existsSync(src)) {
      return fs.lstatSync(src).isDirectory();
    } else {
      return false;
    }
  }
}

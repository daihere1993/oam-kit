import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { promisify } from 'util';
import { app, remote } from 'electron';
import { Observable } from 'rxjs';
import { storeName } from '@oam-kit/utility/overall-config';
import { NodeSSH } from 'node-ssh';
import { ChangedFiles, ChangedFileType } from '@oam-kit/utility/types';

export function getTestDir(): string {
  return path.join(__dirname, '../../__test__');
}

export function getUserDataPath(): string {
  if (app || remote) {
    return path.join((app || remote.app).getPath('userData'), '/data');
  }
  return getTestDir();
}

export function isFirstLoad() {
  const targetPath = path.join(getUserDataPath(), storeName);
  return !fs.existsSync(targetPath);
}

export function getTempDir(): string {
  return path.join(getUserDataPath(), 'tmp');
}

export function getRBIdByPageLink(link: string): number {
  try {
    return link.match(/\d+/g).map(Number)[0];
  } catch (error) {
    console.debug(error.message);
  }
}
export function isObject(obj: any): boolean {
  return typeof obj === 'object' && obj !== null;
}

export function isEmptyObj(obj: { [key: string]: any }): boolean {
  if (!isObject(obj)) {
    throw new Error('Argument must be a Object.');
  }

  if (!obj) {
    return true;
  }

  for (const [, value] of Object.entries(obj)) {
    if (value) {
      return false;
    }
  }
  return true;
}

export function getChangedFiledAmount(diffContent: string): number {
  return diffContent.split('(working copy)').length - 1;
}

export function downLoadDiff(url: string, target: string): Observable<string> {
  return new Observable<string>((subscriber) => {
    axios
      .get(url, { responseType: 'stream' })
      .then((response) => {
        response.data.pipe(fs.createWriteStream(target)).on('close', () => {
          subscriber.next(target);
          subscriber.complete();
        });
        return 0;
      })
      .catch((err) => {
        console.error(err);
        subscriber.next('');
        subscriber.complete();
        // throw err;
      });
  });
}

export async function isRemotePathExist(ssh: NodeSSH, path: string) {
  const { stdout, stderr } = await ssh.execCommand('pwd', { cwd: path });

  if (stderr) {
    throw new Error(`isRemotePathExist: No such directory(${path})`);
  }

  return stdout === path;
}

export async function getChangedFiles(diffPath: string, isSvn: boolean): Promise<ChangedFiles> {
  const ret: ChangedFiles = {};
  const utilFns = {
    isNewFile(diff: string, isSvn: boolean): boolean {
      const rows = diff.split('\n');
      if (isSvn) {
        return rows[1].includes('nonexistent');
      } else {
        return rows[1].includes('new file mode');
      }
    },
    isDeletedFile(diff: string, isSvn: boolean): boolean {
      const rows = diff.split('\n');
      if (isSvn) {
        return rows[1].includes('revision') && rows[2].includes('nonexistent');
      } else {
        return rows[1].includes('deleted file mode');
      }
    },
    isRenamedFile(diff: string, isSvn: boolean): boolean {
      // Only in git could figure out if file got renamed
      if (isSvn) {
        return false;
      }
      const rows = diff.split('\n');
      return rows[2].includes('rename from') && rows[3].includes('rename to');
    },
    getChangedFilePath(diff: string, isSvn: boolean): string {
      const rows = diff.split('\n');
      if (isSvn) {
        return rows[1].match(/--- (.*)\t/)[1];
      } else {
        return rows[0].match(/ b\/(.*)/)[1];
      }
    }
  };

  let sections: string[];
  const diff = (await promisify(fs.readFile)(diffPath)).toString();
  if (isSvn) {
    sections = diff.split('===================================================================');
  } else {
    sections = diff.split('diff --git');
  }
  sections.shift();
  for (const section of sections) {
    if (utilFns.isNewFile(section, isSvn)) {
      ret[utilFns.getChangedFilePath(section, isSvn)] = ChangedFileType.NEW;
    } else if (utilFns.isDeletedFile(section, isSvn)) {
      ret[utilFns.getChangedFilePath(section, isSvn)] = ChangedFileType.DELETE;
    } else if (utilFns.isRenamedFile(section, isSvn)) {
      ret[utilFns.getChangedFilePath(section, isSvn)] = ChangedFileType.RENAME;
    } else {
      ret[utilFns.getChangedFilePath(section, isSvn)] = ChangedFileType.NORMAL;
    }
  }

  return ret;
}

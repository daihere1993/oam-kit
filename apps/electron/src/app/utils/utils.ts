import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { app, remote } from 'electron';
import { Observable } from 'rxjs';
import { storeName } from '@oam-kit/utility/overall-config';

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

export function getChangedFiles(diffContent: string, filter?: (a: string) => boolean): string[] {
  const changedFiles = [];
  const tmp1 = diffContent.split('+++ ');
  for (let i = 1; i < tmp1.length; i++) {
    const target = tmp1[i].split('(')[0].trim();
    if (!filter || filter(target)) {
      changedFiles.push(target);
    }
  }

  return changedFiles;
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

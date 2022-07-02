import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { ChangedFile, ChangedFileType } from './changedFile';

describe('ChangedFile()', () => {
  let file1: ChangedFile;
  let file2: ChangedFile;

  beforeAll(async () => {
    const fielPath = path.join(__dirname, `test/git_diff_seg_1.diff`);
    const content = (await promisify(fs.readFile)(fielPath)).toString();

    file1 = new ChangedFile({
      path: 'a.txt',
      originalPath: 'a.txt',
      type: ChangedFileType.modification,
      content: content
    });
    file2 = new ChangedFile({
      path: 'a.txt',
      originalPath: 'a.txt',
      type: ChangedFileType.modification,
      content: content
    });
  });

  describe('isSameChange()', () => {
    it('should return true if is same change', () => {
      expect(file1.isSameChange(file2)).toBeTruthy();
    });
  });
});

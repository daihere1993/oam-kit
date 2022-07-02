import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ChangedFile, ChangedFileType } from './changedFile';
import {  GitPatchChecker, SvnPatchChecker } from './patchChecker';

async function getDiffSegContent(file: string): Promise<string> {
  const fielPath = path.join(__dirname, `test/${file}`);
  return (await promisify(fs.readFile)(fielPath)).toString();
}

describe.skip('GitDiffChecker()', () => {
  const checker = new GitPatchChecker();

  it('should get correct changed files', async () => {
    const patchPath = path.join(__dirname, 'test/git_test.diff');
    const patch = (await promisify(fs.readFile)(patchPath)).toString();
    const changedFiles = await checker.getChangedFiles(patch);

    const expectation: ChangedFile[] = [
      new ChangedFile({
        path: 'SC_MONOLITH/DM_RUMAG/test/UT/tests/ECpri/PerformanceMonitoringManagement/ECpriReceptionMonitorHandlerVduTests.cpp',
        originalPath: 'SC_MONOLITH/DM_RUMAG/test/UT/tests/ECpri/PerformanceMonitoringManagement/ECpriReceptionMonitorHandlerVduTests.cpp',
        type: ChangedFileType.modification,
        content: await getDiffSegContent('git_diff_seg_1.diff'),
      }),
      new ChangedFile({
        path: 'SC_MONOLITH/DM_RUMAG/test/UT/tests/ECpri/PerformanceMonitoringManagement/ECpriTechLogHandlerTests1.cpp',
        originalPath: 'SC_MONOLITH/DM_RUMAG/test/UT/tests/ECpri/PerformanceMonitoringManagement/ECpriTechLogHandlerTests.cpp',
        type: ChangedFileType.rename,
        content: await getDiffSegContent('git_diff_seg_2.diff'),
      }),
      new ChangedFile({
        path: 'django.txt',
        originalPath: 'django.txt',
        type: ChangedFileType.create,
        content: await getDiffSegContent('git_diff_seg_3.diff'),
      }),
      new ChangedFile({
        path: 'test.txt',
        originalPath: 'test.txt',
        type: ChangedFileType.delete,
        content: await getDiffSegContent('git_diff_seg_4.diff'),
      }),
    ];

    expect(changedFiles.length).toEqual(expectation.length);
    changedFiles.forEach((item, i) => {
      expect(item.isSameChange(expectation[i], true)).toBeTruthy();
    });
  });
});

describe.skip('SvnDiffChecker()', () => {
  const checker = new SvnPatchChecker();
  it('should get correct changed files', async () => {
    const patchPath = path.join(__dirname, 'test/svn_test.diff');
    const patch = (await promisify(fs.readFile)(patchPath)).toString();
    const changedFiles = await checker.getChangedFiles(patch);

    const expectation: ChangedFile[] = [
      new ChangedFile({ 
        path: 'django.txt',
        originalPath: 'django.txt',
        type: ChangedFileType.create,
        content: await getDiffSegContent('svn_diff_seg_1.diff'),
      }),
      new ChangedFile({ 
        path: 'mfo',
        originalPath: 'mfo',
        type: ChangedFileType.modification,
        content: await getDiffSegContent('svn_diff_seg_2.diff'),
      }),
      new ChangedFile({ 
        path: 'mfo.conf',
        originalPath: 'mfo.conf',
        type: ChangedFileType.delete,
        content: await getDiffSegContent('svn_diff_seg_3.diff'),
      }),
      new ChangedFile({ 
        path: 'mfo2.conf',
        originalPath: 'mfo2.conf',
        type: ChangedFileType.create,
        content: await getDiffSegContent('svn_diff_seg_4.diff'),
      }),
      new ChangedFile({ 
        path: 'mfosetenv.env',
        originalPath: 'mfosetenv.env',
        type: ChangedFileType.delete,
        content: await getDiffSegContent('svn_diff_seg_5.diff'),
      }),
      new ChangedFile({ 
        path: 'test.diff',
        originalPath: 'test.diff',
        type: ChangedFileType.create,
        content: await getDiffSegContent('svn_diff_seg_6.diff'),
      }),
    ];

    expect(changedFiles.length).toEqual(expectation.length);
    changedFiles.forEach((item, i) => {
      expect(item.isSameChange(expectation[i])).toBeTruthy();
    });
  });
});

import * as path from 'path';
import { getChangedFiles } from './utils';
import { ChangedFiles, ChangedFileType } from '@oam-kit/utility/types';

describe('getChangedFiles()', () => {
  it('should get correct changed files in git environment', async () => {
    const diffPath = path.join(__dirname, 'test/git_test.diff');
    const changedFiles = await getChangedFiles(diffPath, false);
    const expectation: ChangedFiles = {
      'django.txt': ChangedFileType.NEW,
      'test.txt': ChangedFileType.DELETE,
      'SC_MONOLITH/DM_RUMAG/test/UT/tests/ECpri/PerformanceMonitoringManagement/ECpriTechLogHandlerTests1.cpp': ChangedFileType.RENAME,
      'SC_MONOLITH/DM_RUMAG/test/UT/tests/ECpri/PerformanceMonitoringManagement/ECpriReceptionMonitorHandlerVduTests.cpp': ChangedFileType.NORMAL,
    };

    expect(changedFiles).toEqual(expectation);
  });

  it('should get correct changed files in svn environment', async () => {
    const diffPath = path.join(__dirname, 'test/svn_test.diff');
    const changedFiles = await getChangedFiles(diffPath, true);
    const expectation: ChangedFiles = {
      'django.txt': ChangedFileType.NEW,
      'mfo2.conf': ChangedFileType.NEW,
      'test.diff': ChangedFileType.NEW,
      'mfo.conf': ChangedFileType.DELETE,
      'mfosetenv.env': ChangedFileType.DELETE,
      'mfo': ChangedFileType.NORMAL,
    };

    expect(changedFiles).toEqual(expectation);
  });
});


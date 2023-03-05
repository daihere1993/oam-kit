import * as path from 'path';
import { IpcRequest } from '@oam-kit/shared-interfaces';
import { Rule, ZipParser } from './zip-parser.channel';


const testZipPath = path.join(
  __dirname,
  'test-resources/Snapshot_MRBTS-2515_MRBTS-2515_SBTS23R2_ENB_9999_230205_000010_20230206-1559.zip'
);

describe('ZipParser', () => {
  const zipParser = new ZipParser();

  it('should get correct files with specific rules', async () => {
    const rules: Rule[] = [
      // ims2
      { name: 'ims2', firstRegex: /.+\.ims2/, secondRegex: null, defaultEditor: '', pathList: [], targetPath: '' },
      // moam runtime log
      {
        name: 'moam_runtime.log',
        firstRegex: /.+_1011_runtime\.zip/,
        secondRegex: /runtime_DEFAULT\.log/,
        defaultEditor: '',
        pathList: [],
        targetPath: ''
      },
    ];
    const ipcReq: IpcRequest = { data: { zipPath: testZipPath, rules } };
    const retRules = await zipParser.getFilesByRules(ipcReq);
    expect(retRules.length).toBe(2);
    const ims2Rule = retRules[0];
    const moamLogRule = retRules[1];

    expect(ims2Rule.pathList).toContain('BTS2515_1011_part_13/BTS2515_1011_im_snapshot.ims2');
    expect(ims2Rule.pathList).toContain('BTS2515_1011_part_13/BTS2515_1011_pm_2_im_snapshot.ims2');
    expect(ims2Rule.pathList).toContain('BTS2515_1011_part_14/BTS2515_1011_pm_1_im_snapshot.ims2');
    expect(ims2Rule.pathList).toContain('BTS2515_2011_part_7/BTS2515_2011_im_snapshot.ims2');
    expect(ims2Rule.pathList).toContain('BTS2515_2011_part_8/BTS2515_2011_pm_2_im_snapshot.ims2');
    expect(ims2Rule.pathList).toContain('BTS2515_2011_part_8/BTS2515_2011_pm_1_im_snapshot.ims2');
    expect(ims2Rule.pathList).toContain('MRBTS-2515_MRBTS-2515_SBTS23R2_ENB_9999_230205_000010_20230206-1559.ims2');
    expect(moamLogRule.pathList).toContain('BTS2515_1011_part_6/BTS2515_1011_runtime/runtime_DEFAULT.log');
  });

  it('should open klogg with specific file', async () => {
    const targetPath = '/Users/lukewu/Downloads/Snapshot_MRBTS-2515_MRBTS-2515_SBTS23R2_ENB_9999_230205_000010_20230206-1559/BTS2515_1011_part_6/BTS2515_1011_runtime/runtime_BTSOM.log';
    await zipParser.openFileByRule({ data: { targetPath, defaultEditor: 'klogg' } });
  });
});

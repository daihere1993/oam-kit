import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'node:zlib';
import { pipeline } from 'node:stream';
import { IpcRequest } from '@oam-kit/shared-interfaces';
import * as unzipper from 'unzipper';
import { Rule, ZipParser } from './zip-parser.channel';
import * as os from 'os';

const testZipPath = path.join(
  __dirname,
  'test-resources/Snapshot_MRBTS-2515_MRBTS-2515_SBTS23R2_ENB_9999_230205_000010_20230206-1559.zip'
);

describe('ZipParser', () => {
  const zipParser = new ZipParser();

  it('decompress .xz file', (done) => {
    const src = path.join(__dirname, './test-resources/runtime_DEFAULT.log.xz');
    const dest = path.join(__dirname, './test-resources/runtime_DEFAULT.log');
    const unzip = zlib.createUnzip();
    const input = fs.createReadStream(src);
    const output = fs.createWriteStream(dest);
    pipeline(input, unzip, output, (err) => {
      if (err) {
        console.error(err);
      }
      done();
    });
  });

  it('should get correct files with specific rules', async () => {
    const rules: Rule[] = [
      // ims2
      { name: 'ims2', firstRegex: /.+\.ims2/, secondRegex: null, defaultEditor: '', pathList: [] },
      // moam runtime log
      {
        name: 'moam_runtime.log',
        firstRegex: /.+_1011_runtime\.zip/,
        secondRegex: /runtime_DEFAULT\.log/,
        defaultEditor: '',
        pathList: [],
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

  it('should get correct "snapshot_file_list.txt"', (done) => {
    const zipPath = path.join(
      __dirname,
      'test-resources/Snapshot_MRBTS-2515_MRBTS-2515_SBTS23R2_ENB_9999_230205_000010_20230206-1559.zip'
    );
    fs.createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on('entry', (entry: any) => {
        if (entry.path !== 'snapshot_file_list.txt') {
          console.log(entry.path);
          return entry.autodrain();
        }

        entry.buffer().then((content) => {
          const expectedFileContents = fs.readFileSync(path.join(__dirname, 'test-resources/snapshot_file_list.txt'), 'utf8');
          expect(content.toString()).toBe(expectedFileContents);
          done();
        });
      });
  });

  it('should get correction zip file by the firstRegex', () => {
    let index = -1;
    const content = fs.readFileSync(path.join(__dirname, 'test-resources/snapshot_file_list.txt'), 'utf8');
    const list = content.split(/BTS.*?\.zip:/);
    list.shift();

    for (let i = 0; i < list.length; i++) {
      const iterm = list[i];
      if (/BTS\d*_1011_runtime\.zip/.test(iterm)) {
        index = i;
        break;
      }
    }

    const ret = [...content.matchAll(/(BTS.*?\.zip):/g)][index][1];
    expect(ret).toBe('BTS2515_1011_part_6.zip');
  });
});

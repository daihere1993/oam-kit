import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { Rule } from '@oam-kit/shared-interfaces';
import { ZipParserChannel } from './zip-parser.channel';

const rmFiles = util.promisify(fs.rm);

describe('ZipParser: private method', () => {
  const zipParser = new ZipParserChannel(null);

  describe('_unzipByRules():', () => {
    const src = path.join(__dirname, 'test-resources/snapshot.zip');

    it('should get all ims2 files correctlly', async () => {
      const rules: Rule[] = [{ name: 'ims2', firstRegex: /.+\.ims2/, parsingInfos: { pathList: [] } }];
      // @ts-ignore
      const retRules = await zipParser._unzipByRules(src, rules);

      expect(retRules.length).toBe(1);
      const ims2Rule = retRules[0];

      expect(ims2Rule.parsingInfos.pathList.length).toBe(3);
      expect(ims2Rule.parsingInfos.pathList).toContain('BTS1900_1011_part_9/BTS1900_1011_pm_im_snapshot.ims2');
      expect(ims2Rule.parsingInfos.pathList).toContain('BTS1900_1011_part_9/BTS1900_1011_im_snapshot.ims2');
      expect(ims2Rule.parsingInfos.pathList).toContain(
        'MRBTS-1900_TL SG7 129 AEQC_5G21A_GNB_0011_000800_000282_SMOKE38_20210312-1755.ims2'
      );

      await rmFiles(path.join(__dirname, 'test-resources/snapshot'), { recursive: true, force: true });
    }, 30000);
    it('should get all soap files correctlly', async () => {
      const rules: Rule[] = [{ name: 'soap messages', firstRegex: /.+SOAPMessageTrace.+/, parsingInfos: { pathList: [] } }];
      // @ts-ignore
      const retRules = await zipParser._unzipByRules(src, rules);
      expect(retRules.length).toBe(1);
      const soapRule = retRules[0];

      expect(soapRule.parsingInfos.pathList.length).toBe(2);
      expect(soapRule.parsingInfos.pathList)
        .toContain('BTS1900_1011_part_10/BTS1900_1011_L1183908869_RMOD_L_1_SOAPMessageTrace.xml');
      expect(soapRule.parsingInfos.pathList)
        .toContain('BTS1900_1011_part_10/BTS1900_1011_L1183908869_RMOD_L_1_SOAPMessageTrace_old.xml');

      await rmFiles(path.join(__dirname, 'test-resources/snapshot'), { recursive: true, force: true });
    }, 30000);
    it('should get all moam_runtime(1011).log.xz files correctlly', async () => {
      const rules: Rule[] = [
        {
          name: 'moam_runtime.log',
          firstRegex: /.+_(?:\d{2}11)_runtime\.zip/,
          secondRegex: /runtime_BTSOM\.log/,
          parsingInfos: { pathList: [] },
        },
      ];
      // @ts-ignore
      const retRules = await zipParser._unzipByRules(src, rules);
      expect(retRules.length).toBe(1);
      const moamLogRule = retRules[0];

      expect(moamLogRule.parsingInfos.pathList.length).toBe(1);
      expect(moamLogRule.parsingInfos.pathList)
        .toContain('BTS1900_1011_part_3/BTS1900_1011_runtime/runtime_BTSOM.log.xz');
      
      await rmFiles(path.join(__dirname, 'test-resources/snapshot'), { recursive: true, force: true });
    }, 30000);
    it('should get all moam_runtime(2011).log.xz files correctlly', () => {});
    it('should get all moam_runtime(1011).log files correctlly when file has been decompressed', () => {});
  });
});

import * as fs from 'fs';
import * as path from 'path';
import { ZipParserChannel } from './zip-parser.channel';
import { IpcRequest, Rule } from '@oam-kit/shared-interfaces';

const testZipPath = path.join(__dirname, 'test-resources/snapshot.zip');

describe('ZipParser', () => {
  const zipParser = new ZipParserChannel(null);

  it('should get correct files with specific rules', async () => {
    const rules: Rule[] = [
      // ims2
      { name: 'ims2', firstRegex: /.+\.ims2/, parsingInfos: { pathList: [] } },
      // soap message
      { name: 'soap messages', firstRegex: /.+SOAPMessageTrace.+/, parsingInfos: { pathList: [] } },
      // moam runtime log
      { name: 'moam_runtime.log', firstRegex: /.+_(?:\d{2}11)_runtime\.zip/, secondRegex: /runtime_BTSOM\.log/, parsingInfos: { pathList: [] } },
    ];
    const ipcReq: IpcRequest = { data: { zipPath: testZipPath, rules } };
    const retRules = await zipParser.unzipByRules(ipcReq);
    expect(retRules.length).toBe(3);
    const ims2Rule = retRules[0];
    const soapRule = retRules[1];
    const moamLogRule = retRules[2];

    expect(ims2Rule.parsingInfos.pathList).toContain('BTS1900_1011_part_9/BTS1900_1011_pm_im_snapshot.ims2');
    expect(ims2Rule.parsingInfos.pathList).toContain('BTS1900_1011_part_9/BTS1900_1011_im_snapshot.ims2');
    expect(ims2Rule.parsingInfos.pathList).toContain('MRBTS-1900_TL SG7 129 AEQC_5G21A_GNB_0011_000800_000282_SMOKE38_20210312-1755.ims2');
    expect(soapRule.parsingInfos.pathList).toContain('BTS1900_1011_part_10/BTS1900_1011_L1183908869_RMOD_L_1_SOAPMessageTrace.xml');
    expect(soapRule.parsingInfos.pathList).toContain('BTS1900_1011_part_10/BTS1900_1011_L1183908869_RMOD_L_1_SOAPMessageTrace_old.xml');
    expect(moamLogRule.parsingInfos.pathList).toContain('BTS1900_1011_part_3/BTS1900_1011_runtime/runtime_BTSOM.log');

    fs.rmSync(path.join(__dirname, 'test-resources/snapshot'), { recursive: true, force: true });
  }, 60000);
});

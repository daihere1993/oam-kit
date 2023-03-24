import { APPData } from '@oam-kit/shared-interfaces';

export const DEFAULT_APP_DATA: APPData = {
  preferences: {
    serverList: ['hzlinb35.china.nsn-net.net', 'hzlinb36.china.nsn-net.net', 'wrlinb119.emea.nsn-net.net'],
    profile: {
      svnAccount: { password: '' },
      nsbAccount: { username: '', password: '' },
    },
  },
  syncCode: { projects: [] },
  zipParser: {
    rules: [
      // ims2
      { name: 'ims2', firstRegex: /.+\.ims2/, parsingInfos: { pathList: [] } },
      // OAM runtime log
      { name: 'oam runtime log', firstRegex: /.+BTS(?:\d+)_(?:\d011)_runtime\.zip/, secondRegex: /runtime_BTSOM\.log/, parsingInfos: { pathList: [] } },
      // OAM pm runtime log
      { name: 'oam pm runtime log', firstRegex: /.+BTS(?:\d+)_(?:\d011)_pm_(?:\d+)_syslog\.zip/, secondRegex: /runtime_BTSOM\.log/, parsingInfos: { pathList: [] } },
      // rumag soap messages
      { name: 'rumag side soap messages', firstRegex: /.+SOAPMessageTrace.+/, parsingInfos: { pathList: [] } },
      // radio side soap message
      { name: 'radio side soap messages', firstRegex: /.+_UnitOAM_SOAP_Log\.zip/, secondRegex: /./, parsingInfos: { pathList: [] } }
    ],
  },
};

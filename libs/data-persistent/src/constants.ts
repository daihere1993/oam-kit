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
      // soap messages
      { name: 'soap messages', firstRegex: /.+SOAPMessageTrace.+/, parsingInfos: { pathList: [] } },
      // moam runtime log
      { name: 'moam runtime log', firstRegex: /.+_1011_runtime\.zip/, secondRegex: /runtime_BTSOM\.log/, parsingInfos: { pathList: [] } },
    ],
  },
};

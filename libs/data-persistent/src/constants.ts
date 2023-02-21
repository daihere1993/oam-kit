import { APPData } from '@oam-kit/shared-interfaces';

export const DEFAULT_APP_DATA: APPData = {
  preferences: {
    serverList: [
      'hzlinb35.china.nsn-net.net',
      'hzlinb36.china.nsn-net.net',
      'wrlinb119.emea.nsn-net.net',
    ],
    profile: {
      svnAccount: { password: '' },
      nsbAccount: { username: '', password: '' },
    },
  },
  syncCode: { projects: [] }
}
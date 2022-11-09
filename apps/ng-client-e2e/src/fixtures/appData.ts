import { APPData, AuthInfos, Project, ServerConnectWay } from '@oam-kit/utility/types';

export const projectFixture: Project = {
  name: 'TRUNK',
  serverAddr: 'hzlinb35.china.nsn-net.net',
  localPath: '/moam/trunk',
  remotePath: '/var/fpwork/zowu/moam/trunk'
};
export const authFixture: AuthInfos = {
  nsbAccount: { username: 'nsbusername', password: 'nsbpassword' },
  svnAccount: { password: 'svnpassword' },
};

export const initDataFixture: APPData = {
  syncCode: { projects: [projectFixture] },
  settings: {
    auth: authFixture,
    server: {
      privateKeyPath: '',
      connectWay: ServerConnectWay.ByPrivateKeyPath,
      serverList: ['hzlinb35.china.nsn-net.net', 'hzlinb36.china.nsn-net.net', 'wrlinb119.emea.nsn-net.net'],
    }
  },
};

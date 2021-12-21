import { APPData, Profile, Project, RepositoryType } from '@oam-kit/utility/types';

export const projectFixture: Project = {
  name: 'TRUNK',
  serverAddr: 'hzlinb35.china.nsn-net.net',
  localPath: '/moam/trunk',
  remotePath: '/var/fpwork/zowu/moam/trunk',
  versionControl: RepositoryType.SVN
};
export const profileFixture: Profile = {
  nsbAccount: { username: 'nsbusername', password: 'nsbpassword' },
  svnAccount: { password: 'svnpassword' },
};

export const initDataFixture: APPData = {
  syncCode: { projects: [projectFixture] },
  rbTools: { rbs: [], preferences: { checkLockInfoInterval: 300000 } },
  general: {
    profile: profileFixture,
    serverList: ['hzlinb35.china.nsn-net.net', 'hzlinb36.china.nsn-net.net', 'wrlinb119.emea.nsn-net.net'],
  },
};

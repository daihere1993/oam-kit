import { Profile, Project } from "@oam-kit/utility/types";

export const projectFixture: Project = {
  name: 'TRUNK',
  serverAddr: 'hzlinb35.china.nsn-net.net',
  localPath: '/moam/trunk',
  remotePath: '/var/fpwork/zowu/moam/trunk',
};
export const profileFixture: Profile = {
  nsbAccount: { username: 'test username', password: 'test password' },
  svnAccount: { password: null },
};
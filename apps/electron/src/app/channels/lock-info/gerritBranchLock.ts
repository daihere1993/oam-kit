import { getTempDir } from '@electron/app/utils';
import { Profile } from '@oam-kit/utility/types';
import { join } from 'path';
import * as shell from 'shelljs';
import ConfigParser from 'configparser';

async function initOrUpdateLocalRepo(localRepoPath: string, profile: Profile, repoName: string) {
  const fullRepoUrl = `https://${profile.nsbAccount.username}:${profile.nsbAccount.password}@gerrit.ext.net.nokia.com/gerrit/a/MN/OAM/${repoName}`;
  const scriptsDir = join(__dirname, '..', '..', 'scripts');
  const script = join(scriptsDir, 'git-init-or-update.sh');
  const cmd = ['sh', script, fullRepoUrl, localRepoPath].join(' ');
  return new Promise((resolve, reject) => {
    shell.exec(cmd, (code, stdout, stderr) => {
      if (code === 0) {
        resolve(null);
      } else {
        reject(stderr);
      }
    });
  });
}

function isLocked(localRepoPath: string, branch: string) {
  const configFilePath = join(localRepoPath, 'project.config');
  const configParser = new ConfigParser();
  const section = `access "refs/heads/${branch}"`;
  configParser.read(configFilePath);
  const ret = configParser.get(section, 'submit');

  return ret === 'deny group Registered Users';
}

/**
 * e.g. from "345e97b (HEAD) tool 1342: lock master" to get "lock master"
 */
async function getLockMsg(localRepoPath: string): Promise<string> {
  const cmd = `git log -1 --oneline`;
  return new Promise((resolve, reject) => {
    shell.cd(localRepoPath).exec(cmd, (code, stdout, stderr) => {
      if (code === 0) {
        const ret = /:(.*)/.exec(stdout);
        resolve(ret[1]);
      } else {
        reject(stderr);
      }
    });
  });
}

async function getLockStatus(profile: Profile, branch: string, repoName: string) {
  const localRepoPath = join(getTempDir(), 'cache-gitbranchlock');
  await initOrUpdateLocalRepo(localRepoPath, profile, repoName);
  const locked = isLocked(localRepoPath, branch);
  const lockMsg = locked ? await getLockMsg(localRepoPath) : '';

  return { locked, lockMsg };
}

export default {
//   async getLockInfo(profile: Profile, branch: string, repo: Repo) {
//     const branchLockStatus = await getLockStatus(profile, branch, 'template');
//     const repoLockStatus = await getLockStatus(profile, branch, repo.name);
//   },
  getLockStatus,
};

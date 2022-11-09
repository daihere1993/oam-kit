import { LockInfo, AuthInfos, Repo } from '@oam-kit/utility/types';
import * as config from '@oam-kit/utility/overall-config';
import * as fetcher from '@electron/app/utils/fetcher';
import * as branchLockParser from '@electron/app/utils/branchLockParser';

const moduleConf = config.modules.lockInfo;

async function getBranchLockInfo(auth: AuthInfos, branch: string) {
  const json = await getJsonBranchLockJson(auth);
  const lockedBranches = JSON.parse(json);
  const lockedBranch = lockedBranches[branch];
  if (!lockedBranch) {
    throw new Error(`can not find lock info for: ${branch}`);
  }
  return {
    name: branch,
    locked: lockedBranch['locked_by_BC'] || false,
    reason: lockedBranch['BC_MSG'] || '',
  };
}

function getJsonBranchLockJson(auth: AuthInfos) {
  const jsonPath = `${config.svnroot}/${moduleConf.oam_repository}/conf/BranchFor.json`;
  const nsbAccount = auth.nsbAccount;
  const svnAccount = auth.svnAccount;
  try {
    return fetcher.svnCat(jsonPath, { username: nsbAccount.username, password: svnAccount.password });
  } catch (error) {
    if (!this.isCustomError(error)) {
      throw new Error(`[oam-kit][getJsonBranchLockJson] ${error.message}`);
    } else {
      throw error;
    }
  }
}

async function getRepoLockInfo(auth: AuthInfos, branch: string, repo: Repo) {
  const svnPath = `${config.svnroot}/${repo.repository}/LOCKS/locks.conf`;
  const nsbAccount = auth.nsbAccount;
  const svnAccount = auth.svnAccount;
  const locksContent = await fetcher.svnCat(svnPath, {
    username: nsbAccount.username,
    password: svnAccount.password,
  });
  return {
    name: repo.name,
    repository: repo.repository,
    locked: branchLockParser.isLocked(locksContent, branch) || false,
    reason: branchLockParser.getLockReason(locksContent, branch) || '',
  };
}

export default {
  async getLockInfo(auth: AuthInfos, branch: string, repo: Repo): Promise<LockInfo> {
    const branchLockInfo = await getBranchLockInfo(auth, branch);
    const repoLockInfo = await getRepoLockInfo(auth, branch, repo);

    return {
      repo: repoLockInfo,
      branch: branchLockInfo,
    };
  },
};

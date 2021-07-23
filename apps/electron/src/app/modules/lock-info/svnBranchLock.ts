import { LockInfo, Profile, Repo } from '@oam-kit/utility/types';
import * as config from '@oam-kit/utility/overall-config';
import * as fetcher from '@electron/app/utils/fetcher';
import * as branchLockParser from '@electron/app/utils/branchLockParser';

const moduleConf = config.modules.lockInfo;

async function getBranchLockInfo(profile: Profile, branch: string) {
  const json = await getJsonBranchLockJson(profile);
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

function getJsonBranchLockJson(profile: Profile) {
  const jsonPath = `${config.svnroot}/${moduleConf.oam_repository}/conf/BranchFor.json`;
  const nsbAccount = profile.nsbAccount;
  const svnAccount = profile.svnAccount;
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

async function getRepoLockInfo(profile: Profile, branch: string, repo: Repo) {
  const svnPath = `${config.svnroot}/${repo.repository}/LOCKS/locks.conf`;
  const nsbAccount = profile.nsbAccount;
  const svnAccount = profile.svnAccount;
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
  async getLockInfo(profile: Profile, branch: string, repo: Repo): Promise<LockInfo> {
    const branchLockInfo = await getBranchLockInfo(profile, branch);
    const repoLockInfo = await getRepoLockInfo(profile, branch, repo);

    return {
      repo: repoLockInfo,
      branch: branchLockInfo,
    };
  },
};

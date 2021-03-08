import { IpcChannelInterface } from '@electron/app/interfaces';
import { Model, Store, modelConfig } from '@oam-kit/store';
import * as config from '@oam-kit/utility/overall-config';
import { Branch, Profile, Repo } from '@oam-kit/store/types';
import * as branchLockParser from '@electron/app/utils/branchLockParser';
import * as fetcher from '@electron/app/utils/fetcher';

export const visibleRepos: Repo[] = [
  { name: 'moam', repository: 'BTS_SC_MOAM_LTE', locked: false, reason: '' },
  { name: 'has', repository: 'BTS_SC_HAS_OAM', locked: false, reason: '' },
];
export const visibleBranches: Branch[] = [
  { name: 'trunk' },
  { name: '5G21A' },
  { name: 'SBTS20C' },
];
export const defaultBranchesToDisplay: Branch[] = [
  { id: 1, name: 'trunk', lock: { locked: false, repos: visibleRepos } },
  { id: 2, name: '5G21A', lock: { locked: false, repos: visibleRepos } },
];

const moduleConf = config.modules.lockInfo;

export class LockInfoChannel implements IpcChannelInterface {
  handlers = [];

  private store: Store;
  private branchModel: Model<Branch>;
  private branchesToDisplay: Branch[] = defaultBranchesToDisplay;

  constructor(store: Store) {
    this.store = store;
    this.branchModel = this.store.get<Branch>(modelConfig.lockInfoBranch.name);
    this.branchesToDisplay = this.branchModel.data as Branch[];
    this.refreshLockInfo();
    setInterval(this.refreshLockInfo.bind(this), moduleConf.interval);
  }

  // There are two kinds of lock info: the whole branch and specific repositories
  // Note: If branch is locked, it must be BC
  // and if repository is locked, it would be automatically locked by jenkins
  private refreshLockInfo() {
    this.refreshAllBranchLockInfo();
    this.refreshAllRepoLockInfo();
  }

  private async refreshAllBranchLockInfo() {
    const json = await this.getJsonBranchLockJson();
    const operations = [];
    const lockBranches = JSON.parse(json);
    for (const branch of this.branchesToDisplay) {
      const lockedBranch = lockBranches[branch.name];
      branch.lock.locked = lockedBranch['locked_by_BC'];
      branch.lock.reason = lockedBranch['BC_MSG'];
      operations.push(branch.id ? this.branchModel.edit$(branch) : this.branchModel.create$(branch));
    }
    await Promise.all(operations);
    console.log('refreshAllBranchLockInfo done');
  }

  private getJsonBranchLockJson() {
    const jsonPath = `${config.svnroot}/${moduleConf.oam_repository}/conf/BranchFor.json`;
    const profile = this.store.get<Profile>(modelConfig.profile.name).data as Profile;
    return fetcher.svnCat(jsonPath, { username: profile.username, password: profile.password });
  }
  private async refreshAllRepoLockInfo() {
    const operations = [];
    for (const branch of this.branchesToDisplay) {
      for (const repo of branch.lock.repos) {
        const svnPath = `${config.svnroot}/${repo.repository}/LOCKS/locks.conf`;
        const profile = this.store.get<Profile>(modelConfig.profile.name).data as Profile;
        const locksContent = await fetcher.svnCat(svnPath, {
          username: profile.username,
          password: profile.password,
        });
        const locked = branchLockParser.isLocked(locksContent, branch.name);
        const currentRepo = branch.lock.repos.find((r) => r.repository === repo.repository);
        if (locked) {
          currentRepo.locked = locked;
          currentRepo.reason = branchLockParser.getLockReason(locksContent, branch.name);
        }
      }
      operations.push(branch.id ? this.branchModel.edit$(branch) : this.branchModel.create$(branch));
    }
    await Promise.all(operations);
    console.log('refreshAllRepoLockInfo done');
  }
}

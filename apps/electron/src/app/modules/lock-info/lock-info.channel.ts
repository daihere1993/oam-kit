import { IpcChannelInterface } from '@electron/app/interfaces';
import { Model, Store, modelConfig } from '@oam-kit/store';
import * as config from '@oam-kit/utility/overall-config';
import { APPData, Branch, Profile, Repo } from '@oam-kit/store/types';
import * as branchLockParser from '@electron/app/utils/branchLockParser';
import * as fetcher from '@electron/app/utils/fetcher';
import { BrowserWindow } from 'electron';
import { IpcChannel, IPCResponse } from '@oam-kit/ipc';

export const visibleRepos: Repo[] = [
  { name: 'moam', repository: 'BTS_SC_MOAM_LTE' },
  { name: 'has', repository: 'BTS_SC_HAS_OAM' },
];
export const visibleBranches: Branch[] = [{ name: 'trunk' }, { name: '5G21A' }, { name: 'SBTS20C' }];
export const defaultBranchesToDisplay: Branch[] = [
  { id: 1, name: 'trunk', lock: { locked: false, repos: visibleRepos } },
  { id: 2, name: '5G21A', lock: { locked: false, repos: visibleRepos } },
];

const moduleConf = config.modules.lockInfo;

export class LockInfoChannel implements IpcChannelInterface {
  handlers = [];

  private win: BrowserWindow;
  private store: Store;
  private branchModel: Model<Branch>;
  private branchesToDisplay: Branch[] = defaultBranchesToDisplay;

  constructor(store: Store, win: BrowserWindow) {
    this.win = win;
    this.store = store;
    this.branchModel = this.store.get<Branch>(modelConfig.lockInfoBranch.name);
    this.branchesToDisplay = this.branchModel.data as Branch[];
    this.refreshLockInfo();
    setInterval(this.refreshLockInfo.bind(this), moduleConf.interval);
    this.branchModel.onChange$.subscribe((branches) => {
      if (this.hasCreatedNewRepo(branches as Branch[])) {
        this.refreshLockInfo();
      } 
    });
  }

  private hasCreatedNewRepo(branches: Branch[]): boolean {
    for (const branch of branches) {
      const repos = branch.lock?.repos;
      for (const repo of repos) {
        if (!Object.prototype.hasOwnProperty.apply(repo, 'locked')) {
          return true;
        }
      }
    }
    return false;
  }

  // There are two kinds of lock info: the whole branch and specific repositories
  // Note: If branch is locked, it must be BC
  // and if repository is locked, it would be automatically locked by jenkins
  private refreshLockInfo() {
    Promise.all([this.refreshAllBranchLockInfo(), this.refreshAllRepoLockInfo()]).then(() => {
      const res: IPCResponse<APPData> = { isSuccessed: true, data: this.store.getAllData() };
      this.win.webContents.send(IpcChannel.GET_APP_DATA_RES, res);
    });
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
        currentRepo.locked = locked;
        if (locked) {
          currentRepo.reason = branchLockParser.getLockReason(locksContent, branch.name);
        }
      }
      operations.push(branch.id ? this.branchModel.edit$(branch) : this.branchModel.create$(branch));
    }
    await Promise.all(operations);
    console.log('refreshAllRepoLockInfo done');
  }
}

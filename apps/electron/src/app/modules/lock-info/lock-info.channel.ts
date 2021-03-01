import { IpcChannelInterface } from '@electron/app/interfaces';
import { IPCRequest, IPCResponse } from '@oam-kit/ipc';
import { Model, Store, modelConfig } from '@oam-kit/store';
import { IpcMainEvent } from 'electron';
import { modules } from '@electron/app/constants/config';
import { Branch, Profile, Repo } from '@oam-kit/store/types';
import * as branchLockParser from '@electron/app/utils/branchLockParser';
import * as fetcher from '@electron/app/utils/fetcher';

const defaultRepos: Repo[] = [
  { name: 'moam', repository: 'BTS_SC_MOAM_LTE', locked: false, reason: '' },
  { name: 'has', repository: 'BTS_SC_HAS_OAM', locked: false, reason: '' },
];
export const defaultBranchesToDisplay: Branch[] = [
  { name: 'trunk', lock: { locked: false, repos: defaultRepos } },
  { name: '5G21A', lock: { locked: false, repos: defaultRepos } },
];

const config = modules.lockInfo;
const svnroot = 'https://svne1.access.nsn.com/isource/svnroot';

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
    setInterval(this.refreshLockInfo.bind(this), 30000);
  }

  private getAllBranches(event: IpcMainEvent, request: IPCRequest<void>) {
    const res: IPCResponse<Branch[]> = { data: this.branchModel.data as Branch[] };
    event.reply(request.responseChannel, res);
  }

  private getBranchLockInfo(event: IpcMainEvent, request: IPCRequest<{ branchId: number }>) {
    const res: IPCResponse<Branch> = { data: this.branchModel.find(request.data.branchId) };
    event.reply(request.responseChannel, res);
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
    const jsonPath = `${config.svnroot}/${config.oam_repository}/conf/BranchFor.json`;
    const profile = this.store.get<Profile>(modelConfig.profile.name).data as Profile;
    return fetcher.svnCat(jsonPath, { username: profile.username, password: profile.password });
  }
  private async refreshAllRepoLockInfo() {
    const operations = [];
    for (const branch of this.branchesToDisplay) {
      for (const repo of branch.lock.repos) {
        const svnPath = `${svnroot}/${repo.repository}/LOCKS/locks.conf`;
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

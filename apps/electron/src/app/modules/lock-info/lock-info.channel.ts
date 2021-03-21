import { IpcChannelInterface } from '@electron/app/interfaces';
import { Store, modelConfig } from '@oam-kit/store';
import * as config from '@oam-kit/utility/overall-config';
import { BranchLockInfo, LockInfo, Profile, Repo, RepoLockInfo } from '@oam-kit/store/types';
import * as branchLockParser from '@electron/app/utils/branchLockParser';
import * as fetcher from '@electron/app/utils/fetcher';
import { IpcChannel, IPCRequest, IPCResponse } from '@oam-kit/ipc';
import { IpcMainEvent } from 'electron/main';

// export const visibleRepos: Repo[] = [
//   { name: 'moam', repository: 'BTS_SC_MOAM_LTE' },
//   { name: 'has', repository: 'BTS_SC_HAS_OAM' },
// ];
// export const visibleBranches: Branch[] = [{ name: 'trunk' }, { name: '5G21A' }, { name: 'SBTS20C' }];
// export const defaultBranchesToDisplay: Branch[] = [
//   { id: 1, name: 'trunk', lock: { locked: false, repos: cloneDeep(visibleRepos) } },
//   { id: 2, name: '5G21A', lock: { locked: false, repos: cloneDeep(visibleRepos) } },
// ];

const moduleConf = config.modules.lockInfo;

export class LockInfoChannel implements IpcChannelInterface {
  handlers = [{ name: IpcChannel.GET_LOCK_INFO_REQ, fn: this.getLockInfo }];

  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  public getLockInfo(event: IpcMainEvent, req: IPCRequest<{ branch: string; repo: Repo }>) {
    const { branch, repo } = req.data;
    Promise.all([this.getBranchLockInfo(branch), this.getRepoLockInfo(branch, repo)]).then((data) => {
      const [branchLockInfo, repoLockInfo] = data;
      const lockInfo: LockInfo = {
        repo: repoLockInfo,
        branch: branchLockInfo,
      };
      const res: IPCResponse<LockInfo> = { isSuccessed: true, data: lockInfo };
      event.reply(req.responseChannel, res);
    });
  }

  private async getBranchLockInfo(branch: string): Promise<BranchLockInfo> {
    const json = await this.getJsonBranchLockJson();
    const lockedBranches = JSON.parse(json);
    const lockedBranch = lockedBranches[branch];
    return {
      name: branch,
      locked: lockedBranch['locked_by_BC'] || false,
      reason: lockedBranch['BC_MSG'] || '',
    };
  }

  private async getRepoLockInfo(branch: string, repo: Repo): Promise<RepoLockInfo> {
    const svnPath = `${config.svnroot}/${repo.repository}/LOCKS/locks.conf`;
    const profile = this.store.get<Profile>(modelConfig.profile.name).data as Profile;
    const locksContent = await fetcher.svnCat(svnPath, {
      username: profile.username,
      password: profile.password,
    });
    return {
      name: repo.name,
      repository: repo.repository,
      locked: branchLockParser.isLocked(locksContent, branch) || false,
      reason: branchLockParser.getLockReason(locksContent, branch) || '',
    };
  }

  private getJsonBranchLockJson() {
    const jsonPath = `${config.svnroot}/${moduleConf.oam_repository}/conf/BranchFor.json`;
    const profile = this.store.get<Profile>(modelConfig.profile.name).data as Profile;
    return fetcher.svnCat(jsonPath, { username: profile.username, password: profile.password });
  }
}

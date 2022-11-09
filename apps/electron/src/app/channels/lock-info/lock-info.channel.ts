import * as config from '@oam-kit/utility/overall-config';
import * as branchLockParser from '@electron/app/utils/branchLockParser';
import * as fetcher from '@electron/app/utils/fetcher';
import { SettingsModel, Repo, ReviewBoard, LockInfo, BranchLockInfo, RepoLockInfo, IpcResErrorType, MODEL_NAME } from '@oam-kit/utility/types';
import { IpcChannel, IpcRequest } from '@oam-kit/utility/types';
import { IpcService } from '@electron/app/utils/ipcService';
import { IpcChannelBase } from '../ipcChannelBase';

const moduleConf = config.modules.lockInfo;

function isCustomError(error: Error) {
  return error.message.includes('[oam-kit]');
}

export default class LockInfoChannel extends IpcChannelBase {
  logName = 'LockInfoChannel';
  handlers = [{ name: IpcChannel.GET_LOCK_INFO, fn: this.getLockInfo }];

  /**
   * Get lock info by rb link.
   * @param event
   * @param req
   */
  public async getLockInfo(ipcService: IpcService, req: IpcRequest<Partial<ReviewBoard>>) {
    this.logger.info('[getLockInfo] start');
    try {
      const partialRb = req.data;
      const branchLockInfo = await this.getBranchLockInfo(partialRb.branch);
      const repoLockInfo = await this.getRepoLockInfo(partialRb.branch, partialRb.repo);
      const lockInfo: LockInfo = {
        repo: repoLockInfo,
        branch: branchLockInfo,
      };
      this.logger.info('[getLockInfo] success');
      ipcService.replyOkWithData<LockInfo>(lockInfo);
    } catch (error) {
      ipcService.replyNokWithNoData(error.message, IpcResErrorType.Expected);
    }
  }

  private async getBranchLockInfo(branch: string): Promise<BranchLockInfo> {
    const json = await this.getJsonBranchLockJson();
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

  private async getRepoLockInfo(branch: string, repo: Repo): Promise<RepoLockInfo> {
    const svnPath = `${config.svnroot}/${repo.repository}/LOCKS/locks.conf`;
    const settingsModel = this.store.get<SettingsModel>(MODEL_NAME.SETTINGS);
    const nsbAccount = settingsModel.get('auth').nsbAccount;
    const svnAccount = settingsModel.get('auth').svnAccount;
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

  private getJsonBranchLockJson() {
    const jsonPath = `${config.svnroot}/${moduleConf.oam_repository}/conf/BranchFor.json`;
    const settingsModel = this.store.get<SettingsModel>(MODEL_NAME.SETTINGS);
    const nsbAccount = settingsModel.get('auth').nsbAccount;
    const svnAccount = settingsModel.get('auth').svnAccount;
    try {
      return fetcher.svnCat(jsonPath, { username: nsbAccount.username, password: svnAccount.password });
    } catch (error) {
      if (!isCustomError(error)) {
        throw new Error(`[oam-kit][getJsonBranchLockJson] ${error.message}`);
      } else {
        throw error;
      }
    }
  }
}

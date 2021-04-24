import { GeneralModel, Repo, ReviewBoard, LockInfo, BranchLockInfo, RepoLockInfo } from '@oam-kit/utility/types';
import { IpcChannelInterface } from '@electron/app/interfaces';
import { Store } from '@electron/app/store';
import * as config from '@oam-kit/utility/overall-config';
import * as branchLockParser from '@electron/app/utils/branchLockParser';
import * as fetcher from '@electron/app/utils/fetcher';
import Logger from '@electron/app/utils/logger';
import { IpcChannel, IPCRequest, IPCResponse } from '@oam-kit/utility/types';
import { IpcMainEvent } from 'electron/main';
import { RbBase_ } from '../rb';

const logger = Logger.for('LockInfoChannel');
const moduleConf = config.modules.lockInfo;

export class LockInfoChannel extends RbBase_ implements IpcChannelInterface {
  handlers = [{ name: IpcChannel.GET_LOCK_INFO_REQ, fn: this.getLockInfo }];

  constructor(private store: Store) {
    super();
    this.store = store;
  }

  /**
   * Get lock info by rb link.
   * @param event
   * @param req
   */
  public async getLockInfo(event: IpcMainEvent, req: IPCRequest<Partial<ReviewBoard>>) {
    logger.info('[getLockInfo] start');
    const res: IPCResponse<LockInfo> = {};
    try {
      const partialRb = req.data;
      const branchLockInfo = await this.getBranchLockInfo(partialRb.branch);
      const repoLockInfo = await this.getRepoLockInfo(partialRb.branch, partialRb.repo);
      const lockInfo: LockInfo = {
        repo: repoLockInfo,
        branch: branchLockInfo,
      };
      res.data = lockInfo;
      res.isSuccessed = true;
      logger.info('[getLockInfo] success');
    } catch (error) {
      res.isSuccessed = false;
      res.error = { name: 'getLockInfo', message: error.message };
      logger.error('[getLockInfo] failed: %s', error);
    } finally {
      event.reply(req.responseChannel, res);
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
    const gModel = this.store.get<GeneralModel>(config.MODEL_NAME.GENERAL);
    const nsbAccount = gModel.get('profile').nsbAccount;
    const svnAccount = gModel.get('profile').svnAccount;
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
    const gModel = this.store.get<GeneralModel>(config.MODEL_NAME.GENERAL);
    const nsbAccount = gModel.get('profile').nsbAccount;
    const svnAccount = gModel.get('profile').svnAccount;
    try {
      return fetcher.svnCat(jsonPath, { username: nsbAccount.username, password: svnAccount.password });
    } catch(error) {
      if (!this.isCustomError(error)) {
        throw new Error(`[oam-kit][getJsonBranchLockJson] ${error.message}`);
      } else {
        throw error;
      }
    }
  }
}

import { Injectable } from '@angular/core';
import { RbItem } from '@ng-client/pages/auto-commit/auto-commit.component';
import { IpcChannel, IPCRequest } from '@oam-kit/ipc';
import { LOG_PHASE, LOG_TYPE } from '@oam-kit/logger';
import { ReviewBoard } from '@oam-kit/store';
import { IpcService } from './ipc.service';

@Injectable({ providedIn: 'root' })
export class RbService {
  constructor(private ipcService: IpcService) {}

  public async svnCommit(rb: RbItem) {
    rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.SVN_COMMIT__START);
    const req: IPCRequest<string> = { data: rb.link, responseChannel: IpcChannel.SVN_COMMIT_RES };
    const { isSuccessed, data, error } = await this.ipcService.send<string, string>(IpcChannel.SVN_COMMIT_REQ, req);
    if (isSuccessed) {
      const revision = data;
      rb.merge({ revision, committedDate: new Date() });
      rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.SVN_COMMIT__COMMITTED, { repo: rb.repo.name, revision });
    } else {
      rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.EXCEPTION, { name: error.name, message: error.message });
    }
    return { isSuccessed };
  }

  public async completeRbInfo(rb: RbItem) {
    if (!this.isValidRbLink(rb.link)) {
      rb.logger.insert(LOG_PHASE.RB_ATTACH, LOG_TYPE.RB_ATTACH__INVALID_LINK);
      return { isSuccessed: false };
    } else {
      const req: IPCRequest<string> = { data: rb.link, responseChannel: IpcChannel.GET_PARTIAL_RB_RES };
      const { isSuccessed, data, error } = await this.ipcService.send<string, Partial<ReviewBoard>>(
        IpcChannel.GET_PARTIAL_RB_REQ,
        req
      );
      if (isSuccessed) {
        rb.merge(data);
        rb.logger.insert(LOG_PHASE.RB_ATTACH, LOG_TYPE.RB_ATTACH__OK);
      } else {
        rb.logger.insert(LOG_PHASE.RB_ATTACH, LOG_TYPE.EXCEPTION, { name: error.name, message: error.message });
      }
      return { isSuccessed };
    }
  }

  public async isRbReady(rb: RbItem) {
    rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.RB_IS_READY__START, { link: rb.link });
    const req: IPCRequest<string> = { data: rb.link, responseChannel: IpcChannel.IS_RB_READY_RES };
    const { isSuccessed, error } = await this.ipcService.send<string, boolean>(IpcChannel.IS_RB_READY_REQ, req);
    if (isSuccessed) {
      rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.RB_IS_READY__READY);
      return true;
    } else {
      rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.RB_IS_READY__NOT_READY, { message: error.message });
      return false;
    }
  }

  private isValidRbLink(link: string) {
    return !!link.match(/http:\/\/biedronka.emea.nsn-net.net\/r\/(\d+)/);
  }
}

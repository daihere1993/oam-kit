import { Injectable } from '@angular/core';
import { RbItem } from '@ng-client/pages/auto-commit/auto-commit.component';
import { IpcChannel, IPCRequest } from '@oam-kit/ipc';
import { ReviewBoard } from '@oam-kit/store';
import { IpcService } from './ipc.service';

@Injectable({ providedIn: 'root' })
export class RbService {
  constructor(private ipcService: IpcService) {}

  public async svnCommit(rb: RbItem) {
    const req: IPCRequest<string> = { data: rb.link, responseChannel: IpcChannel.SVN_COMMIT_RES };
    const { isSuccessed, data, error } = await this.ipcService.send<string, string>(IpcChannel.SVN_COMMIT_REQ, req);
    if (isSuccessed) {
      rb.logger.insert('SVN_Commit', `Commit code successfully, revision: ${rb.repo.name}@${data}`);
    } else {
      rb.logger.insert('SVN_Commit', `Failed, row response: ${error.message}`);
    }
  }

  public async getPartialRb(rb: RbItem) {
    const req: IPCRequest<string> = { data: rb.link, responseChannel: IpcChannel.GET_PARTIAL_RB_RES };
    const { isSuccessed, data } = await this.ipcService.send<string, Partial<ReviewBoard>>(
      IpcChannel.GET_PARTIAL_RB_REQ,
      req
    );
    if (isSuccessed) {
      return data;
    } else {
      // rb.logger.insert('RB_Attach', `Failed, row response: ${error.message}`);
    }
  }

  public async isRbReady(rb: RbItem) {
    const failedMessage =
      'Seems RB is not ready, please check if all of the mandatory RB requirements has been done.  Raw response: ';
    const req: IPCRequest<string> = { data: rb.link, responseChannel: IpcChannel.IS_RB_READY_RES };
    const { isSuccessed, error } = await this.ipcService.send<string, boolean>(IpcChannel.IS_RB_READY_REQ, req);
    if (isSuccessed) {
      rb.logger.insert('IS_RB_READY', 'Ready!!!');
      return true;
    } else {
      rb.logger.insert('IS_RB_READY', failedMessage + error.message);
      return false;
    }
  }
}

import { Injectable } from '@angular/core';
import { RbItem } from '@ng-client/pages/auto-commit/auto-commit.component';
import { IpcChannel, IPCRequest } from '@oam-kit/ipc';
import { LOG_PHASE, LOG_TYPE } from '@oam-kit/logger';
import { LockInfo, ReviewBoard } from '@oam-kit/store';
import { from, of, Subject, timer } from 'rxjs';
import { mergeMap, takeUntil } from 'rxjs/operators';
import { IpcService } from './ipc.service';
@Injectable({ providedIn: 'root' })
export class LockInfoService {
  constructor(private ipcService: IpcService) {}

  /**
   * To listen specific branch unlock info.
   * @param link rb link
   * @returns return a EeventEmitter, emit when target branch unlock.
   */
  public getUnlockListener(rb: RbItem) {
    const onBranchUnlocked = new Subject<void>();
    const onThrowError = new Subject<Error>();
    const cancelInterval = new Subject<boolean>();
    rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.BRANCH_CHECK__START);
    timer(0, 300000).pipe(
      mergeMap(() => from(this.getPartialLockInfo(rb))),
      mergeMap((partialLockInfo) => {
        if (partialLockInfo.isLocked) {
          rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.BRANCH_CHECK__LOCKED, {
            branch: rb.branch,
            reason: partialLockInfo.reason,
          });
        } else {
          rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.BRANCH_CHECK__UNLOCKED, { branch: rb.branch });
          onBranchUnlocked.next();
          cancelInterval.next(true);
          cancelInterval.complete();
        }
        return of();
      }),
      takeUntil(cancelInterval)
    ).subscribe(
      () => {},
      (e) => { onThrowError.next(e) }
    );
    return { onBranchUnlocked, onThrowError };
  }

  private async getPartialLockInfo(rb: RbItem) {
    const req: IPCRequest<Partial<ReviewBoard>> = {
      data: rb.data,
      responseChannel: IpcChannel.GET_LOCK_INFO_RES,
    };
    const { isSuccessed, data, error } = await this.ipcService.send<Partial<ReviewBoard>, LockInfo>(
      IpcChannel.GET_LOCK_INFO_REQ,
      req
    );
    if (isSuccessed) {
      const lockInfo = data;
      const isLocked = lockInfo.branch.locked || lockInfo.repo.locked;
      const reason = lockInfo.branch.locked ? lockInfo.branch.reason : lockInfo.repo.reason;
      return { isLocked, reason };
    } else {
      rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.EXCEPTION, { message: error.message });
      throw new Error();
    }
  }
}

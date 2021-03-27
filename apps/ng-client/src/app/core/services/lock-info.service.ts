import { Injectable } from '@angular/core';
import { RbItem } from '@ng-client/pages/auto-commit/auto-commit.component';
import { IpcChannel, IPCRequest } from '@oam-kit/ipc';
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
  public getUnlockListener(rb: RbItem): Subject<void> {
    const onBranchUnlocked = new Subject<void>();
    const cancelInterval = new Subject<boolean>();
    timer(0, 300000)
      .pipe(
        mergeMap(() => from(this.getPartialLockInfo(rb))),
        mergeMap((partialLockInfo) => {
          if (partialLockInfo.isLocked) {
            rb.logger.insert('Branch_Lock_Info', `Locked, ${partialLockInfo.reason}. Keep listening...`);
          } else {
            rb.logger.insert('Branch_Lock_Info', `Unlocked, then try to commit code.`);
            onBranchUnlocked.next();
            cancelInterval.next(true);
            cancelInterval.complete();
          }
          return of();
        }),
        takeUntil(cancelInterval)
      )
      .subscribe(
        () => {},
        (error) => {
          rb.logger.insert('Branch_Lock_Info', `Failed, row response: ${error.message}`);
        }
      );
    return onBranchUnlocked;
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
      throw new Error(error.message);
    }
  }
}

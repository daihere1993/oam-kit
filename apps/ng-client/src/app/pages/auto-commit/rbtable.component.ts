import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { LockInfoService } from '@ng-client/core/services/lock-info.service';
import { RbService } from '@ng-client/core/services/rb.service';
import { IpcChannel, IPCRequest } from '@oam-kit/utility/types';
import { LOG_PHASE, LOG_TYPE } from '@oam-kit/logger';
import { RbItem } from './auto-commit.component';

@Component({
  selector: 'app-rbtable',
  template: `
    <style>
    </style>
    <nz-table #editRowTable nzBordered nzSize="small" nzFrontPagination="false" [nzData]="rbList">
      <thead>
        <tr>
          <th nzWidth="30%">Name</th>
          <th>RB Link</th>
          <th>Branch</th>
          <th>Repository</th>
          <th>Revision</th>
          <th>Committed Date</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr #tableRow *ngFor="let data of editRowTable.data; let i = index; trackBy: trackByFn" class="editable-row">
          <td>{{ data.name }}</td>
          <td>
            <a (click)="openUrl($event, data.link)" [href]="">{{ data.link }}</a>
          </td>
          <td>{{ data.branch.toUpperCase() }}</td>
          <td>{{ data.repo.name }}({{ data.repo.repository }})</td>
          <td data-test="rbcell-revision" class="rb-table__cell--revision">{{ data.revision }}</td>
          <td data-test="rbcell-committed-data" class="rb-table__cell--committed-date">
            {{ data.committedDate | date: 'yyyy-MM-dd HH:mm:ss' }}
          </td>
          <td class="rb-table__cell--actions">
            <ng-container *ngIf="data.isCommitting; then rbSpin; else rbActions"></ng-container>
            <ng-template #rbSpin>
              <a data-test="rbcell-button__loading" nz-button nzType="link" nzLoading></a>
              <a data-test="rbcell-button__cancel" nz-button data-btn-type="cancel" nzType="link" (click)="cancel(data)">Cancel</a>
            </ng-template>
            <ng-template #rbActions>
              <a data-test="rbcell-button__commit" nz-button data-btn-type="commit" nzType="link" (click)="commit(data)">Commit</a>
              <a
                data-test="rbcell-button__delete"
                nz-button
                nzType="link"
                nz-popconfirm
                nzPopconfirmTitle="Sure to delete?"
                (nzOnConfirm)="rowDelete.next(i)"
              >
                Delete
              </a>
            </ng-template>
          </td>
        </tr>
      </tbody>
    </nz-table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RbTableComponent {
  @Input() rbList: RbItem[];
  @Output() rowDelete = new EventEmitter();

  constructor(
    private rbService: RbService,
    private lockInfoService: LockInfoService,
    private cdr: ChangeDetectorRef,
    private ipcService: IpcService
  ) {}

  async commit(rb: RbItem) {
    rb.isCommitting = true;
    if (await this.rbService.isRbReady(rb)) {
      const { onBranchUnlocked, onThrowError } = this.lockInfoService.getUnlockListener(rb);
      onBranchUnlocked.subscribe(async () => {
        await this.rbService.svnCommit(rb);
        rb.isCommitting = false;
        this.cdr.detectChanges();
      });
      onThrowError.subscribe(() => {
        rb.isCommitting = false;
        this.cdr.detectChanges();
      });
    } else {
      rb.isCommitting = false;
      this.cdr.detectChanges();
    }
  }

  cancel(rb: RbItem) {
    rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.COMMIT__CANCEL);
    rb.isCommitting = false;
    this.cdr.detectChanges();
  }

  openUrl(event: MouseEvent, url: string) {
    const req: IPCRequest<string> = { data: url, responseChannel: IpcChannel.OPEN_EXTERNAL_URL_RES };
    this.ipcService.send(IpcChannel.OPEN_EXTERNAL_URL_REQ, req);
    event.preventDefault();
    event.stopPropagation();
  }

  trackByFn(index: number, rb: RbItem) {
    return rb.link;
  }
}

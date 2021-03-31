import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RbService } from '@ng-client/core/services/rb.service';
import { LockInfoService } from '@ng-client/core/services/lock-info.service';
import { formatDate } from '@angular/common';
import { Repo, ReviewBoard } from '@oam-kit/store';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { IpcChannel, IPCRequest } from '@oam-kit/ipc';
import { LOG_PHASE, LOG_TEMPLATES, LOG_TYPE } from '@oam-kit/logger';
import { getStringFromTemplate } from '@oam-kit/utility/utils';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-auto-commit',
  template: `
    <style>
      nz-table {
        overflow: auto;
      }
      .rb-form-container {
        display: flex;
      }
      .action-bar__container {
        margin-bottom: 10px;
      }
      .rb-form__input {
        width: 300px;
      }
      .logs-wrapper {
        margin-top: 20px;
      }
      .logs-container {
        height: 230px;
        padding: 10px;
        background: #f0f2f5;
        overflow-y: scroll;
      }
      .editable-cell {
        position: relative;
        padding: 5px 12px;
        cursor: pointer;
      }
      td > input {
        display: none;
      }
      .rb-table__cell--actions {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
    </style>
    <div class="rb-form-wrapper">
      <h2>RB Table</h2>
      <div class="action-bar__container">
        <input #attachedLink class="rb-form__input" nz-input placeholder="RB link" />
        <button
          nz-button
          nzType="primary"
          data-btn-type="attach"
          [nzLoading]="isAttachingRb"
          (click)="attachRb(attachedLink.value)"
        >
          {{ isAttachingRb ? 'Attaching...' : 'Attach' }}
        </button>
      </div>
      <nz-table #editRowTable nzBordered nzFrontPagination="false" [nzData]="rbList">
        <thead>
          <tr>
            <th>Name</th>
            <th nzWidth="30%">RB Link</th>
            <th>Branch</th>
            <th>Repository</th>
            <th>Revision</th>
            <th>Committed Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr #tableRow *ngFor="let data of editRowTable.data; let i = index; trackBy: trackByFn" class="editable-row">
            <td>
              <div #nameDiv class="editable-cell" (click)="startEdit(nameDiv, nameInput)">
                {{ data.name }}
              </div>
              <input #nameInput type="text" nz-input [(ngModel)]="data.name" (blur)="stopEdit(nameDiv, nameInput)" />
            </td>
            <td>
              <a (click)="openUrl($event, data.link)" [href]="">{{ data.link }}</a>
              <!-- <input #linkInput nz-input type="text" [(ngModel)]="data.link" (blur)="stopEdit(linkDiv, linkInput)" /> -->
            </td>
            <td>{{ data.branch.toUpperCase() }}</td>
            <td>{{ data.repo.name }}({{ data.repo.repository }})</td>
            <td class="rb-table__cell--revision">{{ data.revision }}</td>
            <td class="rb-table__cell--committed-date">{{ data.committedDate | date: 'yyyy-MM-dd HH:mm:ss' }}</td>
            <td class="rb-table__cell--actions">
              <ng-container *ngIf="data.isCommitting; then rbSpin; else rbActions"></ng-container>
              <ng-template #rbSpin>
                <a nz-button nzType="link" nzLoading></a>
                <a nz-button nzType="link" (click)="data.isCommitting = false">Cancel</a>
              </ng-template>
              <ng-template #rbActions>
                <a nz-button data-btn-type="commit" nzType="link" (click)="commit(data)">Commit</a>
                <a nz-button nzType="link">Refresh</a>
                <a nz-button nzType="link" nz-popconfirm nzPopconfirmTitle="Sure to delete?" (nzOnConfirm)="deleteRow(i)">
                  Delete
                </a>
              </ng-template>
            </td>
          </tr>
        </tbody>
      </nz-table>
    </div>
    <div class="logs-wrapper">
      <h2>Commit Logs</h2>
      <div class="logs-container">
        <p class="logs__paragraph" *ngFor="let log of logs">
          {{ log }}
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoCommitComponent implements OnInit {
  public logs: string[] = [];
  public isAttachingRb = false;
  public rbList: RbItem[] = [];

  private onLogChange = new Subject<string>();

  constructor(
    private rbService: RbService,
    private lockInfoService: LockInfoService,
    private ipcService: IpcService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.onLogChange.subscribe((nLog) => {
      this.logs.reverse();
      this.logs.push(nLog);
      this.logs.reverse();
      this.cdr.detectChanges();
    });
  }

  async attachRb(link: string) {
    const _link = this.formatLink(link);
    if (!this.linkExisted(_link)) {
      this.isAttachingRb = true;

      const rb = new RbItem({ link: _link }, this.onLogChange);
      rb.logger.insert(LOG_PHASE.RB_ATTACH, LOG_TYPE.RB_ATTACH__START, { link: _link });

      const { isSuccessed } = await this.rbService.completeRbInfo(rb);
      if (isSuccessed) {
        this.rbList = [...this.rbList, rb];
      }
      this.isAttachingRb = false;
      this.cdr.detectChanges();
    } else {
      const rb = this.findRbByLink(_link);
      rb.logger.insert(LOG_PHASE.RB_ATTACH, LOG_TYPE.RB_ATTACH__DULICATE);
    }
  }

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

  trackByFn(index: number, rb: RbItem) {
    return rb.link;
  }

  startEdit(divEle: any, inputEle: any) {
    divEle.style.display = 'none';
    inputEle.style.display = 'block';
    setTimeout(() => {
      inputEle.focus();
    }, 0);
  }

  stopEdit(divEle: any, inputEle: any) {
    divEle.style.display = 'block';
    inputEle.style.display = 'none';
  }

  deleteRow(index: number) {
    this.rbList.splice(index, 1);
    this.rbList = [...this.rbList];
  }

  openUrl(event: MouseEvent, url: string) {
    const req: IPCRequest<string> = { data: url, responseChannel: IpcChannel.OPEN_EXTERNAL_URL_RES };
    this.ipcService.send(IpcChannel.OPEN_EXTERNAL_URL_REQ, req);
    event.preventDefault();
    event.stopPropagation();
  }

  private linkExisted(link: string) {
    return !!this.findRbByLink(link);
  }

  private findRbByLink(link: string) {
    return this.rbList.find((item) => item.link === link);
  }

  /**
   * Link must end with a slash like: http://biedronka.emea.nsn-net.net/r/76664/
   * instead of http://biedronka.emea.nsn-net.net/r/76664, review board doesn't accept this type of link.
   */
  private formatLink(link: string) {
    if (link.match(/.+\//)[0] === link) {
      return link;
    } else {
      return link + '/';
    }
  }
}

/**
 * Log format: {date} {name}[{comments}][{phase}]: {message}
 * like: 2021-03-23 03:41:23 PR576298[TRUNK.MOAM][Branch_Lock_Info]: Locked, block by BC. Keep listening...
 */
class Logger {
  logs: string[] = [];

  constructor(public name: string, public comments: string, private onLogChange: Subject<string>) {}

  // 2021-03-23 03:41:23 GENERAL[RB_ATTACH]: Start to attach "http://biedronka.emea.nsn-net.net/r/92555/"...
  insert(phase: LOG_PHASE, type: LOG_TYPE, info: any = {}) {
    const date = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-CN');
    const name = this.name || 'GENERAL';
    const message = getStringFromTemplate(LOG_TEMPLATES[type], info);
    let nLog = `${date} ${name}`;
    if (this.comments) {
      nLog += `[${this.comments}]`;
    }
    nLog += `[${phase}]: ${message}`;
    this.logs.push(nLog);
    this.onLogChange.next(nLog);
  }
}

export class RbItem implements ReviewBoard {
  public get data(): ReviewBoard {
    return {
      id: this.id,
      name: this.name,
      link: this.link,
      branch: this.branch,
      repo: this.repo,
      revision: this.revision,
      committedDate: this.committedDate,
      logs: this.logger.logs,
    };
  }
  public readonly id: number;
  public name: string;
  public link: string;
  public branch: string;
  public repo: Repo;
  public revision: string;
  public committedDate: Date;
  public logs: string[];
  public isCommtting: boolean;
  public logger: Logger;

  // true means committment on going
  public isCommitting: boolean;

  constructor(value: Partial<ReviewBoard>, onLogChange: Subject<string>) {
    Object.assign(this, value);
    const comments = value.branch && value.repo.name ? `${value.branch.toUpperCase()}.${value.repo.name}` : null;
    this.logger = new Logger(value.name, comments, onLogChange);
  }

  merge(value: Partial<ReviewBoard>) {
    Object.assign(this, value);
    if (!this.logger.name && value.name) {
      this.logger.name = value.name;
    }
    if (!this.logger.comments && value.repo?.name) {
      this.logger.comments = `${value.branch.toUpperCase()}.${value.repo.name}`;
    }
  }
}

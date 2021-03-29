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
      .rb-form-container {
        display: flex;
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
      .rb-table__cell {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
    </style>
    <div class="rb-form-wrapper">
      <h2>RB Table</h2>
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
      <nz-table #editRowTable nzBordered [nzData]="listOfData">
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
          <tr #tableRow *ngFor="let data of editRowTable.data; index as i" class="editable-row">
            <td>
              <div #nameDiv class="editable-cell" (click)="startEdit(nameDiv, nameInput)">
                {{ data.name }}
              </div>
              <input #nameInput type="text" nz-input [(ngModel)]="data.name" (blur)="stopEdit(nameDiv, nameInput)" />
            </td>
            <td>
              <div #linkDiv class="editable-cell" (click)="startEdit(linkDiv, linkInput)">
                <a (click)="openUrl($event, data.link)" [href]="">{{ data.link }}</a>
              </div>
              <input #linkInput nz-input type="text" [(ngModel)]="data.link" (blur)="stopEdit(linkDiv, linkInput)" />
            </td>
            <td>{{ data.branch.toUpperCase() }}</td>
            <td>{{ data.repo.name }}({{ data.repo.repository }})</td>
            <td>{{ data.revision }}</td>
            <td>{{ data.committedDate }}</td>
            <td class="rb-table__cell">
              <ng-container *ngIf="data.isCommitting; then rbSpin; else rbActions"></ng-container>
              <ng-template #rbActions>
                <a nz-button data-btn-type="commit" nzType="link" (click)="commit(data)">Commit</a>
                <a nz-button nzType="link">Refresh</a>
                <a nz-button nzType="link" nz-popconfirm nzPopconfirmTitle="Sure to delete?" (nzOnConfirm)="deleteRow(i)">
                  Delete
                </a>
              </ng-template>
              <ng-template #rbSpin>
                <a nz-button nzType="link" nzLoading></a>
                <a nz-button nzType="link" (click)="data.isCommitting = false">Cancel</a>
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

  private onLogChange = new Subject<string>();

  public listOfData: RbItem[] = [];

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

  async attachRb(link: string) {
    if (!this.linkExisted(link)) {
      this.isAttachingRb = true;
      const rb = new RbItem({ link }, this.onLogChange);
      rb.logger.insert(LOG_PHASE.RB_ATTACH, LOG_TYPE.RB_ATTACH__START, { link });
      const value = await this.rbService.getPartialRb(rb);
      if (value) {
        rb.merge(value);
        rb.logger.insert(LOG_PHASE.RB_ATTACH, LOG_TYPE.RB_ATTACH__OK);
        this.isAttachingRb = false;
        this.listOfData = [...this.listOfData, rb];
      }
      this.isAttachingRb = false;
      this.cdr.detectChanges();
    } else {
      const rb = this.findRbByLink(link);
      rb.logger.insert(LOG_PHASE.RB_ATTACH, LOG_TYPE.RB_ATTACH__DULICATE);
    }
  }

  deleteRow(index: number) {
    this.listOfData.splice(index, 1);
    this.listOfData = [...this.listOfData];
  }

  openUrl(event: MouseEvent, url: string) {
    const req: IPCRequest<string> = { data: url, responseChannel: IpcChannel.OPEN_EXTERNAL_URL_RES };
    this.ipcService.send(IpcChannel.OPEN_EXTERNAL_URL_REQ, req);
    event.preventDefault();
    event.stopPropagation();
  }

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

  public async commit(rb: RbItem) {
    rb.isCommitting = true;
    rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.RB_IS_READY__START, { link: rb.link });
    const ready = await this.rbService.isRbReady(rb);
    this.cdr.detectChanges();
    if (ready) {
      rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.BRANCH_CHECK__START);
      this.lockInfoService.getUnlockListener(rb).subscribe(
        async () => {
          rb.logger.insert(LOG_PHASE.SVN_COMMIT, LOG_TYPE.SVN_COMMIT__START);
          await this.rbService.svnCommit(rb);
          rb.isCommitting = false;
          this.cdr.detectChanges();
        },
        () => {},
        () => {
          rb.isCommitting = false;
          this.cdr.detectChanges();
        }
      );
    } else {
      rb.isCommitting = false;
      this.cdr.detectChanges();
    }
  }

  private linkExisted(link: string) {
    return !!this.findRbByLink(link);
  }

  private findRbByLink(link: string) {
    return this.listOfData.find((item) => item.link === link);
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
  public committedDate: string;
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

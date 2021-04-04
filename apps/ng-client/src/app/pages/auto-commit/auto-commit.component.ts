import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { formatDate } from '@angular/common';
import { Repo, ReviewBoard } from '@oam-kit/store';
import { LOG_PHASE, LOG_TEMPLATES, LOG_TYPE } from '@oam-kit/logger';
import { getStringFromTemplate } from '@oam-kit/utility/utils';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-auto-commit',
  template: `
    <style>
      :host {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
      }
      .action-bar__container {
        margin-bottom: 10px;
      }
      .logs-wrapper {
        margin-top: 20px;
      }
      .logs-container {
        height: 300px;
        padding: 10px;
        background: #f0f2f5;
        overflow-y: auto;
      }
    </style>
    <div class="rb-form-wrapper">
      <h2>RB Table</h2>
      <div class="action-bar__container">
        <app-attachbar [onLogChange]="onLogChange" [rbList]="rbList" (attached)="onRbAttached($event)"></app-attachbar>
      </div>
      <div class="rbtable__container">
        <app-rbtable [rbList]="rbList" (rowDelete)="onRbDelete($event)"></app-rbtable>
      </div>
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
export class AutoCommitComponent {
  public logs: string[] = [];
  public rbList: RbItem[] = [];
  public onLogChange = new Subject<string>();

  constructor(private cdr: ChangeDetectorRef) {
    this.onLogChange.subscribe((nLog) => {
      this.logs.reverse();
      this.logs.push(nLog);
      this.logs.reverse();
      this.cdr.detectChanges();
    });
  }

  onRbAttached(rb: RbItem) {
    this.rbList = [...this.rbList, rb];
  }

  onRbDelete(index: number) {
    this.rbList.splice(index, 1);
    this.rbList = [...this.rbList];
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

import { Component, Input, OnInit } from '@angular/core';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { IpcChannel } from '@oam-kit/ipc';
import { Branch, Repo } from '@oam-kit/store';
import { modules as moduleConf } from '@oam-kit/utility/overall-config';

@Component({
  selector: 'app-branch-lock-panel',
  template: `
    <style>
      .branch-lock-panel-wrapper {
        width: 320px;
        background: #d3e0dc;
        padding: 0 10px 10px 10px;
      }
      .branch-lock-panel__header {
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .branch-lock-panel__name {
        font-size: 20px;
      }
      .branch-lock-panel__lock-icon {
        color: #00af91;
        font-size: 20px;
      }
      .branch-lock-panel__lock-icon--locked {
        color: #d92027;
      }
      .branch-lock-panel__repo {
        height: 50px;
        padding: 4px 10px;
        background: #ccf2f4;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .branch-lock-panel__repo--right {
        display: flex;
        align-items: center;
      }
      .branch-lock-panel__bell-icon {
        font-size: 20px;
        margin-right: 2px;
        color: grey;
        cursor: pointer;
      }
      .branch-lock-panel__bell-icon--listening {
        color: red;
        -webkit-animation-timing-function: ease-in-out;
        -webkit-animation-name: breathe;
        -webkit-animation-duration: 1000ms;
        -webkit-animation-iteration-count: infinite;
        -webkit-animation-direction: alternate;
      }
      .branch-lock-panel__repo:not(:last-of-type) {
        margin-bottom: 4px;
      }
      @-webkit-keyframes breathe {
        0% {
          opacity: 0.5;
        }
        100% {
          opacity: 1;
        }
      }
    </style>
    <div class="branch-lock-panel-wrapper">
      <div class="branch-lock-panel__header">
        <span class="branch-lock-panel__name">{{ branch.name }}</span>
      </div>
      <div class="branch-lock-panel__repo" *ngFor="let repo of branch?.lock?.repos">
        <div class="branch-lock-panel__repo--right">
          <i
            class="branch-lock-panel__bell-icon"
            [class.branch-lock-panel__bell-icon--listening]="isListeningRepo(repo)"
            nz-icon
            nz-popconfirm
            nzPopconfirmPlacement="top"
            (nzOnConfirm)="onBellClick(repo)"
            [nzPopconfirmTitle]="getPopConfirmTitle(repo)"
            nzType="bell"
            nzTheme="fill"
          ></i>
          <div class="breath_div"></div>
          <span class="branch-lock-panel__name branch-lock-panel__repo-name">{{ repo.name }}</span>
        </div>
        <i
          nz-icon
          nzTheme="fill"
          class="branch-lock-panel__lock-icon"
          [nzType]="hasRepoLocked(repo) ? 'lock' : 'unlock'"
          [class.branch-lock-panel__lock-icon--locked]="hasRepoLocked(repo)"
          nz-tooltip
          [nzTooltipTitle]="getLockMsg(repo)"
        ></i>
      </div>
    </div>
  `,
})
export class BranchLockPanelComponent implements OnInit {
  @Input() branch: Branch;

  public listeningRepoSet = new Set<string>();

  constructor(private ipcService: IpcService) {}

  ngOnInit() {
    setInterval(() => {
      this.listeningRepoSet.forEach((repoName) => {
        const repo = this.branch?.lock?.repos.find((r) => {
          return r.name === repoName;
        });
        if (!this.hasRepoLocked(repo)) {
          this.ipcService.send<{ title: string; body: string }>(IpcChannel.NOTIFICATION_REQ, {
            responseChannel: IpcChannel.NOTIFICATION_RES,
            data: {
              title: 'OAM-KIT',
              body: `${this.branch.name}.${repo.name} unlock`,
            },
          });
        }
      });
    }, moduleConf.lockInfo.interval);
  }

  public getLockMsg(repo: Repo): string {
    if (this.branch?.lock?.locked) {
      return this.branch.lock.reason;
    } else if (repo.locked) {
      return repo.reason;
    }
    return '';
  }

  public hasRepoLocked(repo: Repo): boolean {
    return this.branch?.lock?.locked || repo.locked;
  }

  public isListeningRepo(repo: Repo): boolean {
    return this.listeningRepoSet.has(repo.name);
  }

  public onBellClick(repo: Repo) {
    this.isListeningRepo(repo)
      ? this.listeningRepoSet.delete(repo.name)
      : this.listeningRepoSet.add(repo.name);
  }

  public getPopConfirmTitle(repo: Repo): string {
    if (this.hasRepoLocked(repo)) {
      if (this.isListeningRepo(repo)) {
        return `Are you sure to cancel current listening?`;
      } else {
        return `Are you sure to listen "${repo.name}" of ${this.branch?.name}?`;
      }
    }
  }
}

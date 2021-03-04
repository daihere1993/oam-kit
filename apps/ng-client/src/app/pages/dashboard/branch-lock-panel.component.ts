import { Component, Input } from '@angular/core';
import { Branch, Repo } from '@oam-kit/store';

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
        color: green;
      }
      .branch-lock-panel__repo:not(:last-of-type) {
        margin-bottom: 4px;
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
            [nzPopconfirmTitle]="getPopConfirmTitle(repo)"
            (nzOnConfirm)="onBellClick(repo)"
            nzType="bell"
            nzTheme="fill"
          ></i>
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
export class BranchLockPanelComponent {
  @Input() branch: Branch;

  public listeningRepoSet = new Set<string>();

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
    return this.listeningRepoSet.has(this.getRepoToken(repo));
  }

  public onBellClick(repo: Repo) {
    const token = this.getRepoToken(repo);
    this.isListeningRepo(repo) ? this.listeningRepoSet.delete(token) : this.listeningRepoSet.add(token);
  }

  public getPopConfirmTitle(repo: Repo): string {
    if (this.isListeningRepo(repo)) {
      return `Are you sure to cancel current listening?`;
    } else {
      return `Are you sure to listen ${this.getRepoToken(repo)}?`;
    }
  }

  private getRepoToken(repo: Repo): string {
    if (!this.branch) {
      throw new Error(`[BranchLockPanelComponent][getRepoToken] branch is empty.`);
    }
    if (!repo) {
      throw new Error(`[BranchLockPanelComponent][getRepoToken] repo is empty.`);
    }
    return `${this.branch.name}.${repo.name}`;
  }
}

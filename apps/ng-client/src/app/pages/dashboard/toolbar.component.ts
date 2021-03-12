import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { StoreService } from '@ng-client/core/services/store.service';
import { Branch, modelConfig, Repo } from '@oam-kit/store';
import { cloneDeep } from 'lodash-es';

@Component({
  selector: 'app-branch-lock-info-toolbar',
  template: `
    <style>
      .dashboard-branch-lock-toolbar {
        width: 100%;
        padding: 10px;
        display: flex;
        background: #f0f2f5;
      }
      nz-select {
        margin-right: 6px;
      }
      .dashboard-branch-lock-toolbar nz-select[name='branchSelect'] {
        height: 32px;
        width: 140px;
      }
      .dashboard-branch-lock-toolbar nz-select[name='repoSelect'] {
        width: 260px;
      }
    </style>
    <div class="dashboard-branch-lock-toolbar">
      <nz-select
        name="branchSelect"
        nzPlaceHolder="branch"
        [ngModel]="selectedBranch"
        (ngModelChange)="onBranchChange($event)"
      >
        <nz-option
          *ngFor="let branch of visibleBranches; trackBy: trackFn"
          [nzValue]="branch"
          [nzLabel]="branch.name"
        ></nz-option>
      </nz-select>
      <nz-select
        name="repoSelect"
        nzMode="multiple"
        [(ngModel)]="selectedRepoes"
        nzPlaceHolder="repositories"
      >
        <nz-option *ngFor="let repo of visibleRepoes; trackBy: trackFn" [nzLabel]="repo.name" [nzValue]="repo"></nz-option>
      </nz-select>
      <button
        data-btn-type="update"
        nz-button
        nzType="primary"
        (click)="updatePanel()"
        [disabled]="shouldDisableSaveBtn"
      >
        Save
      </button>
      <button
        data-btn-type="delete"
        nz-button
        nzDanger
        nzType="primary"
        *ngIf="isExistedBranch"
        (click)="deletePanel()"
      >
        Delete
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolbarComponent {
  /** Properties */
  @Input() branches: Branch[];
  @Input() visibleRepoes: Repo[];
  @Input() visibleBranches: Branch[];

  /** States */
  public selectedRepoes: Repo[];
  public selectedBranch: Branch;
  public get isExistedBranch() {
    return this.branches.findIndex((branch) => branch.name === this.selectedBranch?.name) !== -1;
  }
  public get shouldDisableSaveBtn() {
    const branch = this.getBranchByName(this.selectedBranch?.name);
    return (
      !this.selectedBranch || (this.isExistedBranch && this.allRepoesExisted(branch, this.selectedRepoes))
    );
  }

  constructor(private store: StoreService) {}

  /** Public methods */
  public onBranchChange(change: Branch) {
    this.selectedBranch = change;
    if (this.isExistedBranch) {
      const branch = this.getBranchByName(change.name);
      this.selectedRepoes = this.getSelectedRepoesSameLikeBranch(branch);
    } else {
      this.selectedRepoes = [];
    }
  }

  public updatePanel() {
    if (this.isExistedBranch) {
      const branch = this.getBranchByName(this.selectedBranch.name);
      branch.lock.repos = this.selectedRepoes;
      this.store.editItem(modelConfig.lockInfoBranch.name, branch);
    } else {
      const branch: Branch = {
        name: this.selectedBranch?.name,
        lock: { repos: this.selectedRepoes },
      };
      this.store.createItem(modelConfig.lockInfoBranch.name, branch);
    }
    this.cleanAllSelects();
  }

  public deletePanel() {
    const branch = this.getBranchByName(this.selectedBranch.name);
    this.store.deleteItem(modelConfig.lockInfoBranch.name, branch.id);
    this.cleanAllSelects();
  }

  /** Private methods */
  private getSelectedRepoesSameLikeBranch(branch: Branch): Repo[] {
    const repoes: Repo[] = [];
    for (const repo of this.visibleRepoes) {
      for (const r of branch.lock.repos) {
        if (repo.name === r.name) {
          repoes.push(repo);
        }
      }
    }
    return repoes;
  }
  
  private getBranchByName(name: string): Branch {
    return cloneDeep(this.branches.find((branch) => branch.name === name));
  }

  private allRepoesExisted(branch: Branch, repoes: Repo[]) {
    const branchRepoes = branch.lock.repos;
    if (branchRepoes.length === repoes.length) {
      let n = 0;
      for (const repo of branchRepoes) {
        for (const r of repoes) {
          if (repo.name === r.name) {
            n++;
          }
        }
      }
      return n === branch.lock.repos.length;
    }
    return false;
  }

  private cleanAllSelects() {
    this.selectedBranch = null;
    this.selectedRepoes = [];
  }

  public trackFn(index: number, item: Branch) {
    return item.id;
  }
}

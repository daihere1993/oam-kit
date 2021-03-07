import { Component, OnInit } from '@angular/core';
import { Branch, modelConfig, Repo } from '@oam-kit/store';
import { modules as moduleConf } from '@oam-kit/utility/overall-config';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <style>
      .dashboard-wrapper {
        display: flex;
        flex-wrap: wrap;
      }
      .dashboard-brach-lock-container {
        margin-bottom: 10px;
      }
      .dashboard-brach-lock-container:not(:last-of-type) {
        margin-right: 10px;
      }
    </style>
    <div class="dashboard-wrapper">
      <div class="dashboard-brach-lock-container" *ngFor="let branch of branches">
        <app-branch-lock-panel [branch]="branch"></app-branch-lock-panel>
      </div>
      <app-branch-lock-info-toolbar
        [branches]="branches"
        [visibleRepoes]="visibleRepoes"
        [visibleBranches]="visibleBranches"
      ></app-branch-lock-info-toolbar>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  public branches: Branch[];
  public visibleRepoes: Repo[];
  public visibleBranches: Branch[];

  constructor(private store: StoreService) {
    this.store.startup();
    this.store.data$.subscribe((data) => {
      this.branches = (data && data[modelConfig.lockInfoBranch.name]) || [];
      this.visibleRepoes = (data && data[modelConfig.visibleRepos.name]) || [];
      this.visibleBranches = (data && data[modelConfig.visibleBranches.name]) || [];
    });
  }

  ngOnInit() {
    setInterval(this.store.refresh.bind(this.store), moduleConf.lockInfo.interval);
  }
}

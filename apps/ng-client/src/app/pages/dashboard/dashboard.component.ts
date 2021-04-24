// import { Component } from '@angular/core';
// import { Branch, modelConfig, Repo } from '@oam-kit/utility/types';
// import { StoreService } from '../../core/services/store.service';

// @Component({
//   selector: 'app-dashboard',
//   template: `
//     <style>
//       .dashboard-branch-lock-pannel-wrapper {
//         display: flex;
//         flex-wrap: wrap;
//       }
//       app-branch-lock-panel {
//         margin-bottom: 10px;
//       }
//       app-branch-lock-panel:not(:last-of-type) {
//         margin-right: 10px;
//       }
//     </style>
//     <div class="dashboard-branch-lock-pannel-wrapper">
//       <app-branch-lock-panel *ngFor="let branch of branches; trackBy: trackByFn" [branch]="branch"></app-branch-lock-panel>
//     </div>
//     <app-branch-lock-info-toolbar
//       [branches]="branches"
//       [visibleRepoes]="visibleRepoes"
//       [visibleBranches]="visibleBranches"
//     ></app-branch-lock-info-toolbar>
//   `,
// })
// export class DashboardComponent {
//   public branches: Branch[];
//   public visibleRepoes: Repo[];
//   public visibleBranches: Branch[];

//   constructor(private store: StoreService) {
//     this.store.startup();
//     this.store.data$.subscribe((data) => {
//       this.branches = (data && data[modelConfig.lockInfoBranch.name]) || [];
//       this.visibleRepoes = (data && data[modelConfig.visibleRepos.name]) || [];
//       this.visibleBranches = (data && data[modelConfig.visibleBranches.name]) || [];
//     });
//   }

//   trackByFn(index: number, item: Branch) {
//     return item.id;
//   }
// }

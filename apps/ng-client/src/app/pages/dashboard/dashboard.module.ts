import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { BranchLockPanelComponent } from './branch-lock-panel.component';

import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

@NgModule({
  declarations: [DashboardComponent, BranchLockPanelComponent],
  imports: [
    CommonModule,
    NzIconModule,
    NzToolTipModule,
    DashboardRoutingModule
  ]
})
export class DashboardModule { }

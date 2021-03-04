import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { BranchLockPanelComponent } from './branch-lock-panel.component';

import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageModule } from 'ng-zorro-antd/message'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'


@NgModule({
  declarations: [DashboardComponent, BranchLockPanelComponent],
  imports: [
    CommonModule,
    NzIconModule,
    NzToolTipModule,
    NzMessageModule,
    NzPopconfirmModule,
    DashboardRoutingModule
  ]
})
export class DashboardModule { }

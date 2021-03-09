import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { BranchLockPanelComponent } from './branch-lock-panel.component';
import { ToolbarComponent } from './toolbar.component';

import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageModule } from 'ng-zorro-antd/message'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';

@NgModule({
  declarations: [DashboardComponent, BranchLockPanelComponent, ToolbarComponent],
  imports: [
    CommonModule,
    FormsModule,
    NzIconModule,
    NzToolTipModule,
    NzMessageModule,
    NzPopconfirmModule,
    NzButtonModule,
    NzSelectModule,
    NzSpinModule,
    DashboardRoutingModule
  ]
})
export class DashboardModule { }

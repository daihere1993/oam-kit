import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { PanelComponent } from './panel.component';

import { NzIconModule } from 'ng-zorro-antd/icon';

@NgModule({
  declarations: [DashboardComponent, PanelComponent],
  imports: [
    CommonModule,
    NzIconModule,
    DashboardRoutingModule
  ]
})
export class DashboardModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeComponent } from './home.component';
import { HttpClientModule } from '@angular/common/http';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { HomeRoutingModule } from './home-routing.module';

import { SyncCodeComponent } from './subviews/sync-code/sync-code.component';
import { KnifeGeneratorComponent } from './subviews/knife-generator/knife-generator.component';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { ReactiveFormsModule } from '@angular/forms';
import { PathInputModule } from '@ng-client/core/components/path-field';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ListContainerModule } from '@ng-client/core/components/list-container';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzAnchorModule } from 'ng-zorro-antd/anchor';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { PorjectItemModule } from '@ng-client/core/components/project-item';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { LogMonitorComponent } from './subviews/log-monitor/log-monitor.component';
import { SettingsComponent } from './subviews/settings/settings.component';
import { NzModalModule } from 'ng-zorro-antd/modal';

@NgModule({
  declarations: [
    HomeComponent,
    SyncCodeComponent,
    KnifeGeneratorComponent,
    LogMonitorComponent,
    SettingsComponent,
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    HomeRoutingModule,
    PathInputModule,
    ListContainerModule,
    PorjectItemModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzSpinModule,
    NzCheckboxModule,
    NzSelectModule,
    NzAlertModule,
    NzSpaceModule,
    NzCardModule,
    NzDividerModule,
    NzStepsModule,
    NzToolTipModule,
    NzAnchorModule,
    NzSpaceModule,
    NzDrawerModule,
    NzEmptyModule,
    NzModalModule,
  ],
})
export class HomeModule {}

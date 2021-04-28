import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { SyncCodeComponent } from './sync-code.component';
import { ProjectSelectorComponent } from './project-selector.component';
import { ProjectSettingComponent } from './project-setting.component';
import { SyncCodeRoutingModule } from './sync-code-routing.module';
import { PathInputModule } from '@ng-client/core/components/path-field';

@NgModule({
  declarations: [ProjectSelectorComponent, ProjectSettingComponent, SyncCodeComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PathInputModule,
    SyncCodeRoutingModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzSpinModule,
    NzSelectModule,
    NzDividerModule,
    NzModalModule,
    NzStepsModule,
    NzToolTipModule,
  ]
})
export class SyncCodeModule { }

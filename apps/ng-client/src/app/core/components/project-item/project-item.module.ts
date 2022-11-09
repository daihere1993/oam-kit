import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ProjectSelectorComponent } from './project-selector.component';
import { ProjectSettingComponent } from './project-setting.component';

import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { PathInputModule } from '../path-field';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@NgModule({
  declarations: [ProjectSelectorComponent, ProjectSettingComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzSelectModule,
    NzDividerModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzButtonModule,
    NzIconModule,
    PathInputModule,
  ],
  exports: [ProjectSelectorComponent],
})
export class PorjectItemModule {}

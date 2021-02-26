import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzNotificationServiceModule } from 'ng-zorro-antd/notification';

import { BranchSelectorComponent } from './branch-selector.component';
import { BranchSettingComponent } from './branch-setting.component';
import { PathInputModule } from '../path-field/path-field.module';

@NgModule({
  declarations: [BranchSelectorComponent, BranchSettingComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PathInputModule,
    NzIconModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzDividerModule,
    NzNotificationServiceModule,
  ],
  exports: [BranchSelectorComponent],
})
export class BranchSelectorModule {}

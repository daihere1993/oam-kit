import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BranchSelectorModule } from '../../core/components/branch-selector';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzNotificationServiceModule } from 'ng-zorro-antd/notification';
import { NzStepsModule } from 'ng-zorro-antd/steps';

import { SyncCodeComponent } from './sync-code.component';
import { SyncCodeRoutingModule } from './sync-code-routing.module';

@NgModule({
  declarations: [SyncCodeComponent],
  imports: [
    CommonModule,
    SyncCodeRoutingModule,
    BranchSelectorModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzSpinModule,
    NzNotificationServiceModule,
    NzStepsModule,
  ]
})
export class SyncCodeModule { }

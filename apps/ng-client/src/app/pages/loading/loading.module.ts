import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { LoadingRoutingModule } from './loading-routing.module';

import { LoadingComponent } from './loading.component';

@NgModule({
  imports: [CommonModule, LoadingRoutingModule, NzSpinModule, NzIconModule],
  declarations: [LoadingComponent],
})
export class LoadingModule {}
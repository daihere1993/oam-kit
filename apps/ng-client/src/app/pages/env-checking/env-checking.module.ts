import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { EnvCheckingComponent } from './env-checking.component';
import { EnvCheckingRoutingModule } from './env-checking.routing';

@NgModule({
  declarations: [EnvCheckingComponent],
  imports: [
    CommonModule,
    EnvCheckingRoutingModule,
    NzIconModule,
    NzButtonModule,
  ],
})
export class EnvCheckingModule {}

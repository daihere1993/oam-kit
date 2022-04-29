import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { EnvCheckComponent } from './env-check.component';
import { EnvCheckRoutingModule } from './env-check.routing';

@NgModule({
  declarations: [EnvCheckComponent],
  imports: [
    CommonModule,
    EnvCheckRoutingModule,
    NzIconModule,
    NzButtonModule,
  ],
})
export class EnvCheckModule {}

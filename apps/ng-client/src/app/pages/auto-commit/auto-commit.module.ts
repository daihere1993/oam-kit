import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCommitComponent } from './auto-commit.component';
import { AutoCommitRoutingModule } from './auto-commit-routing';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { OverlayModule } from '@angular/cdk/overlay';

@NgModule({
  declarations: [AutoCommitComponent],
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzButtonModule,
    NzTableModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzMenuModule,
    NzIconModule,
    OverlayModule,
    AutoCommitRoutingModule
  ]
})
export class AutoCommitModule { }

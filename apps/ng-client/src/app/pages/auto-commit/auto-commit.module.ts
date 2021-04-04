import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AutoCommitComponent } from './auto-commit.component';
import { AutoCommitRoutingModule } from './auto-commit-routing';
import { AttachbarComponent } from './attachbar.component';
import { RbTableComponent } from './rbtable.component';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';

import { OverlayModule } from '@angular/cdk/overlay';

@NgModule({
  declarations: [AutoCommitComponent, AttachbarComponent, RbTableComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzInputModule,
    NzButtonModule,
    NzTableModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzMenuModule,
    NzIconModule,
    NzFormModule,
    NzGridModule,
    OverlayModule,
    AutoCommitRoutingModule,
  ],
})
export class AutoCommitModule {}

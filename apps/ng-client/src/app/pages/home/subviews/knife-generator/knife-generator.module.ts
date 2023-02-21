import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { KnifeGeneratorRoutingModule } from './knife-generator-routing.module';
import { KnifeGeneratorComponent } from './knife-generator.component';
import { PathInputModule } from '../../../../core/components/path-field';


@NgModule({
  declarations: [KnifeGeneratorComponent],
  imports: [
    CommonModule,
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzSpinModule,
    NzAlertModule,
    ReactiveFormsModule,
    KnifeGeneratorRoutingModule,
    PathInputModule,
  ]
})
export class KnifeGeneratorModule { }
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { PathInputComponent } from './path-field.component';

@NgModule({
  declarations: [PathInputComponent],
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzIconModule,
  ],
  exports: [PathInputComponent],
})
export class PathInputModule {}
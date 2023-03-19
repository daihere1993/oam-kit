import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ZipParserRoutingModule } from './zip-parser-routing.module';
import { ZipParserComponent } from './zip-parser.component';

import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzMessageModule } from 'ng-zorro-antd/message';

@NgModule({
  imports: [
    CommonModule,
    ZipParserRoutingModule,
    NzIconModule,
    NzUploadModule,
    NzSpinModule,
    NzButtonModule,
    NzCollapseModule,
    NzListModule,
    NzMessageModule,
  ],
  exports: [],
  declarations: [ZipParserComponent],
  providers: [],
})
export class ZipParserModule { }

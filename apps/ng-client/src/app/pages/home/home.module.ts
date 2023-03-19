import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeComponent } from './home.component';
import { HttpClientModule } from '@angular/common/http';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { HomeRoutingModule } from './home-routing.module';
import { SyncCodeModule } from './subviews/sync-code/sync-code.module';
import { KnifeGeneratorModule } from './subviews/knife-generator/knife-generator.module';
import { ZipParserModule } from './subviews/zip-parser/zip-parser.module';

@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    HttpClientModule,
    HomeRoutingModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    SyncCodeModule,
    KnifeGeneratorModule,
    ZipParserModule
  ],
})
export class HomeModule {}
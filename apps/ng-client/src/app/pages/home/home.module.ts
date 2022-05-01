import { NgModule } from '@angular/core';

import { HomeComponent } from './home.component';
import { HttpClientModule } from '@angular/common/http';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { HomeRoutingModule } from './home-routing.module';
import { SyncCodeModule } from './subviews/sync-code/sync-code.module';
import { KnifeGeneratorModule } from './subviews/knife-generator/knife-generator.module';

// import { AutoCommitModule } from '../auto-commit/auto-commit.module';

/** Global zorro module */
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    HttpClientModule,
    NzNotificationModule,
    HomeRoutingModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    SyncCodeModule,
    KnifeGeneratorModule,
  ],
})
export class HomeModule {}

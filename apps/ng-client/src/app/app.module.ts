import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AppRoutingModule } from './app-routing.module';
import { SyncCodeModule } from './pages/sync-code/sync-code.module';
import { ProfileModule } from './pages/profile/profile.module';
import { DashboardModule } from './pages/dashboard/dashboard.module';
import { RouteReuseStrategy } from '@angular/router';
import { CacheRouteStrategy } from './core/services/cache-page-strategy.service';

/** config angular i18n */
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
registerLocaleData(en);

/** config ng-zorro-antd i18n **/
import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    DashboardModule,
    SyncCodeModule,
    ProfileModule,
  ],
  providers: [
    {
      provide: RouteReuseStrategy,
      useClass: CacheRouteStrategy,
    },
    { provide: NZ_I18N, useValue: en_US },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

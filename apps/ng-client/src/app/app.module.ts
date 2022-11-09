import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, NgModule } from '@angular/core';

import { RouteReuseStrategy } from '@angular/router';
import { CacheRouteStrategy } from '@ng-client/core/services/cache-page-strategy.service';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';

/** config angular i18n */
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
registerLocaleData(en);

import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';
import { StoreService } from './core/services/store.service';

/** Global zorro module */
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { LogService } from './core/services/log.service';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    NzNotificationModule,
    AppRoutingModule,
  ],
  providers: [
    {
      provide: RouteReuseStrategy,
      useClass: CacheRouteStrategy,
    },
    {
      multi: true,
      deps: [StoreService, LogService],
      provide: APP_INITIALIZER,
      useFactory: (store: StoreService, logService: LogService) => {
        return () => {
          store.initialize();
          logService.initialize();
        };
      }
    },
    { provide: NZ_I18N, useValue: en_US },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

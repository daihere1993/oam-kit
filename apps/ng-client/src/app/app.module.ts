import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { Router, RouteReuseStrategy } from '@angular/router';
import { CacheRouteStrategy } from './core/services/cache-page-strategy.service';

/** config angular i18n */
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
registerLocaleData(en);

import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';
import { StoreService } from './core/services/store.service';
import { AuthService } from './core/services/auth.service';

import { HomeModule } from './pages/home/home.module';
import { LoginModule } from './pages/login/login.module';
import { EnvService } from './core/services/env.service';
import { EnvCheckModule } from './pages/env-check/env-check.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    HomeModule,
    LoginModule,
    EnvCheckModule,
  ],
  providers: [
    {
      provide: RouteReuseStrategy,
      useClass: CacheRouteStrategy,
    },
    {
      multi: true,
      deps: [StoreService, AuthService, EnvService, Router],
      provide: APP_INITIALIZER,
      useFactory: (store: StoreService, auth: AuthService, evnService: EnvService, router: Router) => {
        return async () => {
          await store.load();
          router.navigateByUrl('env-check');
          // if (await evnService.isAllNecessaryCommandsReady()) {
          //   if (auth.isEmptyAccount() || !await auth.isValidAuthentication()) {
          //     router.navigateByUrl('login');
          //   }
          // } else {
          //   router.navigateByUrl('env-check');
          // }
        };
      },
    },
    { provide: NZ_I18N, useValue: en_US },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

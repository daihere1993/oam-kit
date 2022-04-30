import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { RouteReuseStrategy } from '@angular/router';
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
import { EnvCheckingModule } from './pages/env-checking/env-checking.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    HomeModule,
    LoginModule,
    EnvCheckingModule,
  ],
  providers: [
    {
      provide: RouteReuseStrategy,
      useClass: CacheRouteStrategy,
    },
    {
      multi: true,
      deps: [StoreService, AuthService, EnvService],
      provide: APP_INITIALIZER,
      useFactory: (store: StoreService, auth: AuthService, envService: EnvService) => {
        return async () => {
          await store.initialize();
          await envService.envChecking();
          if (await envService.isCommandsReady()) {
              await auth.authChecking();
          }
        };
      },
    },
    { provide: NZ_I18N, useValue: en_US },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

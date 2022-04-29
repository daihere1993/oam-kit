import { NgModule } from '@angular/core';
import { RouterModule, Route } from '@angular/router';

export interface AppRoute extends Route {
  shouldCache?: boolean;
}

const routes: AppRoute[] = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module')
      .then(m => m.HomeModule),
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module')
      .then(m => m.LoginModule),
  },
  {
    path: 'env-check',
    loadChildren: () => import('./pages/env-check/env-check.module')
      .then(m => m.EnvCheckModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

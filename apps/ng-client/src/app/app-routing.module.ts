import { NgModule } from '@angular/core';
import { RouterModule, Route } from '@angular/router';

export interface AppRoute extends Route {
  shouldCache?: boolean;
}

const routes: AppRoute[] = [
  {
    path: '',
    redirectTo: 'loading',
    pathMatch: 'full',
  },
  {
    path: 'loading',
    loadChildren: () => import('./pages/loading/loading.module')
      .then(m => m.LoadingModule),
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module')
      .then(m => m.HomeModule),
  },
  {
    path: 'env-checking',
    loadChildren: () => import('./pages/env-checking/env-checking.module')
      .then(m => m.EnvCheckingModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

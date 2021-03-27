import { NgModule } from '@angular/core';
import { RouterModule, Route } from '@angular/router';

export interface AppRoute extends Route {
  shouldCache?: boolean;
}

const routes: AppRoute[] = [
  {
    path: '',
    redirectTo: 'auto-commit',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

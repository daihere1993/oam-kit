import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppRoute } from '@ng-client/app-routing.module';
import { AutoCommitComponent } from './auto-commit.component';

export const routes: AppRoute[] = [
  {
    shouldCache: true,
    path: 'auto-commit',
    component: AutoCommitComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AutoCommitRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppRoute } from '@ng-client/app-routing.module';

import { SyncCodeComponent } from './sync-code.component';

export const routes: AppRoute[] = [
  {
    shouldCache: true,
    path: '',
    component: SyncCodeComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SyncCodeRoutingModule {}

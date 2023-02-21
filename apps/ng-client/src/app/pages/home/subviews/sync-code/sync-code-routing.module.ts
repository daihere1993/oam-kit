import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';

import { SyncCodeComponent } from './sync-code.component';

export const routes: Route[] = [
  {
    path: '',
    component: SyncCodeComponent,
    data: { reuse: true },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SyncCodeRoutingModule {}
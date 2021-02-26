import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SyncCodeComponent } from './sync-code.component';

export const routes: Routes = [
  {
    path: 'sync-code',
    component: SyncCodeComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SyncCodeRoutingModule {}

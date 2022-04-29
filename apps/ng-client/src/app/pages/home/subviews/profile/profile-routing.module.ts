import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppRoute } from '@ng-client/app-routing.module';

import { ProfileComponent } from './profile.component';

export const routes: AppRoute[] = [
  {
    path: '',
    component: ProfileComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfileRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppRoute } from '@ng-client/app-routing.module';
import { HomeComponent } from './home.component';

const routes: AppRoute[] = [
  {
    path: '',
    component: HomeComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeRoutingModule {}

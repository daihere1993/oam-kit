import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EnvCheckingComponent } from './env-checking.component';

const routes: Routes = [
  { path: '', component: EnvCheckingComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EnvCheckingRoutingModule { }
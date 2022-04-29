import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EnvCheckComponent } from './env-check.component';

const routes: Routes = [
  { path: '', component: EnvCheckComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EnvCheckRoutingModule { }

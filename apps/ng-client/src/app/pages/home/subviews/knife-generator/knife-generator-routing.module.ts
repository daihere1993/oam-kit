import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { KnifeGeneratorComponent } from './knife-generator.component';

const routes: Route[] = [
  { path: '', component: KnifeGeneratorComponent, data: { reuse: true } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class KnifeGeneratorRoutingModule { }
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { KnifeGeneratorComponent } from './knife-generator.component';

const routes: Routes = [
  { path: 'knife-generator', component: KnifeGeneratorComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class KnifeGeneratorRoutingModule { }

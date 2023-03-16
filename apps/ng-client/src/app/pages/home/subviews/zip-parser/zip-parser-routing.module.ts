import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { ZipParserComponent } from './zip-parser.component';

const routes: Route[] = [
  { path: '', component: ZipParserComponent, data: { reuse: true } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ZipParserRoutingModule { }

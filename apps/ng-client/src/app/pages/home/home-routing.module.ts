import { NgModule } from '@angular/core';
import { RouterModule, Route } from '@angular/router';
import { HomeComponent } from './home.component';

export interface HomeRoute extends Route {
  shouldCache?: boolean;
}

const routes: HomeRoute[] = [
  {
    path: '',
    component: HomeComponent,
    children: [
      {
        path: 'sync-code',
        loadChildren: () => import('./subviews/sync-code/sync-code.module').then((m) => m.SyncCodeModule),
      },
      {
        path: 'knife-generator',
        loadChildren: () => import('./subviews/knife-generator/knife-generator.module').then((m) => m.KnifeGeneratorModule),
      },
      {
        path: 'zip-parser',
        loadChildren: () => import('./subviews/zip-parser/zip-parser.module').then((m) => m.ZipParserModule),
      },
      {
        path: '',
        redirectTo: 'zip-parser',
        pathMatch: 'full',
      }
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeRoutingModule {}
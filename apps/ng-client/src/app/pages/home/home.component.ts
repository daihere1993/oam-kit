import { Component } from '@angular/core';

interface Menu {
  name: string;
  icon: string;
  link: string;
  isCustomIcon: boolean;
}

@Component({
  selector: 'app-root',
  template: `
    <style>
      .container {
        height: 100%;
        width: 100%;
      }

      .content_container {
        padding: 20px;
        height: 100%;
      }
      .nav-menu-item:not(.ant-menu-item-selected):hover {
        background: #f0f2f5;
      }
    </style>
    <nz-layout class="container">
      <nz-sider nzTheme="light" nzWidth="180px">
        <ul nz-menu nzTheme="light">
          <li class="nav-menu-item" nz-menu-item nzMatchRouter *ngFor="let menu of menus">
            <a [routerLink]="menu.link">
              <i *ngIf="!menu.isCustomIcon; else custom_icon" nz-icon [nzType]="menu.icon" nzTheme="outline"></i>
              <ng-template #custom_icon>
                <i nz-icon [nzIconfont]="menu.icon"></i>
              </ng-template>
              <span>{{ menu.name }}</span>
            </a>
          </li>
        </ul>
      </nz-sider>
      <nz-layout style="padding: 10px;">
        <nz-content style="background-color: white; position: relative; overflow: auto;">
          <div class="content_container">
            <router-outlet></router-outlet>
          </div>
        </nz-content>
      </nz-layout>
    </nz-layout>
  `,
})
export class HomeComponent {
  menus: Menu[] = [
    { name: 'Snapshot Parser', icon: 'file-zip', link: '/home/zip-parser', isCustomIcon: false },
    { name: 'Code Synchronizer', icon: 'sync', link: '/home/sync-code', isCustomIcon: false },
    { name: 'Knife Generator', icon: 'icon-jenkins', link: '/home/knife-generator', isCustomIcon: true },
  ];
}
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
      /* ul {
        height: 100%;
        display: flex;
        flex-direction: column;
      } */
      /* .nav-menu-item {
        flex-grow: 1;
        font-size: 16px;
        display: flex;
        justify-content: center;
        align-items: center;
      } */
      .nav-menu-item:not(.ant-menu-item-selected):hover {
        background: #f0f2f5;
      }
    </style>
    <nz-layout class="container">
      <nz-sider nzTheme="light" nzWidth="160px">
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
    { name: 'Sync Code', icon: 'sync', link: '/home/sync-code', isCustomIcon: false },
    // { name: 'Auto Commit', icon: 'field-time', link: '/home/auto-commit', isCustomIcon: false },
    { name: 'Knife Generator', icon: 'icon-jenkins', link: '/home/knife-generator', isCustomIcon: true },
    // { name: 'Profile', icon: 'profile', link: '/home/profile', isCustomIcon: false },
  ];
}

import { Component } from '@angular/core';

interface Menu {
  name: string;
  icon: string;
  link: string;
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
      ul {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .ant-menu-item {
        flex-grow: 1;
        font-size: 16px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    </style>
    <nz-layout class="container">
      <nz-sider nzTheme="light" nzWidth="160px">
        <ul nz-menu nzTheme="light">
          <li nz-menu-item nzMatchRouter *ngFor="let menu of menus">
            <a [routerLink]="menu.link">
              <i nz-icon [nzType]="menu.icon" nzTheme="outline"></i>
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
export class AppComponent {
  menus: Menu[] = [
    { name: 'Sync Code', icon: 'sync', link: '/sync-code' },
    { name: 'Auto Commit', icon: 'field-time', link: '/auto-commit' },
    { name: 'Profile', icon: 'profile', link: '/profile' },
  ];
}

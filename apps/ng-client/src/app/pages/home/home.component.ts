import { Component } from '@angular/core';

interface Menu {
  name: string;
  icon: string;
  link: string;
  isCustomIcon: boolean;
}

@Component({
  selector: 'app-root',
  styleUrls: ['./home.component.scss'],
  template: `
    <nz-layout class="container">
      <nz-content class="main-wrapper">
        <nz-layout>
          <nz-sider nzTheme="light" nzWidth="180px">
            <ul nz-menu nzMode="inline" nzTheme="light" style="height: 100%">
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
          
          <nz-content style="background-color: white; position: relative; overflow: scroll;">
            <div class="content-container">
              <router-outlet></router-outlet>
            </div>
          </nz-content>
        </nz-layout>
      </nz-content>
      <nz-footer>OAM-KIT @2023 Powered by @Luke Wu(luke.wu@nokia-sbell.com)</nz-footer>
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
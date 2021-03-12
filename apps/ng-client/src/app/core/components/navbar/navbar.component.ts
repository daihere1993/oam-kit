import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  public items = [
    {
      title: 'Home',
      link: '/home',
      icon: 'home-outline',
    },
    {
      title: 'Light RCAEDA analyze',
      link: '/rcaeda',
      icon: 'control'
    },
    {
      title: 'Auto Commit',
      link: '/auto-commit',
      icon: 'cloud-upload-outline',
    },
    {
      title: 'Profile',
      link: '/profile',
      icon: 'settings-outline',
    },
  ];
}

import { Component } from '@angular/core';
import { NzIconService } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  constructor(private iconService: NzIconService) {
    this.iconService.fetchFromIconfont({
      scriptUrl:
        'https://at.alicdn.com/t/font_2991525_fxgpbb2k265.js?spm=a313x.7781069.1998910419.71&file=font_2991525_fxgpbb2k265.js',
    });
  }
}

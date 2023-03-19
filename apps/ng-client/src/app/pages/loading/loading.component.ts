import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { EnvService } from '../../core/services/env.service';

@Component({
  selector: 'app-loading',
  template: `
    <style>
      .container {
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    </style>

    <div class="container">
      <nz-spin nzSimple [nzTip]="spinTip" [nzIndicator]="indicatorTemplate"></nz-spin>
      <ng-template #indicatorTemplate><i nz-icon nzType="loading" style="font-size: 32px;"></i></ng-template>
    </div>
  `,
})
export class LoadingComponent implements OnInit {
  spinTip = '';

  constructor(private auth: AuthService, private envService: EnvService, private router: Router) {}

  async ngOnInit() {
    this.spinTip = 'Checking necessary commands...'
    if (await this.envService.isCommandsReady()) {
      this.router.navigateByUrl('home');

      // this.spinTip = 'Checking user authentication...'
      // if (this.auth.isEmptyAccount() || !await this.auth.isValidAuthentication()) {
      //   this.router.navigateByUrl('login');
      // } else {
      //   this.router.navigateByUrl('home');
      // }
    } else {
      this.router.navigateByUrl('env-checking');
    }
  }
}
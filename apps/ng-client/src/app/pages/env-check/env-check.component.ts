import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@ng-client/core/services/auth.service';
import { EnvService } from '@ng-client/core/services/env.service';

@Component({
  selector: 'app-env-check',
  template: `
    <style>
      .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .header i {
        margin-right: 10px;
        color: #ff4d4f;
        font-size: 24px;
      }

      .header h1 {
        margin: 0;
      }
    </style>

    <div class="container">
      <div class="header">
        <i nz-icon nzType="alert" nzTheme="outline"></i>
        <h1>Environment check failed</h1>
      </div>
      <p>Please make sure both of 'git' and 'svn' commands got installed in you computer.</p>
      <button nz-button nzType="primary" (click)="recheck()" [nzLoading]="rechecking">
        {{ rechecking ? 'Rechecking...' : 'Recheck' }}
      </button>
    </div>
  `,
})
export class EnvCheckComponent {
  rechecking = false;

  constructor(private envService: EnvService, private authService: AuthService, private router: Router) {}

  async recheck() {
    this.rechecking = true;
    if (await this.envService.isAllNecessaryCommandsReady()) {
      this.rechecking = false;
      if (this.authService.isEmptyAccount() || !(await this.authService.isValidAuthentication())) {
        this.router.navigateByUrl('login');
      } else {
        this.router.navigateByUrl('home');
      }
    } else {
      this.rechecking = false;
      alert('still failed');
    }
  }
}

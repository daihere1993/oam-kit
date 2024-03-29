import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IpcService } from '../../core/services/ipc.service';
import { NotificationService } from '../../core/services/notification.service';
import { StoreService } from '../../core/services/store.service';
import { Model } from '@oam-kit/data-persistent';
import { Preferences, Profile } from '@oam-kit/shared-interfaces';

@Component({
  selector: 'app-login',
  template: `
    <style>
      .container {
        width: 328px;
        margin: 0 auto;
        position: relative;
        height: 100%;
      }

      .vertical-center {
        width: 100%;
        margin: 0;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
      }
    </style>
    <div class="container">
      <div class="vertical-center">
        <h1 style="text-align: center;">OAM Kit</h1>
        <form nz-form [formGroup]="form" (ngSubmit)="submitForm()">
          <nz-form-item>
            <nz-form-control nzErrorTip="Please input your NBS username">
              <nz-input-group [nzPrefix]="userPrefixIcon">
                <input
                  type="text"
                  nz-input
                  placeholder="NSB Username"
                  name="nsbUsername"
                  data-test="nsb-username-input"
                  formControlName="nsbUsername"
                />
              </nz-input-group>
              <ng-template #userPrefixIcon><i nz-icon nzType="user"></i></ng-template>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-control nzErrorTip="Please input your NBS password">
              <nz-input-group [nzPrefix]="lockPrefixIcon">
                <input
                  nz-input
                  placeholder="NSB Password"
                  name="nsbPassword"
                  data-test="nsb-password-input"
                  type="password"
                  formControlName="nsbPassword"
                  (ngModelChange)="onNsbPasswordChange($event)"
                />
              </nz-input-group>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item *ngIf="!form.value.isSamePassword">
            <nz-form-control nzErrorTip="Please input your SVN password">
              <nz-input-group [nzPrefix]="lockPrefixIcon">
                <input
                  nz-input
                  placeholder="SVN Password"
                  name="svnPassword"
                  data-test="svn-password-input"
                  type="password"
                  formControlName="svnPassword"
                />
              </nz-input-group>
            </nz-form-control>
          </nz-form-item>

          <ng-template #lockPrefixIcon><i nz-icon nzType="lock"></i></ng-template>

          <div style="margin-bottom: 10px;">
            <label
              nz-checkbox
              data-test="same-password-checkbox"
              (ngModelChange)="onCheckboxChange($event)"
              formControlName="isSamePassword"
            >
              Same svn password like nsb
            </label>
          </div>

          <button
            nz-button
            data-test="login-button"
            class="button__save"
            nzType="primary"
            [nzLoading]="isLogin"
            style="width: 100%"
          >
            {{ isLogin ? 'Auth validating...' : 'Login' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  public form: FormGroup;
  public profile: Profile;
  public isLogin = false;

  private pModel: Model<Preferences>;
  private get nsbUsername(): FormControl {
    return this.form.get('nsbUsername') as FormControl;
  }
  private get nsbPassword(): FormControl {
    return this.form.get('nsbPassword') as FormControl;
  }
  private get svnPassword(): FormControl {
    return this.form.get('svnPassword') as FormControl;
  }
  private get isSamePassword(): FormControl {
    return this.form.get('isSamePassword') as FormControl;
  }

  constructor(
    private fb: FormBuilder,
    private notification: NotificationService,
    private store: StoreService,
    private ipcService: IpcService,
    private cdf: ChangeDetectorRef,
    private router: Router,
    private authService: AuthService
  ) {
    this.pModel = this.store.getModel<Preferences>('preferences');
    this.pModel.subscribe<Profile>('profile', (data) => {
      this.profile = data;
    });
    this.form = this.fb.group({
      nsbUsername: [this.profile?.nsbAccount.username, [Validators.required]],
      nsbPassword: [this.profile?.nsbAccount.password, [Validators.required]],
      svnPassword: [this.profile?.svnAccount.password, [Validators.required]],
      isSamePassword: [true],
    });
  }

  public submitForm(): void {
    if (this.form.valid) {
      this.login();
    } else {
      Object.values(this.form.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity();
        }
      });
    }
  }

  public async login() {
    this.isLogin = true;
    const nsbUsername = this.nsbUsername.value;
    const nsbPassword = this.nsbPassword.value;
    const svnPassword = this.svnPassword.value;

    if (!(await this.authService.isValidNsbAuth(nsbUsername, nsbPassword))) {
      this.isLogin = false;
      this.notification.error('Failed', 'Incorrect NSB account and password.');
      return;
    }

    if (!(await this.authService.isValidSvnAuth(nsbUsername, svnPassword))) {
      this.isLogin = false;
      this.notification.error('Failed', 'Incorrect SVN account and password.');
      return;
    }

    this.pModel.set('profile', (draft) => {
      draft.nsbAccount.username = this.nsbUsername.value;
      draft.nsbAccount.password = this.nsbPassword.value;
      draft.svnAccount.password = this.svnPassword.value;
    });
    this.isLogin = false;
    this.router.navigateByUrl('home');
    this.cdf.markForCheck();
  }

  public onCheckboxChange(value: boolean) {
    if (value) {
      this.form.patchValue({ svnPassword: this.nsbPassword.value });
    } else {
      this.form.patchValue({ svnPassword: '' });
    }
  }

  public shouldSaveButtonDisabeld() {
    if (this.isDirty() && this.form.valid) {
      return false;
    }
    return true;
  }

  public onNsbPasswordChange(value: string) {
    if (this.isSamePassword.value) {
      this.svnPassword.setValue(value);
    }
  }

  private isDirty() {
    return this.nsbUsername.dirty || this.nsbPassword.dirty || this.svnPassword.dirty;
  }
}
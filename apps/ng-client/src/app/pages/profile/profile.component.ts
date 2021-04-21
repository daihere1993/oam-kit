import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { GeneralModel, IpcChannel, Profile } from '@oam-kit/utility/types';
import { StoreService } from '@ng-client/core/services/store.service';
import { MODEL_NAME } from '@oam-kit/utility/overall-config';
import { Model } from '@oam-kit/utility/model';
import { IpcService } from '@ng-client/core/services/ipc.service';

@Component({
  selector: 'app-profile',
  template: `
    <style>
      .container {
        display: flex;
        flex-direction: column;
      }

      .field_item {
        margin-bottom: 10px;
      }

      .button__save {
        width: 200px;
      }
    </style>
    <div class="container">
      <form nz-form [formGroup]="form">
        <nz-form-item>
          <nz-form-label [nzSm]="6" [nzXs]="24" nzRequired nzFor="nsbUsername">NSB Username</nz-form-label>
          <nz-form-control [nzSm]="14" [nzXs]="24">
            <input nz-input name="nsbUsername" data-test="nsb-username-input" formControlName="nsbUsername" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="6" [nzXs]="24" nzRequired nzFor="nsbPassword">NSB Password</nz-form-label>
          <nz-form-control [nzSm]="14" [nzXs]="24">
            <input
              nz-input
              name="nsbPassword"
              data-test="nsb-password-input"
              type="password"
              formControlName="nsbPassword"
              (ngModelChange)="onNsbPasswordChange($event)"
            />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="6" [nzXs]="24" nzRequired nzFor="svnPassword">SVN Password</nz-form-label>
          <nz-form-control [nzSm]="14" [nzXs]="24">
            <input nz-input name="svnPassword" type="password" data-test="svn-password-input" formControlName="svnPassword" />
            <label
              nz-checkbox
              data-test="same-password-checkbox"
              (ngModelChange)="onCheckboxChange($event)"
              formControlName="isSamePassword"
            >
              Same svn password like nsb
            </label>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-control [nzSpan]="14" [nzOffset]="6">
            <button
              nz-button
              data-test="save-button"
              class="button__save"
              nzType="primary"
              (click)="save()"
              [disabled]="shouldSaveButtonDisabeld()"
              [nzLoading]="isSaving"
            >
              {{ isSaving ? 'Auth validating...' : 'Save' }}
            </button>
          </nz-form-control>
        </nz-form-item>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  public form: FormGroup;
  public profile: Profile;
  public isSaving = false;

  private gModel: Model<GeneralModel>;
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
    private notification: NzNotificationService,
    private store: StoreService,
    private ipcService: IpcService,
    private cdf: ChangeDetectorRef
  ) {
    this.gModel = this.store.getModel<GeneralModel>(MODEL_NAME.GENERAL);
    this.gModel.subscribe<Profile>('profile', (data) => {
      this.profile = data;
    });
    this.form = this.fb.group({
      nsbUsername: [this.profile?.nsbAccount.username, [Validators.required]],
      nsbPassword: [this.profile?.nsbAccount.password, [Validators.required]],
      svnPassword: [{ value: this.profile?.svnAccount.password, disabled: true }, [Validators.required]],
      isSamePassword: [true],
    });
  }

  public save(): void {
    this.isSaving = true;
    const nsbUsername = this.nsbUsername.value;
    const nsbPassword = this.nsbPassword.value;
    const svnPassword = this.svnPassword.value;
    Promise.all([
      this.ipcService.send(IpcChannel.NSB_ACCOUNT_VERIFICATION_REQ, {
        responseChannel: IpcChannel.NSB_ACCOUNT_VERIFICATION_RES,
        data: { username: nsbUsername, password: nsbPassword },
      }),
      this.ipcService.send(IpcChannel.SVN_ACCOUNT_VERIFICATION_REQ, {
        responseChannel: IpcChannel.SVN_ACCOUNT_VERIFICATION_RES,
        data: { username: nsbUsername, password: svnPassword },
      }),
    ])
      .then(([nsbRes, svnRes]) => {
        this.isSaving = false;
        const isRightNsbAccount = nsbRes.data && nsbRes.isSuccessed;
        const isRightSvnAccount = svnRes.data && svnRes.isSuccessed;
        if (isRightNsbAccount && isRightSvnAccount) {
          this.gModel.set('profile', (draft) => {
            draft.nsbAccount.username = this.nsbUsername.value;
            draft.nsbAccount.password = this.nsbPassword.value;
            draft.svnAccount.password = this.svnPassword.value;
          });
          this.notification.create('success', 'Success', '', { nzPlacement: 'bottomRight' });
        } else if (!isRightNsbAccount) {
          this.notification.create('error', 'Failed', 'Wrong nsb account.', { nzPlacement: 'bottomRight' });
        } else if (!isRightSvnAccount) {
          this.notification.create('error', 'Failed', 'Wrong svn account.', { nzPlacement: 'bottomRight' });
        }
      })
      .catch((error) => {
        this.isSaving = false;
        this.notification.create('error', 'Failed', error.message, { nzPlacement: 'bottomRight' });
      })
      .finally(() => {
        this.cdf.markForCheck();
      });
  }

  public onCheckboxChange(value: boolean) {
    if (value) {
      this.form.patchValue({ svnPassword: this.nsbPassword.value });
      this.form.get('svnPassword').disable();
    } else {
      this.form.patchValue({ svnPassword: '' });
      this.form.get('svnPassword').enable();
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
    return (
      this.profile.nsbAccount.username !== this.nsbUsername.value ||
      this.profile.nsbAccount.password !== this.nsbPassword.value ||
      (this.isSamePassword.value ? false : this.profile.svnAccount.password !== this.svnPassword.value)
    );
  }
}

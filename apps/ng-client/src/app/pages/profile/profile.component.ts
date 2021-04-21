import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
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
    const nsbUsername = this.form.value.nsbUsername;
    const nsbPassword = this.form.value.nsbPassword;
    const svnPassword = this.form.value.svnPassword;
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
            draft.nsbAccount.username = this.form.value.nsbUsername;
            draft.nsbAccount.password = this.form.value.nsbPassword;
            draft.svnAccount.password = this.form.value.svnPassword;
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
    const svnPasswordFormCtrl = this.form.get('svnPassword');
    if (value) {
      svnPasswordFormCtrl.setValue(this.form.value.nsbPassword);
      this.form.get('svnPassword').disable();
    } else {
      svnPasswordFormCtrl.setValue('');
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
    if (this.form.value.isSamePassword) {
      this.form.value.svnPassword = value;
    }
  }

  private isDirty() {
    return (
      this.profile.nsbAccount.username !== this.form.value.nsbUsername ||
      this.profile.nsbAccount.password !== this.form.value.nsbPassword ||
      (this.form.value.isSamePassword ? false : this.profile.svnAccount.password !== this.form.value.svnPassword)
    );
  }
}

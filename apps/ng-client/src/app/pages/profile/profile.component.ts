import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { GeneralModel, Profile } from '@oam-kit/utility/types';
import { StoreService } from '@ng-client/core/services/store.service';
import { MODEL_NAME } from '@oam-kit/utility/overall-config';
import { Model } from '@oam-kit/utility/model';

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
          <nz-form-label [nzSm]="6" [nzXs]="24" nzRequired nzFor="username">Username</nz-form-label>
          <nz-form-control [nzSm]="14" [nzXs]="24">
            <input nz-input name="username" formControlName="username" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="6" [nzXs]="24" nzRequired nzFor="password">Password</nz-form-label>
          <nz-form-control [nzSm]="14" [nzXs]="24">
            <input nz-input name="password" type="password" formControlName="password" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-control [nzSpan]="14" [nzOffset]="6">
            <button
              nz-button
              data-btn-type="save"
              class="button__save"
              [disabled]="!form.valid"
              nzType="primary"
              (click)="toSave()"
            >
              Save
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

  private gModel: Model<GeneralModel>;

  constructor(private fb: FormBuilder, private notification: NzNotificationService, private store: StoreService) {
    this.gModel = this.store.getModel<GeneralModel>(MODEL_NAME.GENERAL);
    this.gModel.subscribe<Profile>('profile', (data) => {
      this.profile = data;
    });
    this.form = this.fb.group({
      username: [this.profile?.nsbAccount.username, [Validators.required]],
      password: [this.profile?.nsbAccount.password, [Validators.required]],
    });
  }

  public toSave(): void {
    this.gModel.set('profile', (draft) => {
      draft.nsbAccount = this.form.value;
    });
    this.notification.create('success', 'Success', '', { nzPlacement: 'bottomRight' });
  }
}

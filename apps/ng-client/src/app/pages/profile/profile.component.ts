import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Profile } from '@oam-kit/store/types';
import { ProfileService } from '../../core/services/profile.service';
import { cloneDeep } from 'lodash';

@Component({
  selector: 'oam-profile',
  template: `
    <div class="container">
      <form nz-form [formGroup]="validateForm">
        <nz-form-item>
          <nz-form-label [nzSm]="6" [nzXs]="24" nzRequired nzFor="remote">Server remote</nz-form-label>
          <nz-form-control [nzSm]="14" [nzXs]="24">
            <input nz-input name="remote" formControlName="remote" [(ngModel)]="profile.remote" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="6" [nzXs]="24" nzRequired nzFor="username">Username</nz-form-label>
          <nz-form-control [nzSm]="14" [nzXs]="24">
            <input nz-input name="username" formControlName="username" [(ngModel)]="profile.username" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="6" [nzXs]="24" nzRequired nzFor="password">Password</nz-form-label>
          <nz-form-control [nzSm]="14" [nzXs]="24">
            <input nz-input name="password" type="password" formControlName="password" [(ngModel)]="profile.password" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-control [nzSpan]="14" [nzOffset]="6">
            <button
              nz-button
              data-btn-type="save"
              class="button__save"
              [disabled]="validateForm.invalid"
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
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  public validateForm: FormGroup;
  public profile: Profile;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private notification: NzNotificationService,
  ) {}

  public ngOnInit(): void {
    // profile should be a local variable, couldn't have a reference link 
    // with a variable of service which is global variable
    this.profile = cloneDeep(this.profileService.data);
    this.validateForm = this.fb.group({
      remote: [null, [Validators.required]],
      username: [null, [Validators.required]],
      password: [null, [Validators.required]],
    });
  }

  public toSave(): void {
    if (this.profile && this.profile.id) {
      this.profileService.update(this.profile);
    } else {
      this.profileService.create(this.profile);
    }
    this.notification.create('success', 'Success', '', { nzPlacement: 'bottomRight' });
  }
}

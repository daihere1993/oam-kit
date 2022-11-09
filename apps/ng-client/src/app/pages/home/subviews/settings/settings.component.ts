import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '@ng-client/core/services/store.service';
import { Model } from '@oam-kit/utility/model';
import { MODEL_NAME, ServerConnectWay, SettingsModel } from '@oam-kit/utility/types';
import { NzModalRef } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-settings',
  template: `
    <style>
      .group {
        margin-bottom: 10px;
      }
      .group > header {
        font-size: 20px;
        font-weight: bold;
        padding: 0 6px;
      }
      .ant-form-item:hover {
        background-color: #f0f2f5;
      }
    </style>

    <div class="container">
      <form nz-form [formGroup]="form" nzLayout="vertical">
        <nz-form-item>
          <nz-form-label nzFor="username" nzRequired>Username</nz-form-label>
          <nz-form-control nzSpan="6">
            <input nz-input nzSize="small" formControlName="username" id="username" />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label zFor="connectWay" nzRequired>ConnectWay</nz-form-label>
          <nz-form-control nzSpan="12">
            <nz-select nzSize="small" formControlName="connectWay">
              <nz-option *ngFor="let item of connectWays" [nzValue]="item" [nzLabel]="item"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="isByPassword">
          <nz-form-label nzFor="nsbPassword" nzSpan="6">NSB Password</nz-form-label>
          <nz-form-control nzSpan="12">
            <input nz-input type="password" nzSize="small" name="nsbPassword" formControlName="nsbPassword" />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="!form.value.isOnlyOnePassword">
          <nz-form-label nzFor="svnPassword" nzSpan="6">SVN Password</nz-form-label>
          <nz-form-control nzSpan="12">
            <input nz-input type="password" nzSize="small" name="svnPassword" formControlName="svnPassword" />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="isByPassword">
          <nz-form-control nzSpan="12">
            <label nz-checkbox (ngModelChange)="onCheckboxChange($event)" formControlName="isOnlyOnePassword"
              >Same svn password like nsb</label
            >
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzFor="privateKeyPath" nzRequired>PrivateKeyPath</nz-form-label>
          <nz-form-control nzSpan="12">
            <input nz-input nzSize="small" formControlName="privateKeyPath" id="privateKeyPath" />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzFor="serverList" nzRequired>ServerList</nz-form-label>
          <nz-form-control nzSpan="14">
            <app-list-container label="Add server" formControlName="serverList"></app-list-container>
          </nz-form-control>
        </nz-form-item>
      </form>

      <div *nzModalFooter>
        <button
          nz-button
          nzType="primary"
          (click)="save()"
          [disabled]="shouldSaveButtonDisabeld()"
        >
        Save
        </button>
        <button nz-button (click)="close()">Close</button>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  public isSaving = false;
  public form: FormGroup;
  public settings: SettingsModel;
  public get isByPassword(): boolean {
    return this.form.value.connectWay == ServerConnectWay.ByPassword;
  }
  public connectWays = [ServerConnectWay.ByPrivateKeyPath, ServerConnectWay.ByPassword];
  
  private settingsModel: Model<SettingsModel>;
  constructor(private fb: FormBuilder, private store: StoreService, private modal: NzModalRef) {}

  ngOnInit(): void {
    this.settingsModel = this.store.getModel<SettingsModel>(MODEL_NAME.SETTINGS);
    this.settings = this.settingsModel.data;
    const isOnlyOnePassword = this.settings.auth.svnAccount.password === this.settings.auth.nsbAccount.password;
    this.form = this.fb.group({
      username: [this.settings.auth.nsbAccount.username, [Validators.required]],
      nsbPassword: [this.settings.auth.nsbAccount.password, [Validators.required]],
      svnPassword: [this.settings.auth.svnAccount.password, [Validators.required]],
      isOnlyOnePassword: [isOnlyOnePassword],
      privateKeyPath: [this.settings.server.privateKeyPath],
      serverList: [this.settings.server.serverList],
      connectWay: [this.settings.server.connectWay, [Validators.required]],
    });
  }

  public onCheckboxChange(value: boolean) {
    if (value) {
      this.form.patchValue({ svnPassword: this.form.get('nsbPassword').value });
    } else {
      this.form.patchValue({ svnPassword: '' });
    }
  }

  public save() {
    if (this.form.dirty) {
      this.settingsModel.set('auth', (draft) => {
        draft.nsbAccount.username = this.form.get('username').value;
        draft.nsbAccount.password = this.form.get('nsbPassword').value;
        draft.svnAccount.password = this.form.get('isOnlyOnePassword')
          ? this.form.get('nsbPassword').value
          : this.form.get('svnAccount').value;
      });
      this.settingsModel.set('server', (draft) => {
        draft.privateKeyPath = this.form.get('privateKeyPath').value;
        draft.serverList = this.form.get('serverList').value;
        draft.connectWay = this.form.get('connectWay').value;
      });
    }
    this.modal.close();
  }

  public shouldSaveButtonDisabeld() {
    return !(this.form.dirty && this.form.valid);
  }

  public close() {
    this.modal.close();
  }
}

import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { NzSelectComponent } from 'ng-zorro-antd/select';
import { IpcResponseCode, Preferences, Project } from '@oam-kit/shared-interfaces';
import { Model } from '@oam-kit/data-persistent';
import { NzMessageService } from 'ng-zorro-antd/message';
import { StoreService } from '@ng-client/core/services/store.service';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { promiseTimeout } from '@oam-kit/utility/common';

export enum DialogAction {
  CANCEL = 'cancel',
  SAVE = 'save',
  DELETE = 'delete',
}

export interface DialogRes {
  action: DialogAction;
  content?: Project;
}

@Component({
  selector: 'app-project-setting',
  template: `
    <style>
      .container .ant-form-item:last-child {
        margin: 0;
      }
      nz-select {
        width: 240px;
      }
      nz-divider {
        margin: 4px 0;
      }
      .dropdown-render__containner {
        display: flex;
        flex-wrap: nowrap;
        padding: 8px;
      }
      .dropdown-render__button {
        flex: 0 0 auto;
        padding: 4px 8px;
        display: block;
      }
    </style>
    <div class="container">
      <form nz-from [formGroup]="form" spellcheck="false">
        <nz-form-item>
          <nz-form-label [nzSm]="8" nzRequired nzFor="name">Name</nz-form-label>
          <nz-form-control [nzSm]="13">
            <input nz-input name="name" data-test="project-name-input" formControlName="name" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="8" nzRequired nzFor="serverAddr">Linsee/EECloud address</nz-form-label>
          <nz-form-control [nzSm]="13" nzHasFeedback nzValidatingTip="Validating..." [nzErrorTip]="serverAddrErrorTpl">
            <nz-select
              nzShowSearch
              nzAllowClear
              data-test="server-addr-select"
              formControlName="serverAddr"
              [nzDropdownRender]="dropdownRender"
            >
              <nz-option *ngFor="let server of serverList" [nzLabel]="server" [nzValue]="server"></nz-option>
            </nz-select>
            <ng-template #serverAddrErrorTpl let-control>
              <ng-container *ngIf="control.hasError('serverAddrIsDisconnected')">
                <p>
                  Can't connect to {{ form.value.serverAddr }}, please make sure it is working.
                </p>
              </ng-container>
              <ng-container *ngIf="control.hasError('exception')">
                <p>
                  There is an exception when validating {{ form.value.serverAddr }}
                </p>
              </ng-container>
            </ng-template>
            <ng-template #dropdownRender>
              <nz-divider></nz-divider>
              <div class="dropdown-render__containner">
                <input #inputElement data-test="new-server-addr-input" nz-input type="text" placeholder="Linsee/eeloud server address" />
                <a data-test="add-server-addr-button" class="dropdown-render__button" (click)="onAddServer(inputElement.value)">
                  <i nz-icon nzType="plus"></i>
                </a>
              </div>
            </ng-template>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="8" nzRequired nzFor="localPath">Local project path</nz-form-label>
          <nz-form-control [nzSm]="13">
            <nz-input-group [nzSuffix]="folderSelector">
              <input
                nz-input
                name="localPath"
                data-test="local-project-path-input"
                formControlName="localPath"
                nz-tooltip
                nzTooltipTrigger="focus"
                nzTooltipPlacement="topLeft"
              />
            </nz-input-group>
            <ng-template #folderSelector>
              <app-path-field [value]="project.localPath" (valueChange)="onLocalPathChange($event)"></app-path-field>
            </ng-template>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="8" nzRequired nzFor="remotePath">Remote project path</nz-form-label>
          <nz-form-control [nzSm]="13" nzHasFeedback nzValidatingTip="Validating..." [nzErrorTip]="remotePathErrorTpl">
            <input
              nz-input
              name="remotePath"
              data-test="remote-project-path-input"
              formControlName="remotePath"
              nz-tooltip
              nzTooltipTrigger="focus"
              nzTooltipPlacement="topLeft"
            />
            <ng-template #remotePathErrorTpl let-control>
              <ng-container *ngIf="control.hasError('serverAddrIsEmpty')">
                <p data-test="remote-project-path-validation-alert">
                  Please select a server address before input remote project path
                </p>
              </ng-container>
              <ng-container *ngIf="control.hasError('notExisted')">
                <p data-test="remote-project-path-validation-alert">
                  {{ form.value.remotePath }} does not exist in the {{ form.value.serverAddr }}
                </p>
              </ng-container>
              <ng-container *ngIf="control.hasError('exception')">
                <p>
                  there is an exception when validating {{ form.value.remotePath }} in the {{ form.value.serverAddr }}
                </p>
              </ng-container>
            </ng-template>
          </nz-form-control>
        </nz-form-item>
      </form>

      <div *nzModalFooter>
        <button
          nz-button
          data-test="save-project-button"
          class="dialog_btn"
          nzType="primary"
          (click)="save()"
          [disabled]="shouldDisableSaveButton()"
        >
          Save
        </button>
        <button nz-button data-test="delete-project-button" class="dialog_btn" *ngIf="isEdit" nzDanger="true" (click)="delete()">
          Delete
        </button>
        <button nz-button class="dialog_btn" (click)="close()">Close</button>
      </div>
    </div>
  `,
})
export class ProjectSettingComponent implements OnInit {
  @Input() project: Project;

  @ViewChild(NzSelectComponent) selectComp: NzSelectComponent;

  public form: FormGroup;
  public isEdit: boolean;
  public serverList: string[];
  public pModel: Model<Preferences>;

  private _serverAddrValidator = async (control: FormControl) => {
    const res = await this._ipcService.send(
      '/server/check_server_connection_by_private_key',
      { serverAddr: control.value }
    );
    if (res.code === IpcResponseCode.success) {
      return res.data ? null : { error: true, serverAddrIsDisconnected: true };
    } else {
      this._message.error(res.description);
      return { error: true, exception: true };
    }
  };

  _remotePathValidator = async (control: FormControl) => {
    const serverAddr = this.form.value.serverAddr
    if (!serverAddr) {
      return { error: true, serverAddrIsEmpty: true };
    }

    await promiseTimeout(500);
    const res = await this._ipcService.send('/server/is_path_exist', { host: serverAddr, directory: control.value });
    if (res.code === IpcResponseCode.success) {
      return res.data ? null : { error: true, notExisted: true };
    } else {
      this._message.error(res.description);
      return { error: true, exception: true };
    }
  };

  constructor(
    private _modal: NzModalRef,
    private _fb: FormBuilder,
    private _store: StoreService,
    private _ipcService: IpcService,
    private _message: NzMessageService,
  ) {}

  ngOnInit() {
    this.project = this.project || this.createEmptyProject();
    this.isEdit = !!this.project.name;
    this.pModel = this._store.getModel<Preferences>('preferences');
    const sshInfo = this.pModel.get('ssh');
    this.serverList = sshInfo.servers;
    this.form = this._fb.group({
      name: [this.project.name, [Validators.required]],
      serverAddr: [this.project.serverAddr, [Validators.required], [this._serverAddrValidator]],
      localPath: [this.project.localPath, [Validators.required]],
      remotePath: [this.project.remotePath, [Validators.required], [this._remotePathValidator]],
    });
  }

  private createEmptyProject(): Project {
    return {
      name: null,
      serverAddr: null,
      localPath: null,
      remotePath: null,
    };
  }

  public save(): void {
    this._modal.close({
      action: DialogAction.SAVE,
      content: this.form.value,
    });
  }

  public delete(): void {
    this._modal.close({
      action: DialogAction.DELETE,
      content: this.form.value,
    });
  }

  public close(): void {
    this._modal.close({
      action: DialogAction.CANCEL,
    });
  }

  public onAddServer(value: string) {
    this.serverList.push(value);;
  }

  public shouldDisableSaveButton() {
    return !(this.form.valid && this.isDirty());
  }

  public onLocalPathChange(value: string) {
    this.form.controls['localPath'].setValue(value);
  }

  private isDirty() {
    for (const key in this.project) {
      if (this.form?.value[key] !== (this.project as any)[key]) {
        return true;
      }
    }
    return false;
  }
}

import { Component, Input, OnInit, ViewChild } from '@angular/core';
import {
  SettingsModel,
  IpcChannel,
  Project,
  ServerCheckReqData,
  ServerDirCheckReqData,
  MODEL_NAME,
} from '@oam-kit/utility/types';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { FormGroup, FormBuilder, Validators, FormControl, ValidationErrors } from '@angular/forms';
import { StoreService } from '@ng-client/core/services/store.service';
import { NzSelectComponent } from 'ng-zorro-antd/select';
import { Observable, Observer } from 'rxjs';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { Model } from '@oam-kit/utility/model';
import { NotificationService } from '@ng-client/core/services/notification.service';

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
      <form nz-from [formGroup]="form">
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
            >
              <nz-option *ngFor="let server of serverList" [nzLabel]="server" [nzValue]="server"></nz-option>
            </nz-select>
            <ng-template #serverAddrErrorTpl let-control>
              <p data-test="server-addr-validation-alert">
                Can't connect to {{ form.value.serverAddr }}, please make sure it is working.
              </p>
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
              <app-path-field [value]="data.localPath" (valueChange)="onLocalPathChange($event)"></app-path-field>
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
        <button nz-button data-test="delete-project-button" class="dialog_btn" *ngIf="isEdit" nzType="primary" nzDanger (click)="delete()">
          Delete
        </button>
        <button nz-button class="dialog_btn" (click)="close()">Close</button>
      </div>
    </div>
  `,
})
export class ProjectSettingComponent implements OnInit {
  @Input() data: Project = {
    name: null,
    serverAddr: null,
    localPath: null,
    remotePath: null,
  };

  @ViewChild(NzSelectComponent) selectComp: NzSelectComponent;

  public form: FormGroup;
  public isEdit: boolean;
  public serverList: string[];
  public settingsModel: Model<SettingsModel>;

  serverAddrValidator = (control: FormControl) => {
    return new Observable((observer: Observer<ValidationErrors | null>) => {
      const serverAddr = control.value;
      if (serverAddr && this.data.serverAddr !== serverAddr) {
        this.ipcService
          .send<ServerCheckReqData, null>(IpcChannel.SERVER_CHECK, { host: serverAddr })
          .then((res) => {
            if (res.isOk) {
              observer.next(null);
            } else {
              observer.next({ error: true });
            }
            observer.complete();
          });
      } else {
        observer.next(null);
        observer.complete();
      }
    });
  };

  remotePathValidator = (control: FormControl) => {
    return new Observable((observer: Observer<ValidationErrors | null>) => {
      const remotePath = control.value;
      if (!this.form?.value.serverAddr) {
        observer.next({ error: true, serverAddrIsEmpty: true });
        observer.complete();
      } else if (remotePath && this.data.remotePath !== remotePath) {
        this.ipcService
          .send<ServerDirCheckReqData, null>(IpcChannel.SERVER_DIRECTORY_CHECK, {
            host: this.form.value.serverAddr,
            directory: remotePath,
          })
          .then((res) => {
            if (res.isOk) {
              observer.next(null);
            } else {
              observer.next({ error: true, notExisted: true });
            }
            observer.complete();
          });
      } else {
        observer.next(null);
        observer.complete();
      }
    });
  };

  constructor(
    private modal: NzModalRef,
    private fb: FormBuilder,
    private notification: NotificationService,
    private store: StoreService,
    private ipcService: IpcService
  ) {}

  ngOnInit() {
    this.isEdit = !!this.data.name;
    this.settingsModel = this.store.getModel<SettingsModel>(MODEL_NAME.SETTINGS);
    this.serverList = this.settingsModel.get('server').serverList;
    this.form = this.fb.group({
      name: [this.data.name, [Validators.required]],
      serverAddr: [this.data.serverAddr, [Validators.required], [this.serverAddrValidator]],
      localPath: [this.data.localPath, [Validators.required]],
      remotePath: [this.data.remotePath, [Validators.required], [this.remotePathValidator]],
    });
  }

  public save(): void {
    this.modal.close({
      action: DialogAction.SAVE,
      content: this.form.value,
    });
    this.notification.success('Success', '', { nzDuration: 1000 });
  }

  public delete(): void {
    this.modal.close({
      action: DialogAction.DELETE,
      content: this.form.value,
    });
  }

  public close(): void {
    this.modal.close({
      action: DialogAction.CANCEL,
    });
  }

  public onAddServer(value: string) {
    this.settingsModel.set('server', (draft) => {
      draft.serverList.push(value);
    });
  }

  public shouldDisableSaveButton() {
    return !(this.form.valid && this.isDirty());
  }

  public onLocalPathChange(value: string) {
    this.form.controls.localPath.setValue(value);
  }

  private isDirty() {
    for (const key in this.data) {
      if (this.form?.value[key] !== this.data[key]) {
        return true;
      }
    }
    return false;
  }
}

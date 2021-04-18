import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { GeneralModel, IpcChannel, Project } from '@oam-kit/utility/types';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { FormGroup, FormBuilder, Validators, FormControl, ValidationErrors } from '@angular/forms';
import { StoreService } from '@ng-client/core/services/store.service';
import { MODEL_NAME } from '@oam-kit/utility/overall-config';
import { NzSelectComponent } from 'ng-zorro-antd/select';
import { Observable, Observer } from 'rxjs';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { Model } from '@oam-kit/utility/model';

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
          <nz-form-control [nzSm]="13" [nzErrorTip]="serverAddrErrorTpl">
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
              <p data-test="server-addr-validation-alert">
                Can't connect to {{ form.value.serverAddr }}, please make sure it is working.
              </p>
            </ng-template>
            <ng-template #dropdownRender>
              <nz-divider></nz-divider>
              <div class="dropdown-render__containner">
                <input #inputElement data-test="new-server-addr-input" nz-input type="text" />
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
                #localPathInput
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
          <nz-form-control [nzSm]="13" [nzErrorTip]="remotePathErrorTpl">
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
              <p data-test="remote-project-path-validation-alert">
                {{ form.value.remotePath }} does not exist in the {{ form.value.serverAddr }}
              </p>
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
          (click)="toSave()"
          [disabled]="shouldDisableSaveButton()"
        >
          Save
        </button>
        <button nz-button data-test="delete-project-button" class="dialog_btn" *ngIf="isEdit" nzType="danger" (click)="toDelete()">
          Delete
        </button>
        <button nz-button class="dialog_btn" (click)="toClose()">Close</button>
      </div>
    </div>
  `,
})
export class ProjectSettingComponent implements OnInit {
  @Input() project: Project = {
    name: null,
    serverAddr: null,
    localPath: null,
    remotePath: null,
  };
  @Input() isEdit: boolean;

  @ViewChild(NzSelectComponent) selectComp: NzSelectComponent;

  public form: FormGroup;
  public serverList: string[];
  public gModel: Model<GeneralModel>;

  serverAddrValidator = (control: FormControl) => {
    const serverAddr = control.value;
    return new Observable((observer: Observer<ValidationErrors | null>) => {
      if (serverAddr && this.project.serverAddr !== serverAddr) {
        this.ipcService
          .send(IpcChannel.SERVER_CHECK_REQ, { responseChannel: IpcChannel.SERVER_CHECK_RES, data: serverAddr })
          .then((res) => {
            if (res.isSuccessed && !!res.data) {
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
    const remotePath = control.value;
    return new Observable((observer: Observer<ValidationErrors | null>) => {
      if (remotePath && this.project.remotePath !== remotePath) {
        this.ipcService
          .send(IpcChannel.SERVER_DIRECTORY_CHECK_REQ, {
            responseChannel: IpcChannel.SERVER_DIRECTORY_CHECK_RES,
            data: { serverAddr: this.form.value.serverAddr, directory: remotePath },
          })
          .then((res) => {
            if (res.isSuccessed && !!res.data) {
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

  constructor(
    private modal: NzModalRef,
    private fb: FormBuilder,
    private notification: NzNotificationService,
    private store: StoreService,
    private ipcService: IpcService
  ) {}

  ngOnInit() {
    this.gModel = this.store.getModel<GeneralModel>(MODEL_NAME.GENERAL);
    this.gModel.subscribe<string[]>('serverList', (data) => {
      this.serverList = data;
    });
    this.form = this.fb.group({
      name: [this.project.name, [Validators.required]],
      serverAddr: [this.project.serverAddr, [Validators.required], [this.serverAddrValidator]],
      localPath: [this.project.localPath, [Validators.required]],
      remotePath: [this.project.remotePath, [Validators.required], [this.remotePathValidator]],
    });
  }

  public toSave(): void {
    this.modal.close({
      action: DialogAction.SAVE,
      content: this.form.value,
    });
    this.notification.create('success', 'Success', '', { nzPlacement: 'bottomRight', nzDuration: 1000 });
  }

  public toDelete(): void {
    this.modal.close({
      action: DialogAction.DELETE,
      content: this.form.value,
    });
  }

  public toClose(): void {
    this.modal.close({
      action: DialogAction.CANCEL,
    });
  }

  public onAddServer(value: string) {
    this.gModel.set('serverList', (draft) => {
      draft.push(value);
    });
  }

  public shouldDisableSaveButton() {
    return !(this.form.valid && this.isDirty());
  }

  public onLocalPathChange(value: string) {
    this.form.controls.localPath.setValue(value);
  }

  private isDirty() {
    for (const key in this.project) {
      if (this.form?.value[key] !== this.project[key]) {
        return true;
      }
    }
    return false;
  }
}

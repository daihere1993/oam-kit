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
            <input name="name" nz-input formControlName="name" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="8" nzRequired nzFor="serverAddr">Linsee/EECloud address</nz-form-label>
          <nz-form-control [nzSm]="13" [nzErrorTip]="serverAddrErrorTpl">
            <nz-select nzShowSearch nzAllowClear formControlName="serverAddr" [nzDropdownRender]="dropdownRender">
              <nz-option *ngFor="let server of serverList" [nzLabel]="server" [nzValue]="server"></nz-option>
            </nz-select>
            <ng-template #serverAddrErrorTpl let-control>
              <p class="server-validation__allert">
                Can't connect to {{ form.value.serverAddr }}, please make sure it is working.
              </p>
            </ng-template>
            <ng-template #dropdownRender>
              <nz-divider></nz-divider>
              <div class="dropdown-render__containner">
                <input #inputElement nz-input type="text" />
                <a class="dropdown-render__button" (click)="onAddServer(inputElement.value)">
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
                formControlName="localPath"
                nz-tooltip
                nzTooltipTrigger="focus"
                nzTooltipPlacement="topLeft"
              />
            </nz-input-group>
            <ng-template #folderSelector>
              <app-path-field [value]="project.localPath"></app-path-field>
            </ng-template>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="8" nzRequired nzFor="remotePath">Remote project path</nz-form-label>
          <nz-form-control [nzSm]="13" [nzErrorTip]="remotePathErrorTpl">
            <input
              name="remotePath"
              nz-input
              formControlName="remotePath"
              nz-tooltip
              nzTooltipTrigger="focus"
              nzTooltipPlacement="topLeft"
            />
            <ng-template #remotePathErrorTpl let-control>
              <p class="remote-path-validation__allert">
                {{ form.value.remotePath }} does not exist in the {{ form.value.serverAddr }}
              </p>
            </ng-template>
          </nz-form-control>
        </nz-form-item>
      </form>

      <div *nzModalFooter>
        <button nz-button data-btn-type="save" class="dialog_btn" [disabled]="!form.valid" nzType="primary" (click)="toSave()">
          Save
        </button>
        <button nz-button class="dialog_btn" *ngIf="isEdit" nzType="danger" (click)="toDelete()">Delete</button>
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
    const server = control.value;
    return new Observable((observer: Observer<ValidationErrors | null>) => {
      this.ipcService
        .send(IpcChannel.SERVER_CHECK_REQ, { responseChannel: IpcChannel.SERVER_CHECK_RES, data: server })
        .then((res) => {
          if (res.isSuccessed && !!res.data) {
            observer.next(null);
          } else {
            observer.next({ error: true });
          }
          observer.complete();
        });
    });
  };

  remotePathValidate = (control: FormControl) => {
    const remotePath = control.value;
    return new Observable((observer: Observer<ValidationErrors | null>) => {
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
      remotePath: [this.project.remotePath, [Validators.required], [this.remotePathValidate]],
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
      draft.add(value);
    });
  }
}

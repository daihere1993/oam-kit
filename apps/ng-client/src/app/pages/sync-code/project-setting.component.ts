import { Component, Input } from '@angular/core';
import { Project } from '@oam-kit/utility/types';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

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
          <nz-form-control [nzSm]="13">
            <input name="serverAddr" nz-input formControlName="serverAddr" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="8" nzRequired nzFor="localPath">Local project path</nz-form-label>
          <nz-form-control [nzSm]="13">
            <nz-input-group [nzSuffix]="folderSelector">
              <input name="localPath" nz-input formControlName="localPath" />
            </nz-input-group>
            <ng-template #folderSelector>
              <app-path-field [value]="project.localPath"></app-path-field>
            </ng-template>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="8" nzRequired nzFor="remotePath">Remote project path</nz-form-label>
          <nz-form-control [nzSm]="13">
            <input name="remotePath" nz-input formControlName="remotePath" />
          </nz-form-control>
        </nz-form-item>
      </form>

      <div *nzModalFooter>
        <button nz-button class="dialog_btn" [disabled]="form.invalid" nzType="primary" (click)="toSave()">Save</button>
        <button nz-button class="dialog_btn" *ngIf="isEdit" nzType="danger" (click)="toDelete()">Delete</button>
        <button nz-button class="dialog_btn" (click)="toClose()">Close</button>
      </div>
    </div>
  `,
})
export class ProjectSettingComponent {
  @Input() project: Project = {
    name: null,
    serverAddr: null,
    localPath: null,
    remotePath: null,
  };
  @Input() isEdit: boolean;

  public form: FormGroup;

  constructor(private modal: NzModalRef, private fb: FormBuilder, private notification: NzNotificationService) {
    this.form = this.fb.group({
      name: [this.project.name, [Validators.required]],
      serverAddr: [this.project.serverAddr, [Validators.required]],
      localPath: [this.project.localPath, [Validators.required]],
      remotePath: [this.project.remotePath, [Validators.required]],
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
}

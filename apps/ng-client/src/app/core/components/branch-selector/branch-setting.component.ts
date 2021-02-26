import { Component, OnInit } from '@angular/core';
import { Branch } from '@oam-kit/store/types';
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
  content?: Branch;
}

@Component({
  selector: 'oam-branch-setting-page',
  template: `
    <style>
      .container .ant-form-item:last-child {
        margin: 0;
      }
    </style>
    <div class="container">
      <form nz-from [formGroup]="validateForm">
        <nz-form-item>
          <nz-form-label [nzSm]="8" nzRequired nzFor="branchName">Branch Name</nz-form-label>
          <nz-form-control [nzSm]="13">
            <input name="branchName" nz-input formControlName="branchName" [(ngModel)]="branch.name" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="8" nzRequired nzFor="target">MOAM DIR of server</nz-form-label>
          <nz-form-control [nzSm]="13">
            <input name="target" nz-input formControlName="target" [(ngModel)]="branch.directory.target" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzSm]="8" nzRequired nzFor="source">MOAM DIR of PC</nz-form-label>
          <nz-form-control [nzSm]="13">
            <nz-input-group [nzSuffix]="folderSelector">
              <input name="source" nz-input formControlName="source" [(ngModel)]="branch.directory.source" />
            </nz-input-group>
            <ng-template #folderSelector>
              <oam-path-field [(value)]="branch.directory.source"></oam-path-field>
            </ng-template>
          </nz-form-control>
        </nz-form-item>
      </form>

      <div *nzModalFooter>
        <button
          nz-button
          class="dialog_btn"
          [disabled]="validateForm.invalid"
          nzType="primary"
          (click)="toSave()"
        >
          Save
        </button>
        <button nz-button class="dialog_btn" *ngIf="isEdit" nzType="danger" (click)="toDelete()">
          Delete
        </button>
        <button nz-button class="dialog_btn" (click)="toClose()">Close</button>
      </div>
    </div>
  `,
})
export class BranchSettingComponent implements OnInit {
  public validateForm: FormGroup;

  public branch: Branch = {
    name: '',
    directory: { source: '', target: '' },
  };

  public isEdit: boolean;

  constructor(
    private modal: NzModalRef,
    private fb: FormBuilder,
    private notification: NzNotificationService
  ) {}

  ngOnInit(): void {
    this.validateForm = this.fb.group({
      branchName: [null, [Validators.required]],
      target: [null, [Validators.required]],
      source: [null, [Validators.required]],
    });
  }

  public toSave(): void {
    this.modal.close({
      action: DialogAction.SAVE,
      content: this.branch,
    });
    this.notification.create('success', 'Success', '', { nzPlacement: 'bottomRight', nzDuration: 1000 });
  }

  public toDelete(): void {
    this.modal.close({
      action: DialogAction.DELETE,
      content: this.branch,
    });
  }

  public toClose(): void {
    this.modal.close({
      action: DialogAction.CANCEL,
    });
  }
}

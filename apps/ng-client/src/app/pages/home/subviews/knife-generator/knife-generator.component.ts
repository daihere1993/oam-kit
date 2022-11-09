import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { IpcChannel, KnifeGeneratorReqData, KnifeGeneratorResData } from '@oam-kit/utility/types';

enum AlertType {
  SUCCESS = 'success',
  ERROR = 'error',
}

class AlertInfo {
  show: boolean;
  type: AlertType;
  message: string;

  constructor(show: boolean, type: AlertType, message: string) {
    this.show = show;
    this.type = type;
    this.message = message;
  }
}

@Component({
  selector: 'app-knife-generator',
  template: `
    <style>
      nz-form-item {
        width: 340px;
      }
    </style>

    <form nz-form [formGroup]="form" nzLayout="vertical">
      <nz-form-item>
        <nz-form-label nzFor="targetProject" nzRequired>Target Project</nz-form-label>
        <nz-form-control>
          <nz-input-group [nzSuffix]="folderSelector" nzSize="small">
            <input
              nz-input
              name="targetProject"
              data-test="target-project-path-input"
              formControlName="targetProject"
              nz-tooltip
              nzTooltipTrigger="focus"
              nzTooltipPlacement="topLeft"
            />
          </nz-input-group>
          <ng-template #folderSelector>
            <app-path-field [value]="form.value.targetProject" (valueChange)="onTargetProjectPathChange($event)"></app-path-field>
          </ng-template>
        </nz-form-control>
      </nz-form-item>
      <nz-form-item>
        <nz-form-label nzFor="revision" nzRequired>Revision</nz-form-label>
        <nz-form-control>
          <input nz-input name="revision" data-test="knife-revision" formControlName="revision" nzSize="small" />
        </nz-form-control>
      </nz-form-item>
      <nz-form-item style="width: 100%;" *ngIf="alertInfo.show">
        <nz-form-control>
          <nz-alert nzCloseable nzShowIcon [nzType]="alertInfo.type" [nzMessage]="alertInfo.message" (nzOnClose)="afterClose()"></nz-alert>
        </nz-form-control>
      </nz-form-item>
      <nz-form-item nz-row>
        <nz-form-control>
          <button nz-button [nzLoading]="ongoing" nzType="primary" (click)="start()">Start</button>
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
  styles: [],
})
export class KnifeGeneratorComponent implements OnInit {
  form: FormGroup;
  ongoing = false;
  alertInfo = new AlertInfo(null, null, null);
  constructor(private fb: FormBuilder, private ipcService: IpcService) {}

  ngOnInit() {
    this.form = this.fb.group({
      targetProject: ['', [Validators.required]],
      revision: ['', [Validators.required]],
    });
  }

  onTargetProjectPathChange(path: string) {
    this.form.controls.targetProject.setValue(path);
  }

  async start() {
    this.ongoing = true;
    this.alertInfo.show = false;
    const res = await this.ipcService.send<KnifeGeneratorReqData, KnifeGeneratorResData>(IpcChannel.KNIFE_GENERATOR, {
      projectPath: this.form.get('targetProject').value,
      targetVersion: this.form.get('revision').value,
    });
    if (res.isOk) {
      this.alertInfo.type = AlertType.SUCCESS;
      this.alertInfo.message = `You can find zip file from: ${res.data.knifePath}`;
    } else {
      this.alertInfo.type = AlertType.ERROR;
      this.alertInfo.message = res.error.message;
    }
    this.alertInfo.show = true;
    this.ongoing = false;
  }

  afterClose() {
    this.alertInfo.show = false;
  }
}

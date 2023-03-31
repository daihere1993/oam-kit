import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IpcService } from '../../../../core/services/ipc.service';
import { IpcResponseCode, SyncCode } from '@oam-kit/shared-interfaces';
import { StoreService } from '@ng-client/core/services/store.service';

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
  styleUrls: ['./knife-generator.component.scss'],
  template: `
    <nz-spin [nzSpinning]="onLoading">
      <div class="container">
        <p class="main-icon-wrapper">
          <span nz-icon nzType="file-zip" nzTheme="outline"></span>
        </p>

        <form nz-form [formGroup]="form" spellcheck="false">
          <nz-form-item>
            <nz-form-label nzFor="targetProject" nzSpan="6" nzRequired>Target Project</nz-form-label>
            <nz-form-control nzSpan="16">
              <nz-input-group [nzSuffix]="folderSelector">
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
            <nz-form-label nzFor="revision" nzSpan="6" nzRequired>Revision</nz-form-label>
            <nz-form-control nzSpan="14">
              <input nz-input name="revision" data-test="knife-revision" formControlName="revision" />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item *ngIf="alertInfo.show">
            <nz-form-control nzSpan="20" nzOffset="2">
              <nz-alert nzCloseable nzShowIcon [nzType]="alertInfo.type" [nzMessage]="alertInfo.message" (nzOnClose)="afterClose()"></nz-alert>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item nz-row>
            <nz-form-control nzSpan="12" nzOffset="6">
              <button nz-button nzType="primary" (click)="start()">Start</button>
            </nz-form-control>
          </nz-form-item>
        </form>

        <p class="feat-hint">Please make sure the revision you input is exactly same of the build you knife based on.</p>
      </div>
    </nz-spin>
    `,
  styles: [],
})
export class KnifeGeneratorComponent implements OnInit {
  form: FormGroup;
  onLoading = false;
  alertInfo = new AlertInfo(null, null, null);
  constructor(private fb: FormBuilder, private ipcService: IpcService, private _store: StoreService) {}

  ngOnInit() {
    const projects = this._store.getModel<SyncCode>('syncCode').get('projects');
    const defaultProjectPath = projects.length > 0 ? projects[0].localPath : '';
    this.form = this.fb.group({
      targetProject: [defaultProjectPath, [Validators.required]],
      revision: ['', [Validators.required]],
    });
  }

  onTargetProjectPathChange(path: string) {
    this.form.controls['targetProject'].setValue(path);
  }

  async start() {
    this.onLoading = true;
    this.alertInfo.show = false;
    const res = await this.ipcService.send('/knife_generator', {
      projectPath: this.form.get('targetProject').value,
      targetVersion: this.form.get('revision').value,
    });
    if (res.code === IpcResponseCode.success) {
      this.alertInfo.type = AlertType.SUCCESS;
      this.alertInfo.message = `You can find zip file from: ${res.data.knifePath}`;
    } else if (res.code === IpcResponseCode.failed) {
      this.alertInfo.type = AlertType.ERROR;
      this.alertInfo.message = res.description
    }
    this.alertInfo.show = true;
    this.onLoading = false;
  }

  afterClose() {
    this.alertInfo.show = false;
  }
}
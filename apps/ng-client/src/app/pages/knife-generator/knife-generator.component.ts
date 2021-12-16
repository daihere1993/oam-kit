import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { IpcChannel, KnifeGeneratorReqData } from '@oam-kit/utility/types';

@Component({
  selector: 'app-knife-generator',
  template: `
    <form nz-form [formGroup]="form">
      <nz-form-item>
        <nz-form-label nzFor="targetProject" [nzSm]="8" nzRequired>Target Project</nz-form-label>
        <nz-form-control [nzSm]="10">
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
        <nz-form-label nzFor="revision" nzSpan="8" nzRequired>Revision</nz-form-label>
        <nz-form-control nzSpan="10">
          <input nz-input name="revision" data-test="knife-revision" formControlName="revision" />
        </nz-form-control>
      </nz-form-item>
      <nz-form-item nz-row>
        <nz-form-control nzSpan="10" nzOffset="8">
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
    const res = await this.ipcService.send<KnifeGeneratorReqData>(IpcChannel.KNIFE_GENERATOR, {
      projectPath: this.form.get('targetProject').value,
      targetVersion: this.form.get('revision').value,
    });
    console.log(res.data);
    this.ongoing = false;
  }
}

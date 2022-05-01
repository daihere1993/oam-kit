import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { GeneralModel, Project, SyncCodeReqData, SyncCodeResData } from '@oam-kit/utility/types';
import { IpcChannel, SyncCodeStep } from '@oam-kit/utility/types';
import { IpcService } from '../../../../core/services/ipc.service';
import { Stepper, StepStatus, StepperStatus, Step } from '@oam-kit/utility';
import { StoreService } from '@ng-client/core/services/store.service';
import { MODEL_NAME } from '@oam-kit/utility/overall-config';
import { NotificationService } from '@ng-client/core/services/notification.service';

@Component({
  selector: 'app-sync-code',
  template: `
    <div class="container">
      <div class="sync_form">
        <app-project-selector (projectChange)="onSelectChange($event)"></app-project-selector>

        <div class="sync_containner">
          <button
            data-test="sync-code-button"
            class="sync_button"
            nz-button
            [disabled]="!currentProject"
            nzType="primary"
            [nzLoading]="isSyncOnGoing"
            (click)="sync()"
          >
            {{ isSyncOnGoing ? 'On Going' : 'Sync Code' }}
          </button>
        </div>
      </div>

      <nz-steps nzDirection="vertical" style="margin-top: 30px;" nzSize="small">
        <nz-step
          *ngFor="let step of syncStepper.steps; trackBy: trackFn"
          [nzTitle]="step.title"
          [nzStatus]="step.status"
          [nzIcon]="step.status === 'process' ? 'loading' : null"
          [nzDescription]="step.description"
        ></nz-step>
      </nz-steps>

      <p *ngIf="lastSyncDate" class="last_sync_date">Last sync: {{ lastSyncDate | date: 'short' }}</p>
    </div>
  `,
  styleUrls: ['./sync-code.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncCodeComponent implements OnInit, OnDestroy {
  public syncStepper: Stepper;
  public lastSyncDate: Date;
  public get isSyncOnGoing(): boolean {
    return this.syncStepper.status === StepperStatus.ONGOING;
  }

  public currentProject: Project;

  private get isReady(): boolean {
    if (!this.isProfileReady()) {
      this.alertMessage = 'Please fill corresponding setting.';
      return false;
    } else if (!this.currentProject) {
      this.alertMessage = 'Please add a project first.';
      return false;
    } else if (this.isSyncOnGoing) {
      this.alertMessage = 'Sync is on going.';
      return false;
    }
    return true;
  }

  private set alertMessage(message: string) {
    if (message) {
      this.notification.error('Error', message);
    }
  }

  constructor(
    private ipcService: IpcService,
    private notification: NotificationService,
    private cd: ChangeDetectorRef,
    private store: StoreService
  ) {}

  ngOnInit(): void {
    // To cover the scenario of entering a keyboard to sync code.
    this.ipcService.on<void>(IpcChannel.SYNC_CODE_FROM_MAIN, this.sync.bind(this));
    this.initStepper();
  }

  ngOnDestroy(): void {
    this.ipcService.destroy();
  }

  public sync() {
    if (this.isReady) {
      this.syncStepper.start();

      this.ipcService
        .send$<SyncCodeReqData, SyncCodeResData>(IpcChannel.SYNC_CODE, { project: this.currentProject })
        .subscribe((response) => {
          this.lastSyncDate = new Date();

          if (response.isOk) {
            this.syncStepper.setStatusForSingleStep(response.data.step, StepStatus.FINISHED);
          } else {
            const { error } = response;
            this.syncStepper.errorInfo = error.message;
            this.syncStepper.setStatusForSingleStep(response.data.step, StepStatus.FAILED);
            this.alertMessage = error.message;
          }
          this.cd.markForCheck();
        });
    }
  }

  public onSelectChange(project: Project) {
    this.currentProject = project;
  }

  private initStepper(): void {
    this.syncStepper = new Stepper([
      { title: 'Step 1', description: 'Connect to remote.', type: SyncCodeStep.CONNECT_TO_SERVER },
      {
        title: 'Step 2',
        description: 'Create diff based on local project.',
        type: SyncCodeStep.CREATE_DIFF,
      },
      { title: 'Step 3', description: 'Upload diff into remote.', type: SyncCodeStep.UPLOAD_DIFF },
      {
        title: 'Step 4',
        description: 'Apply diff to remote project.',
        type: SyncCodeStep.APPLY_DIFF,
      },
    ]);
  }

  public trackFn(index: number, item: Step) {
    return item.index;
  }

  private isProfileReady() {
    const gModel = this.store.getModel<GeneralModel>(MODEL_NAME.GENERAL);
    const profile = gModel.get('profile');
    return profile.nsbAccount.password && profile.nsbAccount.username;
  }
}

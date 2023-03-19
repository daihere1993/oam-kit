import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Step, Stepper, StepperStatus, StepStatus } from './stepper';
import { Preferences, Project } from '@oam-kit/shared-interfaces';
import { IpcResponseCode, SyncCodeStep } from '@oam-kit/shared-interfaces';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { StoreService } from '@ng-client/core/services/store.service';
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
    this.initStepper();
  }

  ngOnDestroy(): void {
    this.ipcService.destroy();
  }

  public sync() {
    if (this.isReady) {
      this.syncStepper.start();

      this.ipcService
        .send$('/sync_code', { project: this.currentProject })
        .subscribe((response) => {
          this.lastSyncDate = new Date();

          if (response.code === IpcResponseCode.success) {
            this.syncStepper.setStatusForSingleStep(response.data.step, StepStatus.FINISHED);
          } else if (response.code === IpcResponseCode.failed) {
            const { description } = response;
            this.syncStepper.errorInfo = description;
            this.syncStepper.setStatusForSingleStep(response.data.step, StepStatus.FAILED);
            this.alertMessage = description;
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
      { title: 'Step 3', description: 'Analyze diff.', type: SyncCodeStep.DIFF_ANALYZE },
      { title: 'Step 4', description: 'Clean up remote workspace.', type: SyncCodeStep.CLEAN_UP },
      { title: 'Step 5', description: 'Upload diff into remote.', type: SyncCodeStep.UPLOAD_DIFF },
      {
        title: 'Step 6',
        description: 'Apply diff to remote project.',
        type: SyncCodeStep.APPLY_DIFF,
      },
    ]);
  }

  public trackFn(index: number, item: Step) {
    return item.index;
  }

  private isProfileReady() {
    const pModel = this.store.getModel<Preferences>('preferences');
    const profile = pModel.get('profile');
    return profile.nsbAccount.password && profile.nsbAccount.username;
  }
}
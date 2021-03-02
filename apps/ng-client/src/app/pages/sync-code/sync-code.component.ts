import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Branch } from '@oam-kit/store/types';
import { SyncCodeStep } from '@oam-kit/sync-code';
import { IpcChannel } from '@oam-kit/ipc';
import { IpcService,  } from '../../core/services/ipc.service';
import { Stepper, StepStatus, StepperStatus } from '@oam-kit/utility';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-sync-code',
  template: `
    <div class="container">
      <div class="sync_form">
        <app-branch-selector (branchChange)="onBranchChange($event)"></app-branch-selector>

        <div class="sync_containner">
          <button
            data-btn-type="sync"
            class="sync_button"
            nz-button
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
          *ngFor="let step of syncStepper.steps"
          [nzTitle]="step.title"
          [nzStatus]="step.status"
          [nzIcon]="step.status === 'process' ? 'loading' : null"
          [nzDescription]="step.description"
        ></nz-step>
      </nz-steps>

      <p *ngIf="lastSyncDate" class="last_sync_date">Last sync: {{ lastSyncDate | date:'short' }}</p>
    </div>
  `,
  styleUrls: ['./sync-code.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncCodeComponent implements OnInit, OnDestroy {
  private currentBranch: Branch;
  public syncStepper: Stepper;
  public lastSyncDate: Date;
  public get isSyncOnGoing(): boolean {
    return this.syncStepper.status === StepperStatus.ONGOING
  }

  private get isReady(): boolean {
    if (!this.profileService.isReady()) {
      this.alertMessage = 'Please fill corresponding setting.';
      return false;
    } else if (!this.currentBranch) {
      this.alertMessage = 'Please add a branch first.';
      return false;
    } else if (this.isSyncOnGoing) {
      this.alertMessage = 'Sync is on going.';
      return false;
    }
    return true;
  }

  private set alertMessage(message: string) {
    if (message) {
      this.notification.create('error', 'Error', message, { nzPlacement: 'bottomRight' });
    }
  }

  constructor(
    private ipcService: IpcService,
    private profileService: ProfileService,
    private notification: NzNotificationService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // To cover the scenario of entering a keyboard to sync code.
    this.ipcService.on<void>(IpcChannel.SYNC_CODE_FROM_MAIN_REQ, this.sync.bind(this));
    this.initStepper();
  }

  ngOnDestroy(): void {
    this.ipcService.destroy();
  }

  public sync() {
    if (this.isReady) {
      this.syncStepper.start();

      this.ipcService.send$<Branch, SyncCodeStep>(IpcChannel.SYNC_CODE_REQ, {
        data: this.currentBranch,
        responseChannel: IpcChannel.SYNC_CODE_RES
      }).subscribe(response => {
        this.lastSyncDate = new Date();
  
        if (response.isSuccessed) {
          this.syncStepper.setStatusForSingleStep(response.data, StepStatus.FINISHED);
        } else {
          const { error } = response;
          this.syncStepper.errorInfo = error.message;
          this.syncStepper.setStatusForSingleStep(error.name, StepStatus.FAILED);
          this.alertMessage = error.message;
        }
        this.cd.markForCheck();
      });
    }
  }

  public onBranchChange(branch: Branch) {
    this.currentBranch = branch;
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
}

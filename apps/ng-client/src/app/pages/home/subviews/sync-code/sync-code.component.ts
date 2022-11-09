import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { SettingsModel, Project, SyncCodeReqData, SyncCodeResData, MODEL_NAME } from '@oam-kit/utility/types';
import { IpcChannel, SyncCodeStep } from '@oam-kit/utility/types';
import { IpcService } from '../../../../core/services/ipc.service';
import { Stepper, StepStatus, StepperStatus, Step } from '@oam-kit/utility';
import { StoreService } from '@ng-client/core/services/store.service';
import { NotificationService } from '@ng-client/core/services/notification.service';

@Component({
  selector: 'app-sync-code',
  template: `
    <div class="container">
      <nz-space nzDirection="horizontal">
        <app-project-selector *nzSpaceItem (projectChange)="onSelectChange($event)"></app-project-selector>
        <button
          data-test="sync-code-button"
          class="sync_button"
          nz-button
          [disabled]="!currentProject"
          nzType="primary"
          [nzLoading]="isSyncOnGoing"
          (click)="sync()"
          *nzSpaceItem
        >
          {{ isSyncOnGoing ? 'On Going' : 'Sync Code' }}
        </button>
      </nz-space>
    </div>
  `,
})
export class SyncCodeComponent implements OnInit, OnDestroy {
  public isSyncOnGoing = false;

  public currentProject: Project;

  private get isReady(): boolean {
    if (!this.isauthReady()) {
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
  }

  ngOnDestroy(): void {
    this.ipcService.destroy();
  }

  public async sync() {
    if (this.isReady) {
      this.isSyncOnGoing = true;
      this.ipcService
        .send$<SyncCodeReqData, SyncCodeResData>(IpcChannel.SYNC_CODE, { project: this.currentProject })
        .subscribe((res) => {
          if (res.isOk) {
            console.log(1);
          } else {
            console.log(2);
          }
          if (res.data.step === SyncCodeStep.APPLY_DIFF) {
            this.isSyncOnGoing = false;
          }
          this.cd.markForCheck();
        });
    }
  }

  public onSelectChange(project: Project) {
    this.currentProject = project;
  }

  public trackFn(index: number, item: Step) {
    return item.index;
  }

  private isauthReady() {
    const settingsModel = this.store.getModel<SettingsModel>(MODEL_NAME.SETTINGS);
    const auth = settingsModel.get('auth');
    return auth.nsbAccount.password && auth.nsbAccount.username;
  }
}

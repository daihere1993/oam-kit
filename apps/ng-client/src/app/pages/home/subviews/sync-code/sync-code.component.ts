import { Component, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Preferences, Project, SyncCode } from '@oam-kit/shared-interfaces';
import { IpcResponseCode } from '@oam-kit/shared-interfaces';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { StoreService } from '@ng-client/core/services/store.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DialogAction, DialogRes, ProjectSettingComponent } from './project-setting.component';

@Component({
  selector: 'app-sync-code',
  template: `
    <nz-spin [nzSpinning]="onLoading" class="spin-wrapper">
      <div class="container">
        <p class="main-icon-wrapper">
          <span nz-icon nzType="cloud-sync" nzTheme="outline"></span>
        </p>

        <ng-template #sshConfigurationWrapper>
          <app-ssh-config-view (loading)="onSshConfigViewLoadingStatusChanged($event)"></app-ssh-config-view>
        </ng-template>

        <div class="feat-wrapper" *ngIf="isSSHConfigured; else sshConfigurationWrapper">
        <nz-input-number style="width:50px;" [(ngModel)]="diffIndex" [nzMin]="1" [nzMax]="10" [nzStep]="1"></nz-input-number>

          <app-project-selector (projectChange)="onSelectChange($event)"></app-project-selector>

          <button nz-button nzType="primary" (click)="sync()">
            <span nz-icon nzType="sync"></span>
          </button>
        </div>
        <p class="feat-hint">{{ this.hintMessage }}</p>
      </div>
    </nz-spin>
  `,
  styleUrls: ['./sync-code.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncCodeComponent implements OnDestroy {
  public currentProject: Project;
  public isSSHConfigured = false;
  public onLoading = false;
  public lastSyncDate: Date;
  public diffIndex = 1;

  public get hintMessage() {
    return this.isSSHConfigured ? this._featHints.sycnCode : this._featHints.sshConfig;
  }

  private _featHints = {
    sshConfig: 'Please configure SSH private key for you linsee/eecloud server first.',
    sycnCode: 'Select a project you are working on, then click button to sync code.'
  }

  private get isReady(): boolean {
    if (!this.currentProject) {
      this._message.warning('Please add a project first.');
      return false;
    }
    return true;
  }

  constructor(
    private _cd: ChangeDetectorRef,
    private _ipcService: IpcService,
    private _message: NzMessageService,
    private _store: StoreService,
    private _modalService: NzModalService,
  ) {
    this._store.getModel<Preferences>('preferences').subscribe('ssh', (sshInfo: { username: string, privateKeyPath: string }) => {
      this.isSSHConfigured = !!sshInfo.username && !!sshInfo.privateKeyPath;
      this._cd.markForCheck();
      const projects = this._store.getModel<SyncCode>('syncCode').get('projects');
      if (this.isSSHConfigured && projects.length === 0) {
        this.displayModalToAddFirstProject();
      }
    });
  }

  ngOnDestroy(): void {
    this._ipcService.destroy();
  }

  public async sync() {
    if (this.isReady) {
      this.onLoading = true;
      const res = await this._ipcService.send('/sync_code', { project: this.currentProject, diffIndex: this.diffIndex });
      if (res.code === IpcResponseCode.success) {
        this._message.success('Sync code successfully.');
      } else {
        this._message.error(`Sync code failed with error: ${res.description}`);
      }

      this.onLoading = false;
      this._cd.markForCheck();
    }
  }

  public onSelectChange(project: Project) {
    this.currentProject = project;
  }

  public onSshConfigViewLoadingStatusChanged(value: boolean) {
    this.onLoading = value;
  }

  private displayModalToAddFirstProject() {
    const model = this._store.getModel<SyncCode>('syncCode');
    this._modalService
      .create({
        nzWidth: 600,
        nzTitle: 'New project',
        nzContent: ProjectSettingComponent
      })
      .afterClose.subscribe(({ content, action }: DialogRes) => {
        if (action === DialogAction.SAVE) {
          model.set('projects', (draft) => {
            draft.push(content);
          });
        }
      });
  }
}
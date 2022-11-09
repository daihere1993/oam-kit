import { Component } from '@angular/core';
import { StoreService } from '@ng-client/core/services/store.service';
import { MODEL_NAME, SettingsModel } from '@oam-kit/utility/types';
import { NzModalService } from 'ng-zorro-antd/modal';
import { SettingsComponent } from './subviews/settings/settings.component';

interface Menu {
  name: string;
  icon: string;
  link: string;
  isCustomIcon: boolean;
}

@Component({
  selector: 'app-root',
  template: `
    <style>
      .container {
        height: 100%;
        width: 100%;
        padding: 10px 20px 0 20px;
        display:  flex;
      }
      .body {
        flex-grow: 1;
      }
      section:not(:last-of-type) {
        margin-bottom: 12px;
      }
      nz-sider {
        background: #fff;
        color: #000;
        line-height: 120px;
      }
      .anchor-wrapper {
        margin-left: 6px;
      }
      ::ng-deep .ant-anchor-ink::before {
        background-color: #1890ffe0;
      }
      nz-footer {
        padding: 0;
        margin-top: 10px;
      }
      .settings-btn {
        position: absolute;
        bottom: 20px;
        right: 20px;
      }
      .settings-btn span {
        font-size: 24px;
      }
    </style>

    <nz-layout style="height: 100%">
      <nz-layout>
        <nz-content class="container">
          <div class="body">
            <section id="sync-code">
              <nz-card nzTitle="Code Sychronization">
                <app-sync-code></app-sync-code>
              </nz-card>
            </section>
            <section id="knife-generator">
              <nz-card nzTitle="Knife generator">
                <app-knife-generator></app-knife-generator>
              </nz-card>
            </section>
          </div>
        </nz-content>
      </nz-layout>

      <button class="settings-btn" nzType="link" nz-button nzShape="circle" nzSize="large" (click)="toSettings()">
        <span nz-icon nzType="setting" nzTheme="outline"></span>
      </button>

      <nz-modal
        [(nzVisible)]="isShowSettings"
        [nzTitle]="'Settings'"
        [nzContent]="modalContent"
        [nzFooter]="null"
        [nzWidth]="600"
        [nzCentered]="'true'"
        (nzOnCancel)="handleCancel()"
      >
        <ng-template #modalContent>
          <app-settings></app-settings>
        </ng-template>
      </nz-modal>
    </nz-layout>
  `,
})
export class HomeComponent {
  isShowSettings = false;
  settings: SettingsModel;

  constructor(private store: StoreService, private modalService: NzModalService) {
    const settingsModel = this.store.getModel<SettingsModel>(MODEL_NAME.SETTINGS);
    this.settings = settingsModel.data;
  }

  toSettings() {
    // this.isShowSettings = true;
    this.modalService.create({
        nzWidth: 600,
        nzTitle: 'Settings',
        nzContent: SettingsComponent,
        nzCentered: true,
      });
  }

  handleCancel() {
    this.isShowSettings = false;
  }

  saveSettings() {
    
  }
}

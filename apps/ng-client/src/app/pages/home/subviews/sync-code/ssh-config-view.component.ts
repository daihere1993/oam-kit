import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { StoreService } from '@ng-client/core/services/store.service';
import { IpcResponseCode, Preferences } from '@oam-kit/shared-interfaces';
import { promiseTimeout } from '@oam-kit/utility/common';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-ssh-config-view',
  styleUrls: ['./ssh-config-view.component.scss'],
  template: `
    <div class="form-container">
      <form nz-form [formGroup]="form" spellcheck="false">
        <nz-form-item>
          <nz-form-label nzFor="username" nzSpan="8" nzRequired>Username</nz-form-label>
          <nz-form-control nzSpan="8">
            <input nz-input type="text" formControlName="username" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label nzFor="serverAddr" nzSpan="8" nzRequired>Server address</nz-form-label>
          <nz-form-control nzSpan="12">
            <input nz-input name="serverAddr" formControlName="serverAddr" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label nzFor="privateKeyPath" nzSpan="8" nzRequired>Private key path</nz-form-label>
          <nz-form-control nzSpan="12">
            <input nz-input type="text" name="privateKeyPath" formControlName="privateKeyPath" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-control nzSpan="12" nzOffset="8">
            <button nz-button nzType="primary" class="test-btn" [disabled]="!isAllFieldsFilled" (click)="sshServerTest()">Connection test</button>
            <button nz-button nzType="primary" class="save-btn" [disabled]="!(isConnectionTested && !this.form.dirty)" (click)="saveConfig()">Finish</button>
          </nz-form-control>
        </nz-form-item>
      </form>
    </div>
  `
})

export class SshConfigViewComponent {
  @Output() loading = new EventEmitter<boolean>();

  public form: FormGroup;
  public isConnectionTested = false;
  public get isAllFieldsFilled(): boolean {
    return this.form.value.username && this.form.value.serverAddr && this.form.value.privateKeyPath;
  };

  constructor(
    private _ipcService: IpcService,
    private _fb: FormBuilder,
    private _storeService: StoreService,
    private _message: NzMessageService,
    private _cd: ChangeDetectorRef,
  ) {
    this.form = this._fb.group({
      username: '',
      serverAddr: '',
      privateKeyPath: ''
    });
  }

  public async sshServerTest() {
    this.form.markAsPristine();
    const isConnected = await this.isServerConnected(this.form.value.username, this.form.value.serverAddr, this.form.value.privateKeyPath);
    if (isConnected) {
      this.isConnectionTested = true;
      this._message.success(`Connected to ${this.form.value.serverAddr} successfully!!`);
    } else {
      this.isConnectionTested = false;
      this._message.error(`Can not connect to ${this.form.value.serverAddr}, please check if your ssh configuration is correct.`);
    }
    this._cd.markForCheck();
  }

  public async saveConfig() {
    this.loading.emit(true);
    await promiseTimeout(1000);
    this._storeService.getModel<Preferences>('preferences').set('ssh', (draft) => {
      draft.username = this.form.value.username;
      draft.servers.push(this.form.value.serverAddr);
      draft.privateKeyPath = this.form.value.privateKeyPath;
      this.loading.emit(false);
    });
  }

  private async isServerConnected(username: string, serverAddr: string, privateKeyPath: string): Promise<boolean> {
    this.loading.emit(true);
    const res = await this._ipcService.send('/server/check_server_connection_by_private_key', {
      username,
      serverAddr,
      privateKeyPath,
    });

    this.loading.emit(false);
    if (res.code === IpcResponseCode.success) {
      return res.data;
    } else {
      return false;
    }
  }
}
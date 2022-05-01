import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CheckNecessaryCommandsResData, IpcChannel } from '@oam-kit/utility/types';
import { IpcService } from './ipc.service';

@Injectable({ providedIn: 'root' })
export class EnvService {
  private _isCommandsReady = null;

  constructor(private ipcService: IpcService, private router: Router) {}

  public async envChecking() {
    if (!await this.isCommandsReady()) {
      this.router.navigateByUrl('env-checking');
    }
  }

  public async isCommandsReady(recheck = false) {
    if (recheck) {
      this._isCommandsReady = null;
    }

    if (this._isCommandsReady === null) {
      const res = await this.ipcService.send<void, CheckNecessaryCommandsResData>(IpcChannel.CHECK_NECESSARY_COMMANDS);
      this._isCommandsReady = res.isOk && res.data.gitReady && res.data.svnReady;
    }

    return this._isCommandsReady;
  }
}

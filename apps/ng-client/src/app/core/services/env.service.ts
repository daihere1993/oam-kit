import { Injectable } from '@angular/core';
import { IpcService } from './ipc.service';

@Injectable({ providedIn: 'root' })
export class EnvService {
  private _isCommandsReady: boolean = null;

  constructor(private ipcService: IpcService) {}
  public async isCommandsReady(recheck = false) {
    if (recheck) {
      this._isCommandsReady = null;
    }

    if (this._isCommandsReady === null) {
      const res = await this.ipcService.send('/cmds/is_commands_ready');
      this._isCommandsReady = res.data && res.data.gitReady && res.data.svnReady;
    }

    return this._isCommandsReady;
  }
}
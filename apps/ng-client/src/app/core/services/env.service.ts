import { Injectable } from '@angular/core';
import { CheckNecessaryCommandsResData, IpcChannel } from '@oam-kit/utility/types';
import { IpcService } from './ipc.service';

@Injectable({ providedIn: 'root' })
export class EnvService {
  constructor(private ipcService: IpcService) {}

  public async isAllNecessaryCommandsReady() {
    const res = await this.ipcService.send<void, CheckNecessaryCommandsResData>(IpcChannel.CHECK_NECESSARY_COMMANDS);

    return res.isOk && res.data.gitReady && res.data.svnReady;
  }
}

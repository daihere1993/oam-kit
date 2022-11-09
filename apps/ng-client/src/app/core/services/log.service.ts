import { ChangeDetectorRef, Injectable } from '@angular/core';
import { IpcChannel } from '@oam-kit/utility/types';
import { IpcService } from './ipc.service';

@Injectable({ providedIn: 'root' })
export class LogService {
  logs: string[] = [];
  constructor(private ipcService: IpcService) {}

  initialize() {
    this.ipcService.on<string>(IpcChannel.LOG_SYNC, (event, res) => {
      this.logs.push(res.data);
    });
  }
}

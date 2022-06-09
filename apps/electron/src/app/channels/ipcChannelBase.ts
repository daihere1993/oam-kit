import { Logger as Logger_ } from 'winston';
import { IpcChannel, IpcRequest } from '@oam-kit/utility/types';
import { IpcService } from '../utils/ipcService';
import { Store } from '../store';
import { BrowserWindow } from 'electron';
import Logger from '../utils/logger';

export interface IpcChannelHandler {
  name: IpcChannel;
  fn(ipcService: IpcService, req?: IpcRequest<any>): any;
}

export abstract class IpcChannelBase {
  protected store: Store;
  protected mainWindow: BrowserWindow;

  public get logger(): Logger_ {
    // Logger for would not create new Logger instance
    return Logger.for(this.logName);
  }

  abstract logName: string;
  abstract handlers: IpcChannelHandler[];

  constructor(store: Store, mainWindow: BrowserWindow) {
    this.store = store;
    this.mainWindow = mainWindow;
    this.startup();
  }

  protected startup() {}
}

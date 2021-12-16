import { Logger } from 'winston';
import { IpcChannel, IpcRequest } from '@oam-kit/utility/types';
import { IpcService } from '../utils/ipcService';
import { Store } from '../store';
import { BrowserWindow } from 'electron';

export interface IpcChannelHandler {
  name: IpcChannel;
  fn(ipcService: IpcService, req?: IpcRequest<any>): void;
}

export abstract class IpcChannelBase {
  protected store: Store;
  protected mainWindow: BrowserWindow;
  public logger: Logger;
  public handlers: IpcChannelHandler[];

  constructor(store: Store, mainWindow: BrowserWindow) {
    this.store = store;
    this.mainWindow = mainWindow;
    this.startup();
  }

  protected startup() {}
}

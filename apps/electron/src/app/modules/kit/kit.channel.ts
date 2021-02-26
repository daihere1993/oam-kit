// Plase some little gadgets which are worked to client

import { IpcChannelInterface } from '@electron/app/interfaces';
import { IpcChannel, IPCRequest, IPCResponse } from '@oam-kit/ipc';
import { BrowserWindow, dialog, IpcMainEvent } from 'electron';

export interface KitChannelOptions {
  mainWindow: BrowserWindow
}

export class KitChannel implements IpcChannelInterface {
  handlers = [
    { name: IpcChannel.SELECT_PATH_REQ, fn: this.onSelectPath }
  ];

  private options: KitChannelOptions;

  constructor(options: KitChannelOptions) {
    this.options = options;
  }

  private onSelectPath(event: IpcMainEvent, { data }: IPCRequest<{ isDirectory: boolean }>) {
    const targetPath = dialog.showOpenDialogSync(this.options.mainWindow, {
      properties: [data.isDirectory ? 'openDirectory' : 'openFile'],
    });
    const res: IPCResponse<any> = { isSuccessed: !!targetPath, data: targetPath };
    event.reply(IpcChannel.SELECT_PATH_RES, res);
  }
}

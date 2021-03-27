// Plase some little gadgets which are worked to client
import * as path from 'path';
import * as fs from 'fs';
import { IpcChannelInterface } from '@electron/app/interfaces';
import { IpcChannel, IPCRequest, IPCResponse } from '@oam-kit/ipc';
import { BrowserWindow, dialog, IpcMainEvent, Notification, shell } from 'electron';

export interface KitChannelOptions {
  mainWindow: BrowserWindow;
}

export class KitChannel implements IpcChannelInterface {
  handlers = [
    { name: IpcChannel.SELECT_PATH_REQ, fn: this.onSelectPath },
    { name: IpcChannel.NOTIFICATION_REQ, fn: this.showSysNotification },
    { name: IpcChannel.OPEN_EXTERNAL_URL_REQ, fn: this.openExternalUrl },
  ];

  private options: KitChannelOptions;

  constructor(options: KitChannelOptions) {
    this.options = options;
  }

  private openExternalUrl(event: IpcMainEvent, req: IPCRequest<string>) {
    const url = req.data;
    shell.openExternal(url);
    event.reply(IpcChannel.OPEN_EXTERNAL_URL_RES);
  }

  private onSelectPath(event: IpcMainEvent, { data }: IPCRequest<{ isDirectory: boolean }>) {
    const targetPath = dialog.showOpenDialogSync(this.options.mainWindow, {
      properties: [data.isDirectory ? 'openDirectory' : 'openFile'],
    });
    const res: IPCResponse<any> = { isSuccessed: !!targetPath, data: targetPath };
    event.reply(IpcChannel.SELECT_PATH_RES, res);
  }

  private showSysNotification(event: IpcMainEvent, req: IPCRequest<{ title: string; body: string }>) {
    const icon = path.join(__dirname, './assets/jenkins.png');
    if (!fs.existsSync(icon)) {
      throw new Error('No image found.');
    }
    const notify = new Notification({
      title: req.data.title,
      body: req.data.body,
      timeoutType: 'never',
      icon: icon,
    });
    notify.show();
    const res: IPCResponse<void> = { isSuccessed: true };
    event.reply(req.responseChannel, res);
  }
}

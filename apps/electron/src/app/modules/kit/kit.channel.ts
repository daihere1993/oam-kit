// Plase some little gadgets which are worked to client
import * as path from 'path';
import * as fs from 'fs';
import { IpcChannelInterface } from '@electron/app/interfaces';
import { GeneralModel, IpcChannel, IPCRequest, IPCResponse, Profile } from '@oam-kit/utility/types';
import { BrowserWindow, dialog, IpcMainEvent, Notification, shell } from 'electron';
import { NodeSSH } from 'node-ssh';
import { Store } from '@electron/app/store';
import { MODEL_NAME, sftp_algorithms } from '@oam-kit/utility/overall-config';

export interface KitChannelOptions {
  store: Store;
  mainWindow: BrowserWindow;
}

export class KitChannel implements IpcChannelInterface {
  handlers = [
    { name: IpcChannel.SELECT_PATH_REQ, fn: this.onSelectPath },
    { name: IpcChannel.NOTIFICATION_REQ, fn: this.showSysNotification },
    { name: IpcChannel.OPEN_EXTERNAL_URL_REQ, fn: this.openExternalUrl },
    { name: IpcChannel.SERVER_CHECK_REQ, fn: this.serverCheck },
    { name: IpcChannel.SERVER_DIRECTORY_CHECK_REQ, fn: this.serverDirectoryCheck },
  ];

  private options: KitChannelOptions;
  private ssh: NodeSSH = new NodeSSH();
  private nsbAccount: { username: string; password: string };

  constructor(options: KitChannelOptions) {
    this.options = options;
    const gModel = this.options.store.get<GeneralModel>(MODEL_NAME.GENERAL);
    gModel.subscribe<Profile>('profile', (profile) => {
      this.nsbAccount = profile.nsbAccount;
    });
  }

  private async serverDirectoryCheck(event: IpcMainEvent, req: IPCRequest<{ serverAddr: string; directory: string }>) {
    const { serverAddr, directory } = req.data;
    const res: IPCResponse<boolean> = { isSuccessed: true };
    try {
      await this.ssh.connect({
        host: serverAddr,
        username: this.nsbAccount.username,
        password: this.nsbAccount.password,
        algorithms: sftp_algorithms,
      });
      const { stderr } = await this.ssh.execCommand(`cd ${directory}`);
      const isExistedDirectory = !stderr;
      res.data = isExistedDirectory;
      this.ssh.dispose();
    } catch (error) {
      res.error = { message: error.message };
      res.isSuccessed = false;
    } finally {
      event.reply(req.responseChannel, res);
    }
  }

  private async serverCheck(event: IpcMainEvent, req: IPCRequest<string>) {
    const serverAddr = req.data;
    const res: IPCResponse<boolean> = { isSuccessed: true };
    try {
      await this.ssh.connect({
        host: serverAddr,
        username: this.nsbAccount.username,
        password: this.nsbAccount.password,
        algorithms: sftp_algorithms,
      });
      res.data = this.ssh.isConnected();
      this.ssh.dispose();
    } catch (error) {
      res.isSuccessed = false;
      res.error = { message: error.message };
    } finally {
      event.reply(req.responseChannel, res);
    }
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

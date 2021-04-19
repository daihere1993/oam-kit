// Plase some little gadgets which are worked to client
import * as path from 'path';
import * as fs from 'fs';
import { IpcChannelInterface } from '@electron/app/interfaces';
import { GeneralModel, IpcChannel, IPCRequest, IPCResponse, Profile } from '@oam-kit/utility/types';
import { BrowserWindow, dialog, IpcMainEvent, Notification, shell } from 'electron';
import { NodeSSH } from 'node-ssh';
import { Store } from '@electron/app/store';
import { MODEL_NAME, sftp_algorithms } from '@oam-kit/utility/overall-config';
import axios from 'axios';
import Logger from '@electron/app/utils/logger';
import * as fetcher from '@electron/app/utils/fetcher';

const logger = Logger.for('RbChannel');
const NSB_LOGIN_URL = 'https://wam.inside.nsn.com/siteminderagent/forms/login.fcc';
const NSB_LOGIN_TARGET = 'HTTPS://pronto.int.net.nokia.com/pronto/home.html';
const REVIEWBOARD_LOGIN_URL = 'https://svne1.access.nsn.com/isource/svnroot/BTS_SC_OAM_LTE/conf/BranchFor.json';

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
    { name: IpcChannel.AUTH_VERIFICATION_REQ, fn: this.authVerification },
  ];

  private options: KitChannelOptions;
  private ssh: NodeSSH = new NodeSSH();
  private profile: Profile;

  constructor(options: KitChannelOptions) {
    this.options = options;
    const gModel = this.options.store.get<GeneralModel>(MODEL_NAME.GENERAL);
    gModel.subscribe<Profile>('profile', (profile) => {
      this.profile = profile;
    });
  }

  private async authVerification(event: IpcMainEvent, req: IPCRequest<void>) {
    const res: IPCResponse<boolean> = { isSuccessed: true };
    try {
      const isRightNsbAccount = await this.isRightNsbAccount();
      const isRightSvnAccount = await this.isRightSvnAccount();
      if (this.isEmptyAccount() && (!isRightNsbAccount || !isRightSvnAccount)) {
        res.data = false;
      } else {
        res.data = true;
      }
    } catch (error) {
      res.isSuccessed = false;
      res.error = { message: error.message };
    } finally {
      event.reply(req.responseChannel, res);
    }
  }

  private isEmptyAccount() {
    const nsbAccount = this.profile.nsbAccount;
    const svnAccount = this.profile.svnAccount;
    return !nsbAccount.password || !nsbAccount.username || !svnAccount.password;
  }

  private async isRightNsbAccount() {
    const nsbAccount = this.profile.nsbAccount;
    try {
      const { data } = await axios.post(
        NSB_LOGIN_URL,
        `USER=${nsbAccount.username}&PASSWORD=${nsbAccount.password}&target=${NSB_LOGIN_TARGET}`
      );
      if ((data as string).includes('Authentication Error')) {
        logger.error('login nsb account failed due to invalid username or password');
        return false;
      } else {
        return true;
      }
    } catch (error) {
      logger.error('login nsb account failed, %s', error);
      throw error;
    }
  }

  private async isRightSvnAccount() {
    const nsbAccount = this.profile.nsbAccount;
    const svnAccount = this.profile.svnAccount;
    try {
      await fetcher.svnCat(REVIEWBOARD_LOGIN_URL, {
        username: nsbAccount.username,
        password: svnAccount.password,
      });
      return true;
    } catch (error) {
      logger.error('login reviewboard failed, %s', error);
      throw error;
    }
  }

  private async serverDirectoryCheck(event: IpcMainEvent, req: IPCRequest<{ serverAddr: string; directory: string }>) {
    const { serverAddr, directory } = req.data;
    const res: IPCResponse<boolean> = { isSuccessed: true };
    try {
      const nsbAccount = this.profile.nsbAccount;
      await this.ssh.connect({
        host: serverAddr,
        username: nsbAccount.username,
        password: nsbAccount.password,
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
      const nsbAccount = this.profile.nsbAccount;
      await this.ssh.connect({
        host: serverAddr,
        username: nsbAccount.username,
        password: nsbAccount.password,
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

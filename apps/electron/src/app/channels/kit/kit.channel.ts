// Plase some little gadgets which are worked to client
import * as path from 'path';
import * as fs from 'fs';
import {
  GeneralModel,
  IpcChannel,
  IpcRequest,
  Profile,
  SelectPathReqData,
  SelectPathResData,
  SvnAccountVerificationReqData,
  SvnAccountVerificationResData,
  NsbAccountVerificationReqData,
  NsbAccountVerificationResData,
  ShowNotificationReqData,
  OpenExternalUrlReqData,
  ServerCheckReqData,
  ServerDirCheckReqData,
} from '@oam-kit/utility/types';
import { dialog, Notification, shell } from 'electron';
import { NodeSSH } from 'node-ssh';
import { MODEL_NAME, sftp_algorithms } from '@oam-kit/utility/overall-config';
import axios from 'axios';
import * as fetcher from '@electron/app/utils/fetcher';
import { IpcService } from '@electron/app/utils/ipcService';
import { IpcChannelBase } from '../ipcChannelBase';

const NSB_LOGIN_URL = 'https://wam.inside.nsn.com/siteminderagent/forms/login.fcc';
const NSB_LOGIN_TARGET = 'HTTPS://pronto.int.net.nokia.com/pronto/home.html';
const REVIEWBOARD_LOGIN_URL = 'https://svne1.access.nsn.com/isource/svnroot/BTS_SC_OAM_LTE/conf/BranchFor.json';

export default class KitChannel extends IpcChannelBase {
  logName = 'RbChannel';
  handlers = [
    { name: IpcChannel.SELECT_PATH, fn: this.onSelectPath },
    { name: IpcChannel.SHOW_NOTIFICATION, fn: this.showSysNotification },
    { name: IpcChannel.OPEN_EXTERNAL_URL, fn: this.openExternalUrl },
    { name: IpcChannel.SERVER_CHECK, fn: this.serverCheck },
    { name: IpcChannel.SERVER_DIRECTORY_CHECK, fn: this.serverDirectoryCheck },
    { name: IpcChannel.NSB_ACCOUNT_VERIFICATION, fn: this.nsbAccountVerification },
    { name: IpcChannel.SVN_ACCOUNT_VERIFICATION, fn: this.svnAccountVerification },
  ];

  private ssh: NodeSSH = new NodeSSH();
  private profile: Profile;

  startup(): void {
    const gModel = this.store.get<GeneralModel>(MODEL_NAME.GENERAL);
    gModel.subscribe<Profile>('profile', (profile) => {
      this.profile = profile;
    });
  }

  private onSelectPath(ipcService: IpcService, { data }: IpcRequest<SelectPathReqData>) {
    const ret = dialog.showOpenDialogSync(this.mainWindow, {
      properties: [data.isDirectory ? 'openDirectory' : 'openFile'],
    });
    if (ret) {
      ipcService.replyOkWithData<SelectPathResData>({ path: ret[0] });
    } else {
      ipcService.replyNokWithNoData(`Couldn't find target path`);
    }
  }
  private async svnAccountVerification(ipcService: IpcService, req: IpcRequest<SvnAccountVerificationReqData>) {
    try {
      const { username, password } = req.data;
      const isRightAccount = await this.isRightSvnAccount(username, password);
      ipcService.replyOkWithData<SvnAccountVerificationResData>({ isRightAccount });
    } catch (error) {
      ipcService.replyNokWithNoData(error.message);
    }
  }

  private async nsbAccountVerification(ipcService: IpcService, req: IpcRequest<NsbAccountVerificationReqData>) {
    try {
      const { username, password } = req.data;
      const isRightAccount = await this.isRightNsbAccount(username, password);
      ipcService.replyOkWithData<NsbAccountVerificationResData>({ isRightAccount });
    } catch (error) {
      ipcService.replyNokWithNoData(error.message);
    }
  }

  private isEmptyAccount() {
    const nsbAccount = this.profile.nsbAccount;
    const svnAccount = this.profile.svnAccount;
    return !nsbAccount.password || !nsbAccount.username || !svnAccount.password;
  }

  private async isRightNsbAccount(username: string, password: string) {
    try {
      const { data } = await axios.post(NSB_LOGIN_URL, `USER=${username}&PASSWORD=${password}&target=${NSB_LOGIN_TARGET}`);
      if ((data as string).includes('Authentication Error')) {
        this.logger.error('login nsb account failed due to invalid username or password');
        return false;
      } else {
        return true;
      }
    } catch (error) {
      this.logger.error('login nsb account failed, %s', error);
      throw error;
    }
  }

  private async isRightSvnAccount(username: string, password: string) {
    try {
      await fetcher.svnCat(REVIEWBOARD_LOGIN_URL, {
        username: username,
        password: password,
      });
      return true;
    } catch (error) {
      this.logger.error('login reviewboard failed, %s', error);
      throw error;
    }
  }

  private async serverDirectoryCheck(ipcService: IpcService, req: IpcRequest<ServerDirCheckReqData>) {
    const { host, directory } = req.data;
    try {
      const nsbAccount = this.profile.nsbAccount;
      await this.ssh.connect({
        host: host,
        username: nsbAccount.username,
        password: nsbAccount.password,
        algorithms: sftp_algorithms,
      });
      const { stdout, stderr } = await this.ssh.execCommand('pwd', { cwd: directory });
      if (stdout === directory) {
        ipcService.replyOkWithNoData();
      } else {
        const message = `serverDirectoryCheck failed: ${stderr}`;
        ipcService.replyNokWithNoData(message);
        this.logger.error(`serverDirectoryCheck failed: ${stderr}`);
      }
      this.ssh.dispose();
    } catch (error) {
      ipcService.replyNokWithNoData(error.message);
    }
  }

  private async serverCheck(ipcService: IpcService, req: IpcRequest<ServerCheckReqData>) {
    const serverAddr = req.data.host;
    try {
      const nsbAccount = this.profile.nsbAccount;
      await this.ssh.connect({
        host: serverAddr,
        username: nsbAccount.username,
        password: nsbAccount.password,
        algorithms: sftp_algorithms,
      });
      const isConnected = this.ssh.isConnected();
      this.ssh.dispose();
      if (isConnected) {
        ipcService.replyOkWithNoData();
      } else {
        ipcService.replyNokWithNoData(`Can not connect to ${serverAddr}`);
      }
    } catch (error) {
      ipcService.replyNokWithNoData(error.message);
    }
  }

  private openExternalUrl(ipcService: IpcService, req: IpcRequest<OpenExternalUrlReqData>) {
    const url = req.data.url;
    shell.openExternal(url);
  }

  private showSysNotification(ipcService: IpcService, req: IpcRequest<ShowNotificationReqData>) {
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
  }
}

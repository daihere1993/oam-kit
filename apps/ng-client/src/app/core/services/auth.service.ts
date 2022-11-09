import { Injectable } from '@angular/core';
import {
  SettingsModel,
  IpcChannel,
  NsbAccountVerificationReqData,
  NsbAccountVerificationResData,
  SvnAccountVerificationReqData,
  SvnAccountVerificationResData,
  MODEL_NAME,
} from '@oam-kit/utility/types';
import { IpcService } from './ipc.service';
import { StoreService } from './store.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private store: StoreService, private ipcService: IpcService) {}

  public async isValidNsbAuth(username: string, password: string) {
    const res = await this.ipcService.send<NsbAccountVerificationReqData, NsbAccountVerificationResData>(
      IpcChannel.NSB_ACCOUNT_VERIFICATION,
      {
        username: username,
        password: password,
      }
    );
    return res.isOk && res.data.isRightAccount;
  }

  public async isValidSvnAuth(username: string, password: string) {
    const res = await this.ipcService.send<SvnAccountVerificationReqData, SvnAccountVerificationResData>(
      IpcChannel.SVN_ACCOUNT_VERIFICATION,
      {
        username: username,
        password: password,
      }
    );
    return res.isOk && res.data.isRightAccount;
  }

  public async isValidAuthentication() {
    const account = this.getAccount();
    return (
      (await this.isValidNsbAuth(account.nsbUsername, account.nsbPassword)) &&
      (await this.isValidSvnAuth(account.nsbUsername, account.svnPassword))
    );
  }

  public isEmptyAccount() {
    const account = this.getAccount();
    return !account.nsbUsername || !account.nsbPassword || !account.svnPassword;
  }

  private getAccount() {
    const settingsModel = this.store.getModel<SettingsModel>(MODEL_NAME.SETTINGS);
    const auth = settingsModel.get('auth');
    return {
      nsbUsername: auth.nsbAccount.username,
      nsbPassword: auth.nsbAccount.password,
      svnPassword: auth.svnAccount.password,
    };
  }
}

import { Injectable } from '@angular/core';
import { Preferences } from '@oam-kit/shared-interfaces';
import { IpcService } from './ipc.service';
import { StoreService } from './store.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private store: StoreService, private ipcService: IpcService) {}

  public async isValidNsbAuth(username: string, password: string) {
    const res = await this.ipcService.send(
      '/auth/is_nsb_account_correct',
      {
        username: username,
        password: password,
      }
    );
    return res.data;
  }

  public async isValidSvnAuth(username: string, password: string) {
    const res = await this.ipcService.send(
      '/auth/is_svn_account_correct',
      {
        username: username,
        password: password,
      }
    );
    return res.data;
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
    const pModel = this.store.getModel<Preferences>('preferences');
    const profile = pModel.get('profile');
    return {
      nsbUsername: profile.nsbAccount.username,
      nsbPassword: profile.nsbAccount.password,
      svnPassword: profile.svnAccount.password,
    };
  }
}
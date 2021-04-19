import { Injectable } from '@angular/core';
import { MODEL_NAME } from '@oam-kit/utility/overall-config';
import { GeneralModel, IpcChannel } from '@oam-kit/utility/types';
import { ElectronService } from './electron.service';
import { IpcService } from './ipc.service';
import { StoreService } from './store.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private electronService: ElectronService, private ipcService: IpcService, private store: StoreService) {}

  async load() {
    if (this.electronService.isElectron) {
      const gModel = this.store.getModel<GeneralModel>(MODEL_NAME.GENERAL);
      const profile = gModel.get('profile');
      // const isEmpty = this.isEmpty(profile.nsbAccount) || this.isEmpty(profile.svnAccount);
      const res = await this.ipcService.send(IpcChannel.AUTH_VERIFICATION_REQ, {
        responseChannel: IpcChannel.AUTH_VERIFICATION_RES,
      });
      if (res.isSuccessed) {
        console.log(res);
      }
    } else {
      return Promise.resolve();
    }
  }
}

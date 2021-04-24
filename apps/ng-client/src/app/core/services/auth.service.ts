import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MODEL_NAME } from '@oam-kit/utility/overall-config';
import { GeneralModel } from '@oam-kit/utility/types';
import { StoreService } from './store.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private store: StoreService, private router: Router) {}

  async load() {
    if (this.isEmptyAccount()) {
      this.router.navigateByUrl('profile');
    }
  }

  private isEmptyAccount() {
    const gModel = this.store.getModel<GeneralModel>(MODEL_NAME.GENERAL);
    const profile = gModel.get('profile');
    const nsbAccount = profile.nsbAccount;
    const svnAccount = profile.svnAccount;
    return !nsbAccount.password || !nsbAccount.username || !svnAccount.password;
  }
}

import { Injectable } from '@angular/core';
import { Profile } from '@oam-kit/store/types';
import { IpcService } from './ipc.service';
import { StoreService } from './store.service';

const MODEL = 'profile';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  data: Profile = { remote: '', username: '', password: '' };

  constructor(private store: StoreService, private ipcService: IpcService) {
    this.store.data$.subscribe((data) => {
      this.data = data?.profile;
    });
    this.store.startup();
  }

  create(content: Profile): void {
    this.store.createItem<Profile>(MODEL, content);
  }

  update(content: Profile): void {
    this.store.editItem(MODEL, content);
  }

  isReady(): boolean {
    return !!(this.data?.remote && this.data?.password && this.data?.username);
  }
}

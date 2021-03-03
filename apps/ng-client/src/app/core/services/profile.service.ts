import { Injectable } from '@angular/core';
import { Profile } from '@oam-kit/store/types';
import { StoreService } from './store.service';

const MODEL = 'profile';
const emptyData = { remote: '', username: '', password: '' };
@Injectable({ providedIn: 'root' })
export class ProfileService {
  data: Profile;

  constructor(private store: StoreService) {
    this.store.data$.subscribe((data) => {
      this.data = data?.profile || emptyData;
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

import { Injectable } from '@angular/core';
import { Profile, modelConfig } from '@oam-kit/store';
import { StoreService } from './store.service';

const MODEL = modelConfig.profile.name;
const emptyData = { remote: '', username: '', password: '' };

@Injectable({ providedIn: 'root' })
export class ProfileService {
  data: Profile;

  constructor(private store: StoreService) {
    this.store.data$.subscribe((data) => {
      this.data = data && data[MODEL] || emptyData;
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

import { Injectable } from '@angular/core';
import { BranchInfo } from '@oam-kit/store/types';
import { BehaviorSubject } from 'rxjs';
import { StoreService } from './store.service';

const MODEL = 'branches';

@Injectable({providedIn: 'root'})
export class BranchService {
  branches$: BehaviorSubject<BranchInfo[]> = new BehaviorSubject(null);

  constructor(private store: StoreService) {
    this.store.data$.subscribe((data) => {
      this.branches$.next(data?.branches || []);
    });
    this.store.startup();
  }

  add(content: BranchInfo) {
    this.store.createItem<BranchInfo>(MODEL, content);
  }

  update(id: number, content: BranchInfo) {
    content.id = id;
    this.store.editItem<BranchInfo>(MODEL, content);
  }

  delete(id: number) {
    this.store.deleteItem<BranchInfo>(MODEL, id);
  }
}

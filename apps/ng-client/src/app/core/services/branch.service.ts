import { Injectable } from '@angular/core';
import { Branch } from '@oam-kit/store/types';
import { BehaviorSubject } from 'rxjs';
import { StoreService } from './store.service';

const MODEL = 'branches';

@Injectable({providedIn: 'root'})
export class BranchService {
  branches$: BehaviorSubject<Branch[]> = new BehaviorSubject(null);

  constructor(private store: StoreService) {
    this.store.data$.subscribe((data) => {
      this.branches$.next(data?.branches || []);
    });
    this.store.startup();
  }

  add(content: Branch) {
    this.store.createItem<Branch>(MODEL, content);
  }

  update(id: number, content: Branch) {
    content.id = id;
    this.store.editItem<Branch>(MODEL, content);
  }

  delete(id: number) {
    this.store.deleteItem<Branch>(MODEL, id);
  }
}

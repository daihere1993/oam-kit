import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { IPCResponse } from '@oam-kit/ipc';
import { APPData, StoreAction, StoreData } from '@oam-kit/store/types';
import { IpcChannel } from '@oam-kit/ipc';
import { ElectronService } from './electron.service';
import { IpcService } from './ipc.service';
import { isEqual } from 'lodash-es';
import produce from 'immer';

function isObject(o: any) {
  return typeof o === 'object' && o !== null;
}

export class Model<T> {
  private observerMap: { [key: string]: Subject<any> } = {};
  constructor(public name: string, public data: T) {}
  add(key: string, value: any) {
    if (!Array.isArray(this.parseKey(this.data, key).target)) {
      throw new Error(`[StoreService] add() method only worked in array parameter and "${key}" is not`);
    }

    this.data = produce(this.data, (draft) => {
      this.parseKey(draft, key).target.push(value);
    });
    this.triggerObserver(key);
  }
  set(key: string, value: any): void;
  set(key: string, id: number, value: any): void;
  set(key: string, ...args: any[]) {
    let id: number;
    let value: any;
    if (args.length === 2) {
      id = args[0];
      value = args[1];
    } else {
      value = args[0];
    }

    this.data = produce(this.data, (draft) => {
      const { target, lastKey } = this.parseKey(draft, key);
      if (id) {
        if (!Array.isArray(target) && !isObject(value)) {
          throw new Error(`[StoreService] set() method only worked in array parameter and "${key}" is not`);
        }
        const item = target.find((i: any) => i.id === id);
        Object.assign(item, value);
      } else {
        target[lastKey] = value;
      }
    });
    this.triggerObserver(key);
  }
  get(key: string) {
    const { target, lastKey } = this.parseKey(this.data, key);
    return target[lastKey];
  }
  subscribe<R>(key: string, cb: (data: any) => void) {
    const observer = new Subject<R>();
    this.observerMap[key] = observer;
    observer.subscribe(cb);
  }

  private parseKey(data: any, key: string) {
    let target: any;
    let lastKey: string;
    let keys: string[] = [];
    if (key.includes('.')) {
      keys = key.split('.');
    }
    if (keys.length) {
      lastKey = keys[keys.length - 1];
      keys.reduce((prev, curr) => {
        if (prev !== null) {
          const tmp = isObject(prev) ? prev[curr] : data[prev][curr];
          if (isObject(tmp)) {
            target = tmp;
            return target;
          }
        }
        return null;
      });
    } else {
      lastKey = key;
      target = isObject(data[key]) ? data[key] : data;
    }
    return { target, lastKey };
  }

  private triggerObserver(key: string) {
    for (const [k, observer] of Object.entries(this.observerMap)) {
      if (key.includes(k)) {
        observer.next(this.parseKey(this.data, k).target);
      }
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private data: APPData;
  private hasBeenStartup = false;
  public data$: BehaviorSubject<APPData> = new BehaviorSubject<APPData>(null);

  constructor(private electronService: ElectronService, private zone: NgZone, private ipcService: IpcService) {}

  private getData() {
    this.electronService.ipcRenderer.send(IpcChannel.GET_APP_DATA_REQ);
  }

  // Separate startup, to avoid ipc response too quick in e2e environment lead to other services couldn't even subscribe
  public startup() {
    if (this.electronService.isElectron && !this.hasBeenStartup) {
      this.hasBeenStartup = true;
      this.electronService.ipcRenderer.on(IpcChannel.GET_APP_DATA_RES, (event, res: IPCResponse<APPData>) => {
        if (res.isSuccessed) {
          this.zone.run(() => {
            if (!this.data) {
              this.data = res.data;
            } else {
              this.data = isEqual(this.data, res.data) ? this.data : res.data;
            }
            this.data$.next(this.data);
          });
        }
      });
      this.getData();
    }
  }

  public refresh() {
    this.getData();
  }

  public createItem<T>(model: string, content: T) {
    this.ipcService.send<StoreData<T>>(IpcChannel.STORE_DATA_REQ, {
      data: { model, content, action: StoreAction.ADD_ITEM },
    });
  }
  public editItem<T>(model: string, content: Partial<T>) {
    this.ipcService.send<StoreData<T>>(IpcChannel.STORE_DATA_REQ, {
      data: { model, content, action: StoreAction.EDIT_ITEM },
    });
  }
  public deleteItem<T>(model: string, id?: number) {
    this.ipcService.send<StoreData<T>>(IpcChannel.STORE_DATA_REQ, {
      data: { model, content: id, action: StoreAction.DELETE_ITEM },
    });
  }
}

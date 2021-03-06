import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IPCResponse } from '@oam-kit/ipc';
import { APPData, StoreAction, StoreData } from '@oam-kit/store/types';
import { IpcChannel } from '@oam-kit/ipc';
import { ElectronService } from './electron.service';
import { IpcService } from './ipc.service';
import * as Immutable from 'immutable';

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private originalData: any;
  private hasBeenStartup = false;
  public data$: BehaviorSubject<APPData> = new BehaviorSubject<APPData>(null);

  constructor(
    private electronService: ElectronService,
    private zone: NgZone,
    private ipcService: IpcService
  ) {
  }

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
            const latestData = Immutable.fromJS(res.data)
            if (!this.originalData) {
              this.originalData = latestData;
            } else {
              this.originalData = Immutable.is(this.originalData, latestData) ? this.originalData : latestData;
            }
            this.data$.next(this.originalData.toJS() as APPData);
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
      data: { model, content, action: StoreAction.ADD_ITEM }
    });
  }
  public editItem<T>(model: string, content: Partial<T>) {
    this.ipcService.send<StoreData<T>>(IpcChannel.STORE_DATA_REQ, {
      data: { model, content, action: StoreAction.EDIT_ITEM }
    });
  }
  public deleteItem<T>(model: string, id?: number) {
    this.ipcService.send<StoreData<T>>(IpcChannel.STORE_DATA_REQ, {
      data: { model, content: id, action: StoreAction.DELETE_ITEM }
    });
  }
}

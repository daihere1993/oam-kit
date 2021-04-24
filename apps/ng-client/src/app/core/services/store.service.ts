import { Injectable, OnDestroy } from '@angular/core';
import { APPData, IpcChannel } from '@oam-kit/utility/types';
import { Model } from '@oam-kit/utility/model';
import { IpcService } from './ipc.service';
import { from, Subscription } from 'rxjs';
import { MODEL_INIT_VALUE } from '@oam-kit/utility/overall-config';
import { ElectronService } from './electron.service';

@Injectable({
  providedIn: 'root',
})
export class StoreService implements OnDestroy {
  private data: APPData = MODEL_INIT_VALUE;
  private models: Model<any>[] = [];
  private observers: Subscription[] = [];

  constructor(private ipcService: IpcService, private electronService: ElectronService) {}

  async load() {
    if (this.electronService.isElectron) {
      const res = await this.ipcService.send(IpcChannel.GET_APP_DATA_REQ, { responseChannel: IpcChannel.GET_APP_DATA_RES });
      if (res.isSuccessed) {
        this.data = res.data;
      } else {
        throw new Error(res.error.message);
      }
    } else {
      return Promise.resolve();
    }
  }

  getModel<T>(name: string): Model<T> {
    if (this.isExistedModel(name)) {
      return this.getExistedModelByName(name);
    } else {
      const model = new Model({
        name,
        initValue: this.data[name],
      });
      this.models.push(model);
      this.observers.push(
        model.change.subscribe(() => {
          this.sync(model);
        })
      );
      return model;
    }
  }

  ngOnDestroy() {
    for (const observer of this.observers) {
      observer.unsubscribe();
    }
  }

  private isExistedModel(name: string) {
    return this.models.findIndex((item) => item.name === name) !== -1;
  }

  private getExistedModelByName(name: string) {
    return this.models.find((item) => item.name === name);
  }

  private sync(model: Model<any>) {
    from(this.ipcService.send(IpcChannel.SYNC_DATA_REQ, { data: { name: model.name, data: model.data } }));
  }
}

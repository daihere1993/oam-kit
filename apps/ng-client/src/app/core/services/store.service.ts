import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { IpcService } from './ipc.service';
import { Model, StoreBase } from '@oam-kit/data-persistent';

@Injectable({ providedIn: 'root' })
export class StoreService extends StoreBase {
  constructor(private _ipcService: IpcService) {
    super();
  }

  public async initialize() {
    const { data } = await this._ipcService.send('/storage/getPersistentData');
    this._data = data;
  }

  protected persist(model: Model<any>) {
    from(this._ipcService.send('/storage/sync', { name: model.name, data: model.data }));
  }
}

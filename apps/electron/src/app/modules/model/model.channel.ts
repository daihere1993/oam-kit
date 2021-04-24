import { IpcChannelInterface } from '@electron/app/interfaces';
import { Store } from '@electron/app/store';
import { Model } from '@oam-kit/utility/model';
import { IpcMainEvent } from 'electron/main';
import { MODEL_INIT_VALUE, MODEL_NAME } from '@oam-kit/utility/overall-config';
import { SyncCodeModel, GeneralModel, RbToolsModel, IpcChannel, IPCRequest } from '@oam-kit/utility/types';

export class ModelChannel implements IpcChannelInterface {
  private store: Store;
  handlers = [
    {
      name: IpcChannel.GET_APP_DATA_REQ,
      fn: this.onGetData,
    },
    {
      name: IpcChannel.SYNC_DATA_REQ,
      fn: this.syncData,
    },
  ];

  constructor(store: Store) {
    this.store = store;
    this.store.add(
      new Model<GeneralModel>({
        name: MODEL_NAME.GENERAL,
        initValue: MODEL_INIT_VALUE.general,
      })
    );
    this.store.add(
      new Model<SyncCodeModel>({
        name: MODEL_NAME.SYNC_CODE,
        initValue: MODEL_INIT_VALUE.syncCode,
      })
    );
    this.store.add(
      new Model<RbToolsModel>({
        name: MODEL_NAME.RB_TOOLS,
        initValue: MODEL_INIT_VALUE.rbTools,
      })
    );
  }

  private onGetData(event: IpcMainEvent) {
    event.reply(IpcChannel.GET_APP_DATA_RES, {
      isSuccessed: true,
      data: this.store.getAllData(),
    });
  }

  private syncData(event: IpcMainEvent, req: IPCRequest<{ name: string; data: any }>) {
    const { name, data } = req.data;
    const model = this.store.get(name);
    model.reset(data);
  }
}

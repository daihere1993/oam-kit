import { IpcChannelInterface } from '@electron/app/interfaces';
import { Store, Model } from '@electron/app/store';
import { SyncCodeModel, GeneralModel, RbToolsModel } from '@oam-kit/store/types';
import { IpcChannel, IPCRequest } from '@oam-kit/ipc';
import { IpcMainEvent } from 'electron/main';

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
    this.store.add(new Model<SyncCodeModel>({
      name: 'sync-code',
      initValue: {
        projects: [],
      }
    }));
    this.store.add(new Model<RbToolsModel>({
      name: 'rb-tools',
      initValue: {
        rbs: [],
        preferences: { checkLockInfoInterval: 300000 }
      }
    }));
    this.store.add(new Model<GeneralModel>({
      name: 'general',
      initValue: {
        repositoryList: [],
        serverList: [],
        profile: {
          svnAccount: { username: null, password: null },
          nsbAccount: { username: null, password: null },
        }
      }
    }))
  }

  private onGetData(event: IpcMainEvent) {
    event.reply(IpcChannel.GET_APP_DATA_RES, {
      isSuccessed: true,
      data: this.store.getAllData(),
    });
  }

  private syncData(event: IpcMainEvent, req: IPCRequest<{ name: string; value: any }>) {
    const { name, value } = req.data;
    const model = this.store.getModel(name);
    model.reset(value);
  }
}

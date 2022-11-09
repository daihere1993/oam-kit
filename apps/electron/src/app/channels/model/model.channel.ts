import { Model } from '@oam-kit/utility/model';
import { MODEL_INIT_VALUE } from '@oam-kit/utility/overall-config';
import { SyncCodeModel, SettingsModel, IpcChannel, IpcRequest, APPData, MODEL_NAME } from '@oam-kit/utility/types';
import { IpcService } from '@electron/app/utils/ipcService';
import { IpcChannelBase } from '../ipcChannelBase';

export default class ModelChannel extends IpcChannelBase {
  logName = 'ModelChannel';
  handlers = [
    {
      name: IpcChannel.GET_APP_DATA,
      fn: this.onGetData,
    },
    {
      name: IpcChannel.SYNC_DATA,
      fn: this.syncData,
    },
  ];

  startup(): void {
    this.store.add(
      new Model<SettingsModel>({
        name: MODEL_NAME.SETTINGS,
        initValue: MODEL_INIT_VALUE.settings,
      })
    );
    this.store.add(
      new Model<SyncCodeModel>({
        name: MODEL_NAME.SYNC_CODE,
        initValue: MODEL_INIT_VALUE.syncCode,
      })
    );
  }

  private onGetData(ipcService: IpcService) {
    ipcService.replyOkWithData<Partial<APPData>>(this.store.getAllData());
  }

  private syncData(ipcService: IpcService, req: IpcRequest<{ name: string; data: any }>) {
    const { name, data } = req.data;
    const model = this.store.get(name);
    model.reset(data);
  }
}

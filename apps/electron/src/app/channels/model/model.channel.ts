import { Model } from '@oam-kit/utility/model';
import { MODEL_INIT_VALUE, MODEL_NAME } from '@oam-kit/utility/overall-config';
import { SyncCodeModel, GeneralModel, RbToolsModel, IpcChannel, IpcRequest, APPData } from '@oam-kit/utility/types';
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

  private onGetData(ipcService: IpcService) {
    ipcService.replyOkWithData<Partial<APPData>>(this.store.getAllData());
  }

  private syncData(ipcService: IpcService, req: IpcRequest<{ name: string; data: any }>) {
    const { name, data } = req.data;
    const model = this.store.get(name);
    model.reset(data);
  }
}

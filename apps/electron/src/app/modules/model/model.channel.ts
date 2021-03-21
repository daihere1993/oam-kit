import { IpcChannelInterface } from '@electron/app/interfaces';
import { Model, modelConfig, Store } from '@oam-kit/store';
import { ModelType, StoreData, StoreAction, Branch, Profile, ReviewBoard } from '@oam-kit/store/types';
import { IpcChannel, IPCRequest, IPCResponse } from '@oam-kit/ipc';
import { IpcMainEvent } from 'electron/main';

type IpcRequest_ = IPCRequest<StoreData<any>>;

export class ModelChannel implements IpcChannelInterface {
  private store: Store;
  handlers = [
    {
      name: IpcChannel.GET_APP_DATA_REQ,
      fn: this.onGetData,
    },
    {
      name: IpcChannel.STORE_DATA_REQ,
      fn: this.onModelUpdate,
    },
  ];

  constructor(store: Store) {
    this.store = store;
  }

  private onGetData(event: IpcMainEvent) {
    event.reply(IpcChannel.GET_APP_DATA_RES, {
      isSuccessed: true,
      data: this.store.getAllData(),
    });
  }

  private async onModelUpdate(
    event: IpcMainEvent,
    { data }: IpcRequest_
  ) {
    const model = this.store.get(data.model);
    const action = data.action || StoreAction.COVER;
    switch (action) {
      case StoreAction.ADD_ITEM:
        await model.create$(data.content);
        break;
      case StoreAction.EDIT_ITEM:
        await model.edit$(data.content);
        break;
      case StoreAction.DELETE_ITEM:
        // If there is no content, would delete a plane model, instead this content is id
        await model.delete$(data.content as number);
        break;
      default:
        throw new Error(`[ModelChannel] no valid action named: ${action}`);
    }
    // Would return whole app data instead a model data
    const res: IPCResponse<any> = { isSuccessed: true, data: this.store.getAllData() };
    event.reply(IpcChannel.STORE_DATA_RES, res);
    event.reply(IpcChannel.GET_APP_DATA_RES, res);
  }

  public async startup$() {
    // init all models
    await this.store.add$(new Model<ReviewBoard>(modelConfig.autoCommit.name, { type: ModelType.PLANE }));
    await this.store.add$(new Model<Branch>(modelConfig.syncCodeBranch.name));
    // await this.store.add$(new Model<Branch>(modelConfig.lockInfoBranch.name, {
    //   initContent: defaultBranchesToDisplay
    // }));
    // await this.store.add$(new Model<Branch>(modelConfig.visibleBranches.name, {
    //   initContent: visibleBranches
    // }));
    // await this.store.add$(new Model<Branch>(modelConfig.visibleRepos.name, {
    //   initContent: visibleRepos
    // }));
    await this.store.add$(new Model<Profile>(modelConfig.profile.name, { type: ModelType.PLANE }));
  }
}

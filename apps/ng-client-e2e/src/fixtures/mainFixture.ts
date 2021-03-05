import { IpcChannel, IPCRequest, IPCResponse } from '@oam-kit/ipc';
import { Model, Store, modelConfig } from '@oam-kit/store';
import { BrowserSolid } from '@oam-kit/store/solid/browser-solid';
import { APPData, ModelType, StoreAction, StoreData } from '@oam-kit/store/types';
import { merge } from 'lodash-es';
import { Subject } from 'rxjs';

interface ChangedData {
  model: string;
  content: any;
}

/** Notice: each MainFixture instance maintain a data of whole app thus we don't need to mock specific data in e2e */
export class MainFixture {
  // To store all the ipc requests sent to backend(electron),
  // then we can mock some specific response callbacks of backend
  private ipcResponseCallbackMap: Record<IpcChannel, (event: any, res: IPCResponse<any>) => void> = {} as any;

  // Below four Subjects are used to know when need to update local data which stored in localStorage
  private onPullData = new Subject<void>();
  private onCreateData = new Subject<ChangedData>();
  private onUpdateData = new Subject<ChangedData>();
  private onDeleteData = new Subject<ChangedData>();

  private mockedIpcRenderer = {
    send: (channel: IpcChannel, req: IPCRequest<StoreData<ChangedData>>) => {
      // if there was a data opertaion request sent from front, should intercept it then update the local data.
      if (channel === IpcChannel.GET_APP_DATA_REQ) {
        this.onPullData.next();
      } else if (channel === IpcChannel.STORE_DATA_REQ) {
        switch (req.data.action) {
          case StoreAction.ADD_ITEM:
            this.onCreateData.next({ model: req.data.model, content: req.data.content });
            break;
          case StoreAction.EDIT_ITEM:
            this.onUpdateData.next({ model: req.data.model, content: req.data.content });
            break;
          case StoreAction.DELETE_ITEM:
            this.onDeleteData.next({ model: req.data.model, content: req.data.content });
            break;
        }
      }
    },
    on: (channel: IpcChannel, cb: (event: any, res: any) => void) => {
      this.ipcResponseCallbackMap[channel] = cb;
    },
    once: (channel: IpcChannel, cb: (event: any, res: any) => void) => {
      this.ipcResponseCallbackMap[channel] = cb;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    removeListener: () => {},
  };

  constructor() {
    
    
    const store = new Store({ solid: new BrowserSolid() });
    store.add(new Model(modelConfig.syncCodeBranch.name));
    store.add(new Model(modelConfig.lockInfoBranch.name));
    store.add(new Model(modelConfig.profile.name, { type: ModelType.PLANE }));
    // All of below subscribes just to update data then return the latest data
    // by invoke corresponding ipc response callback
    this.onPullData.subscribe(() => {
      this.updateData(store);
    });
    this.onCreateData.subscribe(async ({ model, content }) => {
      const m = store.get(model);
      m.create(content);
      this.updateData(store);
    });
    this.onUpdateData.subscribe(async ({ model, content }) => {
      const m = store.get(model);
      m.edit(content);
      this.updateData(store);
    });
    this.onDeleteData.subscribe(async ({ model, content }) => {
      const m = store.get(model);
      m.delete(content);
      this.updateData(store);
    });
  }

  private updateData(store: Store) {
    const cb = this.ipcResponseCallbackMap[IpcChannel.GET_APP_DATA_RES];
    if (!cb) throw new Error(`Didn't listen IpcChannel.GET_APP_DATA_RES.`);
    const res: IPCResponse<APPData> = { isSuccessed: true, data: store.getAllData() };
    cb(null, res);
  }

  public simulateBackendResToClient<T>(channel: IpcChannel, data: T): any;
  public simulateBackendResToClient(channel: IpcChannel, error: any): void;
  public simulateBackendResToClient<T>(channel: IpcChannel, res: IPCResponse<T>): void;
  public simulateBackendResToClient<T>(channel: IpcChannel, arg: any) {
    const res: IPCResponse<T> = { isSuccessed: true };
    const hasFullRes = this.isObject(arg) && Object.prototype.hasOwnProperty.call(arg, 'isSuccess');
    const hasErrorOnly =
      this.isObject(arg) &&
      Object.prototype.hasOwnProperty.call(arg, 'name') &&
      Object.prototype.hasOwnProperty.call(arg, 'message');

    if (hasFullRes) {
      Object.assign(res, arg);
    } else if (hasErrorOnly) {
      res.isSuccessed = false;
      res.error = arg;
    } else {
      // has data only
      res.data = arg;
    }
    this.ipcResponseCallbackMap[channel](null, res);
  }

  /**
   * Go to a specific page with page reloading.
   * @param route route name
   */
  public visit(route: string) {
    const partialWindow = {
      process: { type: 'render' },
      require: () => {
        return { ipcRenderer: this.mockedIpcRenderer };
      },
    };
    return cy.visit(route, {
      onBeforeLoad(win) {
        merge(win, partialWindow);
      },
    });
  }

  /**
   * Go to a specific navigation page without reload page.
   * @param text text of a specific nav item
   */
  public navigate(text: string) {
    return cy.get('.ant-menu-item').contains(text).click();
  }

  public destroy() {
    this.onPullData.unsubscribe();
    this.onCreateData.unsubscribe();
    this.onUpdateData.unsubscribe();
    this.onDeleteData.unsubscribe();
  }

  private isObject(v: any): boolean {
    return typeof v === 'object' && v !== null;
  }
}

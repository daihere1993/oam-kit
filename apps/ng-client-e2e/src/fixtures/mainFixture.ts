import { IpcChannel, IPCResponse, APPData } from '@oam-kit/utility/types';
import { merge } from 'lodash-es';
import { Subject } from 'rxjs';
import { MODEL_INIT_VALUE } from '@oam-kit/utility/overall-config';

/** Notice: each MainFixture instance maintain a data of whole app thus we don't need to mock specific data in e2e */
export class MainFixture {
  // To store all the ipc requests sent to backend(electron),
  // then we can mock some specific response callbacks of backend
  private ipcResponseCallbackMap: Record<IpcChannel, (event: any, res: IPCResponse<any>) => void> = {} as any;

  // Below four Subjects are used to know when need to update local data which stored in localStorage
  private onPullData = new Subject<void>();

  private mockedIpcRenderer = {
    send: (channel: IpcChannel) => {
      // if there was a data opertaion request sent from front, should intercept it then update the local data.
      if (channel === IpcChannel.GET_APP_DATA_REQ) {
        this.onPullData.next();
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

  constructor(options: { initData?: Partial<APPData> } = {}) {
    this.onPullData.subscribe(() => {
      this.updateData(options.initData);
    });
  }

  private updateData(data: Partial<APPData> = MODEL_INIT_VALUE) {
    const cb = this.ipcResponseCallbackMap[IpcChannel.GET_APP_DATA_RES];
    if (!cb) throw new Error(`Didn't listen IpcChannel.GET_APP_DATA_RES.`);
    const res: IPCResponse<Partial<APPData>> = { isSuccessed: true, data: data };
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
    cy.wait(100);
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
  }

  private isObject(v: any): boolean {
    return typeof v === 'object' && v !== null;
  }
}

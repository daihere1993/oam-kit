import { IpcChannel, IpcResponse, APPData, IpcResErrorType, CheckNecessaryCommandsResData, NsbAccountVerificationResData, SvnAccountVerificationResData } from '@oam-kit/utility/types';
import { merge } from 'lodash-es';
import { Subject } from 'rxjs';
import { MODEL_INIT_VALUE } from '@oam-kit/utility/overall-config';

export interface ElectronSimulator {
  replyOkWithData<T = void, U extends T = T>(channel: IpcChannel, data: U): Cypress.Chainable<undefined>;
  replyOkWithNoData(channel: IpcChannel): Cypress.Chainable<undefined>;
  replayNokWithData<T = void, U extends T = T>(
    channel: IpcChannel,
    data: U,
    message?: string,
    type?: IpcResErrorType
  ): Cypress.Chainable<undefined>;
  replayNokWithNoData(channel: IpcChannel, message?: string, type?: IpcResErrorType): Cypress.Chainable<undefined>;
}

/** Notice: each MainFixture instance maintain a data of whole app thus we don't need to mock specific data in e2e */
export class MainFixture {
  public simulator: ElectronSimulator;
  // To store all the ipc requests sent to backend(electron),
  // then we can mock some specific response callbacks of backend
  private ipcResponseCallbackMap: Record<IpcChannel, (event: any, res: IpcResponse<any>) => void> = {} as any;

  // Below four Subjects are used to know when need to update local data which stored in localStorage
  private onPullData = new Subject<void>();

  private mockedIpcRenderer = {
    send: (channel: IpcChannel) => {
      // if there was a data opertaion request sent from front, should intercept it then update the local data.
      if (channel === IpcChannel.GET_APP_DATA) {
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
    this.simulator = {
      replyOkWithData: <T>(channel: IpcChannel, data: T): Cypress.Chainable<undefined> => {
        const res: IpcResponse<T> = { isOk: true, data, error: { type: null, message: null } };
        this.ipcResponseCallbackMap[channel](null, res);
        return cy.wait(100);
      },
      replyOkWithNoData: (channel: IpcChannel): Cypress.Chainable<undefined> => {
        const res: IpcResponse<null> = { isOk: true, data: null, error: { type: null, message: null } };
        this.ipcResponseCallbackMap[channel](null, res);
        return cy.wait(100);
      },
      replayNokWithData: <T>(
        channel: IpcChannel,
        data: T,
        message?: string,
        type = IpcResErrorType.Expected
      ): Cypress.Chainable<undefined> => {
        const res: IpcResponse<T> = { isOk: false, data, error: { type, message } };
        this.ipcResponseCallbackMap[channel](null, res);
        return cy.wait(100);
      },
      replayNokWithNoData: (
        channel: IpcChannel,
        message?: string,
        type = IpcResErrorType.Expected
      ): Cypress.Chainable<undefined> => {
        const res: IpcResponse<null> = { isOk: false, data: null, error: { type, message } };
        this.ipcResponseCallbackMap[channel](null, res);
        return cy.wait(100);
      },
    };
  }

  private updateData(data: Partial<APPData> = MODEL_INIT_VALUE) {
    const cb = this.ipcResponseCallbackMap[IpcChannel.GET_APP_DATA];
    if (!cb) throw new Error(`Didn't listen IpcChannel.GET_APP_DATA.`);
    const res: IpcResponse<Partial<APPData>> = { isOk: true, data, error: { type: null, message: null } };
    cb(null, res);
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

  public startupPrareation() {
    cy.wait(100)
      .then(() => {
        return this.simulator.replyOkWithData<CheckNecessaryCommandsResData>(IpcChannel.CHECK_NECESSARY_COMMANDS, {
          svnReady: true,
          gitReady: true,
        });
      })
      .then(() => {
        return this.simulator.replyOkWithData<NsbAccountVerificationResData>(IpcChannel.NSB_ACCOUNT_VERIFICATION, {
          isRightAccount: true,
        });
      })
      .then(() => {
        return this.simulator.replyOkWithData<SvnAccountVerificationResData>(IpcChannel.SVN_ACCOUNT_VERIFICATION, {
          isRightAccount: true,
        });
      });
  }
}

import { TestBed } from '@angular/core/testing';
import { IpcChannel, IPCResponse } from '@oam-kit/ipc';
import { APPData } from '@oam-kit/store';
import { cloneDeep } from 'lodash-es';
import { filter } from 'rxjs/operators';
import { ElectronService } from './electron.service';
import { StoreService } from './store.service';

describe('StoreService', () => {
  const mockedData: APPData = {
    profile: { remote: 'remote1', username: 'username2', password: 'username3' },
    branches: [{ name: 'name1' }],
  };
  let ipcResponseCb: (event: any, res: IPCResponse<APPData>) => void;
  let spyIpcSend: jest.SpyInstance;

  function refreshData() {
    const res: IPCResponse<APPData> = { isSuccessed: true, data: cloneDeep(mockedData) };
    ipcResponseCb(null, res);
  }

  beforeEach(() => {
    const mockedElectronService = {
      isElectron: true,
      ipcRenderer: {
        on: jest.fn(),
        send: jest.fn(),
      },
    };
    TestBed.configureTestingModule({
      providers: [StoreService, { provide: ElectronService, useValue: mockedElectronService }],
    });
    const spyIpcOn = jest.spyOn(mockedElectronService.ipcRenderer, 'on');
    spyIpcOn.mockImplementation(
      (channel: IpcChannel, cb: (event: any, res: IPCResponse<APPData>) => void) => {
        expect(channel).toBe(IpcChannel.GET_APP_DATA_RES);
        ipcResponseCb = cb;
        refreshData();
      }
    );
    spyIpcSend = jest.spyOn(mockedElectronService.ipcRenderer, 'send');
  });

  it('should return same object reference if data value is totally same with last one', (done) => {
    const storeService = TestBed.inject(StoreService);
    let prev: APPData;
    storeService.data$.pipe(filter((i) => !!i)).subscribe((data) => {
      if (!prev) {
        prev = data;
      } else {
        // should have same reference
        expect(prev).toBe(data);
        done();
      }
    });
    storeService.startup();
    refreshData();
    expect(spyIpcSend).toBeCalledWith(IpcChannel.GET_APP_DATA_REQ);
  });
});

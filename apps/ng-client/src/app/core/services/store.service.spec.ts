import { TestBed } from '@angular/core/testing';
import { IpcChannel, IPCResponse } from '@oam-kit/ipc';
import { APPData } from '@oam-kit/store';
import { cloneDeep } from 'lodash-es';
import { filter } from 'rxjs/operators';
import { ElectronService } from './electron.service';
import { Model, StoreService } from './store.service';

describe.only('Model', () => {
  const fakeData = { projects: [{ id: 1, name: 'project1' }], color: 'red', preference: { theme: 'dark', list: [{ name: 'item1' }] } };
  const model = new Model('test', fakeData);
  it('model.get()', () => {
    expect(model.get('color')).toBe('red');
    expect(model.get('preference.theme')).toBe('dark');
  });
  it(`model.add('projects', newProject);`, () => {
    model.add('projects', { name: 'project2' });
    model.add('preference.list', { name: 'item2' });
    expect(model.data.projects.length).toBe(2);
    expect(model.data.projects[1]).toEqual({ name: 'project2' });
    expect(model.data.preference.list.length).toBe(2);
    expect(model.data.preference.list[1]).toEqual({ name: 'item2' });
  });
  it('model.subscribe()', (done) => {
    model.subscribe('projects', (data) => {
      expect(data.length).toBe(2);
      expect(data[1]).toEqual({ name: 'project2' });
      done();
    });
    model.add('projects', { name: 'project2' });
  });
});

describe('StoreService', () => {
  const mockedData: APPData = {
    profile: { remote: 'remote1', username: 'username2', password: 'username3' },
    syncCodeBranch: [],
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
    spyIpcOn.mockImplementation((channel: IpcChannel, cb: (event: any, res: IPCResponse<APPData>) => void) => {
      expect(channel).toBe(IpcChannel.GET_APP_DATA_RES);
      ipcResponseCb = cb;
      refreshData();
    });
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

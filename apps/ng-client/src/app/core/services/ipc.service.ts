import { Injectable, NgZone } from '@angular/core';
import { ipcRenderer } from 'electron';
import { ElectronService } from './electron.service';
import { IpcRequest, IpcResponse } from '@oam-kit/shared-interfaces';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IpcService {
  private _ipcRenderer!: typeof ipcRenderer;
  private _subscribers: { path: string; callback: (event: any, res: any) => void; }[] = [];

  constructor(private _electronService: ElectronService, private _zone: NgZone) {
    if (this._electronService.isElectron) {
      this._ipcRenderer = this._electronService.ipcRenderer;
    }
  }

  public send(path: string, data?: any): Promise<IpcResponse> {
    try {
      return new Promise((resolve) => {
        this._ipcRenderer.once(path, (event, response: IpcResponse) => resolve(response));
      });
    } finally {
      const req: IpcRequest = { data };
      this._ipcRenderer.send(path, req);
    }
  }

  public send$(path: string, data: any): Observable<IpcResponse> {
    try {
      return new Observable((subscriber) => {
        this._ipcRenderer.on(path, (event, response) => {
          this._zone.run(subscriber.next.bind(subscriber, response));
        });
      });
    } finally {
      const req: IpcRequest = { data };
      this._ipcRenderer.send(path, req);
    }
  }

  public on(path: string, cb: (event: any, res: IpcResponse) => void): void {
    const callback = (event: any, res: IpcResponse) => {
      this._zone.run(cb.bind(this, [event, res]));
    };
    this._subscribers.push({ path, callback  });
    this._ipcRenderer.on(path, callback);
  }

  public destroy() {
    this._subscribers.forEach(({ path, callback }) => {
      this._ipcRenderer.removeListener(path, callback);
    });
  }
}

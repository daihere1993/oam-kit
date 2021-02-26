import { Injectable, NgZone } from '@angular/core';
import { IpcChannel, IPCRequest, IPCResponse } from '@oam-kit/ipc';
import { ipcRenderer } from 'electron';
import { ElectronService } from './electron.service';
import { Observable } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class IpcService {
  messages: {
    name: IpcChannel;
    listener: (event: any, res: any) => void;
  }[] = [];

  ipcRenderer: typeof ipcRenderer;

  constructor(
    private electronService: ElectronService,
    private zone: NgZone,
  ) {
    if (this.electronService.isElectron) {
      this.ipcRenderer = this.electronService.ipcRenderer;
    }
  }

  public send<T>(channel: IpcChannel, req?: IPCRequest<T>): Promise<IPCResponse<any>>;
  public send<T, R>(channel: IpcChannel, req?: IPCRequest<T>): Promise<IPCResponse<R>>;
  public send<T, R>(channel: IpcChannel, req?: IPCRequest<T>): Promise<IPCResponse<R>> {
    if (this.electronService.isElectron) {
      this.ipcRenderer.send(channel, req);
      return new Promise(resolve => {
        if (req.responseChannel) {
          this.ipcRenderer.once(req.responseChannel, (event, response) => resolve(response));
        } else {
          resolve(null);
        }
      });
    }
  }

  /** Use send$ if need to keep listening the response channel. */
  public send$<T>(channel: IpcChannel, req?: IPCRequest<T>): Observable<IPCResponse<any>>;
  public send$<T, R>(channel: IpcChannel, req?: IPCRequest<T>): Observable<IPCResponse<R>>;
  public send$<T, R>(channel: IpcChannel, req?: IPCRequest<T>): Observable<IPCResponse<R>> {
    if (this.electronService.isElectron) {
      if (!req.responseChannel) {
        throw new Error('Must point out the response channel when use send$()');
      }
      this.ipcRenderer.send(channel, req);
      return new Observable(subscriber => {
        this.ipcRenderer.on(req.responseChannel, (event, response) => {
          this.zone.run(subscriber.next.bind(subscriber, response));
        });
      });
    }
  }

  public on<T>(message: IpcChannel, cb: (event: any, res: IPCResponse<T>) => void): void {
    if (this.electronService.isElectron) {
      const listener = (event: any, res: IPCResponse<T>) => {
        this.zone.run(() => {
          cb(event, res);
        });
      };
      this.messages.push({ name: message, listener });
      this.ipcRenderer.on(message, listener);
    }
  }

  public destroy() {
    this.messages.forEach(({ name, listener }) => {
      this.ipcRenderer.removeListener(name, listener);
    });
  }
}

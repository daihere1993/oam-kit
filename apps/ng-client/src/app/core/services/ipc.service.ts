import { Injectable, NgZone } from '@angular/core';
import { IpcChannel, IpcRequest, IpcResponse } from '@oam-kit/utility/types';
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

  constructor(private electronService: ElectronService, private zone: NgZone) {
    if (this.electronService.isElectron) {
      this.ipcRenderer = this.electronService.ipcRenderer;
    }
  }

  public send<T = void, R = void, U extends T = T, Q extends R = R>(channel: IpcChannel, data?: U): Promise<IpcResponse<Q>>;
  public send<T = void, R = void, U extends T = T, Q extends R = R>(channel: IpcChannel, data?: U): Promise<IpcResponse<Q>> {
    // Notice: must on/once operation first then do "send", otherwise the "on/once" listener would not work
    if (this.electronService.isElectron) {
      try {
        return new Promise((resolve) => {
          this.ipcRenderer.once(channel, (event, response) => resolve(response));
        });
      } finally {
        const req: IpcRequest<U> = { data };
        this.ipcRenderer.send(channel, req);
      }
    }
  }

  /** Use send$ if need to keep listening the response channel. */
  public send$<T = void, R = void, U extends T = T, Q extends R = R>(channel: IpcChannel, data?: U): Observable<IpcResponse<Q>>;
  public send$<T = void, R = void, U extends T = T, Q extends R = R>(channel: IpcChannel, data?: U): Observable<IpcResponse<Q>> {
    if (this.electronService.isElectron) {
      try {
        return new Observable((subscriber) => {
          this.ipcRenderer.on(channel, (event, response) => {
            this.zone.run(subscriber.next.bind(subscriber, response));
          });
        });
      } finally {
        const req: IpcRequest<U> = { data };
        this.ipcRenderer.send(channel, req);
      }
    }
  }

  public on<T>(message: IpcChannel, cb: (event: any, res: IpcResponse<T>) => void): void {
    if (this.electronService.isElectron) {
      const listener = (event: any, res: IpcResponse<T>) => {
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

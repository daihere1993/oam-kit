import { IpcChannel, IPCRequest } from '@oam-kit/ipc';
import { IpcMainEvent } from 'electron';

export interface IpcChannelInterface {
  handlers: { name: IpcChannel, fn(event: IpcMainEvent, req?: IPCRequest<any>): void }[]
}

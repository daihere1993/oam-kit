import { IpcChannel, IPCRequest } from '@oam-kit/utility/types';
import { IpcMainEvent } from 'electron';

export interface IpcChannelInterface {
  handlers: { name: IpcChannel, fn(event: IpcMainEvent, req?: IPCRequest<any>): void }[]
}

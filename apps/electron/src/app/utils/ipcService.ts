import { IpcChannel, IpcResErrorType, IpcResponse } from '@oam-kit/utility/types';
import { IpcMainEvent } from 'electron/main';
import { Logger } from 'winston';

export class IpcService {
  logger: Logger;
  event: IpcMainEvent;
  channel: IpcChannel;
  constructor(logger: Logger, event: IpcMainEvent, channel: IpcChannel) {
    this.logger = logger;
    this.event = event;
    this.channel = channel;
  }

  replyNokWithData<T = void, U extends T = T>(data: U, message: string, type: IpcResErrorType = IpcResErrorType.Expected) {
    this.logger.error(message);
    const res: IpcResponse<U> = { isOk: false, data, error: { type, message } };
    this.event.reply(this.channel, res);
  }

  replyNokWithNoData(message: string, type: IpcResErrorType = IpcResErrorType.Expected) {
    this.logger.error(message);
    const res: IpcResponse<null> = { isOk: false, data: null, error: { type, message } };
    this.event.reply(this.channel, res);
  }

  replyOkWithData<T = void, U extends T = T>(data: U) {
    const res: IpcResponse<U> = { isOk: true, data, error: { type: null, message: null } };
    this.event.reply(this.channel, res);
  }

  replyOkWithNoData() {
    const res: IpcResponse<null> = { isOk: true, data: null, error: { type: null, message: null } };
    this.event.reply(this.channel, res);
  }
}

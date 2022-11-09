import * as path from 'path';
import { getUserDataPath } from './utils';
import { createLogger, format, LoggerOptions, transports } from 'winston';
import { IpcChannel, IpcResponse } from '@oam-kit/utility/types';
import { BrowserWindow } from 'electron';

const WHOLE_LOG_FILE_NAME = 'oam-kit-all.log';
const ERROR_LOG_FILE_NAME = 'oam-kit-error.log';

export default class Logger {
  static mainWindow: BrowserWindow;
  static defaultOptions: LoggerOptions = {
    level: 'info',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:SSS' }),
      format.errors({ stack: true }),
      format.splat(),
      format.printf(info => {
        const log = `${info.timestamp} ${info.level}/${info.module}: ${info.message}`;
        
        if (info.needInformFrontEnd && this.mainWindow) {
          const res: IpcResponse<string> = { isOk: true, data: log, error: { type: null, message: null } };
          this.mainWindow.webContents.send(IpcChannel.LOG_SYNC, res);
        }

        return log;
      }),
    ),
    defaultMeta: { module: 'GENERAL', needInformFrontEnd: false },
    transports: [
      new transports.File({ filename: path.join(getUserDataPath(), 'logs', WHOLE_LOG_FILE_NAME) }),
      new transports.File({ filename: path.join(getUserDataPath(), 'logs', ERROR_LOG_FILE_NAME), level: 'error' }),
    ],
  }

  static for(module: string) {
    this.defaultOptions.defaultMeta.module = module;
    const logger = createLogger(this.defaultOptions);
    if (process.env.NODE_ENV !== 'production') {
      logger.add(new transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple()
        )
      }));
    }
    return logger;
  }
}

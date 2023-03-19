import * as path from 'path';
import { app } from 'electron';
import { getUserDataDir } from '@oam-kit/utility/backend';
import { createLogger, format, LoggerOptions, transports } from 'winston';

const WHOLE_LOG_FILE_NAME = 'oam-kit.prod.log';

const defaultOptions: LoggerOptions = {
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:SSS' }),
    format.errors({ stack: true }),
    format.splat(),
    format.printf(info => `${info.timestamp} ${info.level}/${info.module}: ${info.message}`)
  ),
  defaultMeta: { module: 'GENERAL' },
  transports: [
    new transports.File({ filename: path.join(getUserDataDir(), 'logs', WHOLE_LOG_FILE_NAME) }),
  ],
};

const Logger = {
  for(module: string) {
    console.log(`data path: ${getUserDataDir()}`);
    const options = partialDeepCopy<LoggerOptions>(defaultOptions, ['defaultMeta']);
    options.defaultMeta.module = module;
    const logger = createLogger(options);
    logger.add(new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }));
    return logger;
  },
};

function partialDeepCopy<T>(obj: T, keys: string[]): T {
  const ret = Object.assign({}, obj);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      obj[key] = Object.assign({}, obj[key]);
    }
  }

  return ret;
}

export default Logger;
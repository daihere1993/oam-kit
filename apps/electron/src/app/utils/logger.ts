import * as path from 'path';
import { getUserDataPath } from './utils';
import { createLogger, format, LoggerOptions, transports } from 'winston';

const WHOLE_LOG_FILE_NAME = 'oam-kit-all.log';
const ERROR_LOG_FILE_NAME = 'oam-kit-error.log';


const defaultOptions: LoggerOptions = {
  level: 'info',
  format: format.combine(
    format.splat(),
    format.prettyPrint(),
    format.errors({ stack: true }),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  ),
  defaultMeta: { module: 'GENERAL' },
  transports: [
    new transports.File({ filename: path.join(getUserDataPath(), 'logs', WHOLE_LOG_FILE_NAME) }),
    new transports.File({ filename: path.join(getUserDataPath(), 'logs', ERROR_LOG_FILE_NAME), level: 'error' }),
  ]
};

const Logger = {
  for(module: string) {
    defaultOptions.defaultMeta.module = module;
    const logger = createLogger(defaultOptions);
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

export default Logger;

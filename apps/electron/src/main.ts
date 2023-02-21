import { AppModule } from './app/app.module';
import { AppFactory } from './app/core/app-factory';
import Logger from './app/core/logger';
import { onActivate, onElectronReady, onWindowAllClosed } from './app/startup';

const logger = Logger.for('main.js');

try {
  const app = AppFactory.create(AppModule);
  app.on('window-all-closed', onWindowAllClosed); // Quit when all windows are closed.
  app.on('ready', onElectronReady); // App is ready to load data
  app.on('activate', onActivate); // App is activated
  app.startup();
} catch (err) {
  logger.error(err);
}

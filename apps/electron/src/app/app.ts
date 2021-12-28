import * as fs from 'fs';

import { BrowserWindow, shell, ipcMain } from 'electron';
import { rendererAppName, rendererAppPort, storeName } from '@oam-kit/utility/overall-config';
import { environment } from '../environments/environment';
import { join } from 'path';
import { format } from 'url';
import * as utils from './utils';
import { Store } from './store';
import ModelChannel from './channels/model/model.channel';
import { IpcService } from './utils/ipcService';
import { IpcChannelBase, IpcChannelHandler } from './channels/ipcChannelBase';
import { Constructor } from '@oam-kit/utility/types';
import { autoUpdater } from 'electron-updater';
import Logger from './utils/logger';

const logger = Logger.for('app.ts');

function initChannelhandlers(channel: IpcChannelBase) {
  for (const handler of channel.handlers) {
    (function(handler: IpcChannelHandler, channel: IpcChannelBase) {
      ipcMain.on(handler.name, (event, req) => {
        const ipcService = new IpcService(channel.logger, event, handler.name);
        handler.fn.call(channel, ipcService, req);
      });
    })(handler, channel);
  }
}

export default class App {
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.

  static mainWindow: Electron.BrowserWindow;
  static application: Electron.App;
  static BrowserWindow;
  static store: Store;

  public static isDevelopmentMode() {
    const isEnvironmentSet: boolean = 'ELECTRON_IS_DEV' in process.env;
    const getFromEnvironment: boolean = parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;

    return isEnvironmentSet ? getFromEnvironment : !environment.production;
  }

  private static onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      App.application.quit();
    }
  }

  private static onClose() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    App.mainWindow = null;
  }

  private static onRedirect(event: any, url: string) {
    if (url !== App.mainWindow.webContents.getURL()) {
      // this is a normal external redirect, open it in a new browser window
      event.preventDefault();
      shell.openExternal(url);
    }
  }

  private static onReady() {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    App.initAutoUpdater();
    App.initTmpFolders();
    App.initMainWindow();
    App.initChannels$().then(App.loadMainWindow.bind(this));
  }

  private static onActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (App.mainWindow === null) {
      App.onReady();
    }
  }

  private static initAutoUpdater() {
    function updateStatus(text: string) {
      logger.info(text);
    }

    autoUpdater.on('checking-for-update', () => {
      updateStatus('Checking for update...');
    })
    autoUpdater.on('update-available', (info) => {
      updateStatus('Update available.');
    })
    autoUpdater.on('update-not-available', (info) => {
      updateStatus('Update not available.');
    })
    autoUpdater.on('error', (err) => {
      updateStatus('Error in auto-updater. ' + err);
    })
    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      updateStatus(log_message);
    })
    autoUpdater.on('update-downloaded', (info) => {
      updateStatus('Update downloaded');
    });
    autoUpdater.netSession.setProxy({
      proxyRules: 'http://10.158.100.3:8080'
    });
    autoUpdater.checkForUpdatesAndNotify();
  }

  private static initTmpFolders() {
    const tmpDir = utils.getTempDir();
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    } else {
      // Clean up all tmp files
      fs.readdir(tmpDir, (err, files) => {
        if (err) throw err;

        for (const file of files) {
          fs.unlink(join(tmpDir, file), (err) => {
            if (err) throw err;
          });
        }
      });
    }
  }

  private static async initChannels$() {
    const targetPath = join(utils.getUserDataPath(), storeName);
    console.debug(`data file: ${targetPath}`);
    const store = new Store();
    // Model must be initialized first, cause which would be used in other channels
    const modelChannel = new ModelChannel(store, App.mainWindow);
    initChannelhandlers(modelChannel);
    const channelModules: { default: Constructor<IpcChannelBase> }[] = [];
    function importAll(r: __WebpackModuleApi.RequireContext) {
      r.keys().forEach((key) => {
        // To avoid duplicated import model channel
        if (!key.includes('model.channel.ts')) {
          channelModules.push(r(key));
        }
      });
    }
    importAll(require.context('./channels/', true, /\.channel.ts$/));

    for (const module of channelModules) {
      const Module = module.default;
      if (!Module) {
        const moduleName = Object.keys(module)[0];
        throw new Error(`Please use export default in ${moduleName}.ts`);
      }
      const channel = new Module(store, App.mainWindow);
      initChannelhandlers(channel);
    }
  }

  private static initMainWindow() {
    const width = 1150;
    const height = 600;

    // Create the browser window.
    App.mainWindow = new BrowserWindow({
      width: width,
      height: height,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        backgroundThrottling: false,
      },
    });
    App.mainWindow.setMenu(null);
    App.mainWindow.center();
    // App.mainWindow.maximize();

    // if main window is ready to show, close the splash window and show the main window
    App.mainWindow.once('ready-to-show', () => {
      App.mainWindow.show();
      const enableChromeDebugger = App.application.isPackaged ? false : true;
      if (enableChromeDebugger) {
        App.mainWindow.webContents.toggleDevTools();
      }
    });

    // handle all external redirects in a new browser window
    // App.mainWindow.webContents.on('will-navigate', App.onRedirect);
    // App.mainWindow.webContents.on('new-window', (event, url, frameName, disposition, options) => {
    //     App.onRedirect(event, url);
    // });

    // Emitted when the window is closed.
    App.mainWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      App.mainWindow = null;
    });
  }

  private static loadMainWindow() {
    // load the index.html of the app.
    if (!App.application.isPackaged) {
      App.mainWindow.loadURL(`http://localhost:${rendererAppPort}`);
    } else {
      App.mainWindow.loadURL(
        format({
          pathname: join(__dirname, '..', rendererAppName, 'index.html'),
          protocol: 'file:',
          slashes: true,
        })
      );
    }
  }

  static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
    // we pass the Electron.App object and the
    // Electron.BrowserWindow into this function
    // so this class has no dependencies. This
    // makes the code easier to write tests for
    // To init all app data from local store file.
    App.BrowserWindow = browserWindow;
    App.application = app;

    App.application.on('window-all-closed', App.onWindowAllClosed); // Quit when all windows are closed.
    App.application.on('ready', App.onReady); // App is ready to load data
    App.application.on('activate', App.onActivate); // App is activated
  }
}

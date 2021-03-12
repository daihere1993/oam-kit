import * as fs from 'fs'

import { BrowserWindow, shell, screen, ipcMain } from 'electron';
import { rendererAppName, rendererAppPort, storeName } from '@oam-kit/utility/overall-config';
import { environment } from '../environments/environment';
import { join } from 'path';
import { format } from 'url';
import * as utils from './utils'
import { Store } from '@oam-kit/store';
import { KitChannel } from './modules/kit';
import { ModelChannel } from './modules/model';
import { SyncCodeChannel } from './modules/sync-code';
import { ElectronSolid } from '@oam-kit/store/solid/electron-solid';
import { LockInfoChannel } from './modules/lock-info';

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

  private static initTmpFolders() {
    const tmpDir = utils.getTmpDir();
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
    const store = new Store({ solid: new ElectronSolid(targetPath) });
    await store.startup$();
    const modelChannel = new ModelChannel(store);
    await modelChannel.startup$();
    const channels: any[] = [
      modelChannel,
      new KitChannel({ mainWindow: App.mainWindow }),
      new SyncCodeChannel(store),
      new LockInfoChannel(store, App.mainWindow)
    ];
    for (const channel of channels) {
      for (const handler of channel.handlers) {
        ipcMain.on(handler.name, handler.fn.bind(channel));
      }
    }
  }

  private static initMainWindow() {
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    const width = Math.min(900, workAreaSize.width || 900);
    const height = App.application.isPackaged? Math.min(540, workAreaSize.height || 540) : Math.min(720, workAreaSize.height || 720);

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

    // if main window is ready to show, close the splash window and show the main window
    App.mainWindow.once('ready-to-show', () => {
      App.mainWindow.show();
      const enableChromeDebugger = App.application.isPackaged? false : true;
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

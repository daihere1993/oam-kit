import { join } from 'path';
import { format } from 'url';
import { app, BrowserWindow } from 'electron';
import { ElectronContext } from './core/electron-context';
import { AutoUpdater } from './core/auto-updater';
import Logger from './core/logger';
import fixPath from 'fix-path';

const logger = Logger.for('startup');

function initMainWindow(): BrowserWindow {
  const width = 770;
  const height = 580;

  // Create the browser window.
  let mainWindow = new BrowserWindow({
    width: width,
    height: height,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
  });
  mainWindow.setMenu(null);
  mainWindow.center();
  // mainWindow.maximize();

  // if main window is ready to show, close the splash window and show the main window
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    const enableChromeDebugger = app.isPackaged ? false : true;
    if (enableChromeDebugger) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // handle all external redirects in a new browser window
  // mainWindow.webContents.on('will-navigate', App.onRedirect);
  // mainWindow.webContents.on('new-window', (event, url, frameName, disposition, options) => {
  //     App.onRedirect(event, url);
  // });

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  return mainWindow;
}

function loadMainWindow(mainWindow: BrowserWindow): void {
  // load the index.html of the app.
  if (!app.isPackaged) {
    mainWindow.loadURL(`http://localhost:4200`);
  } else {
    mainWindow.loadURL(
      format({
        pathname: join(__dirname, '..', 'ng-client', 'index.html'),
        protocol: 'file:',
        slashes: true,
      })
    );
  }
}

export function onElectronReady(electronContext: ElectronContext) {
  logger.info('Electron is ready!!!');

  // Copy the $PATH of shell into process.env.PATH in case can not access available path in packed app
  fixPath();

  // due to cannot support auto update in mac os if without app certification
  // thus only support this feature in windows
  if (process.platform === 'win32') {
    const autoUpdater = new AutoUpdater();
    autoUpdater.initialize();
  }

  const mainWindow = initMainWindow();
  loadMainWindow(mainWindow);
  electronContext.mainWindow = mainWindow;
  electronContext.onElectronReady.next();
  electronContext.onElectronReady.complete();
}

export function onWindowAllClosed() {}

export function onActivate() {}

import { dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import { UpdateDownloadedEvent } from 'electron-updater/out/main';
import Logger from './logger';

const logger = Logger.for('AutoUpdater');

export class AutoUpdater {
  public initialize(): void {
    autoUpdater.logger = logger;
    // 当有新的 release 时不会自动安装，而是通过弹出框提示用户是否安装新的版本
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.netSession.setProxy({
      proxyRules: 'http://10.158.100.3:8080'
    });
  
    autoUpdater.on('checking-for-update', () => {
      this.updateStatus('Checking for update...');
    });
    autoUpdater.on('update-available', (info: UpdateDownloadedEvent) => {
      this.updateStatus(`New version available(${info.version}).`);
    });
    autoUpdater.on('update-not-available', () => {
      this.updateStatus('Update not available.');
    });
    autoUpdater.on('error', (err) => {
      this.updateStatus('Error in auto-updater: ' + err);
    });
    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      this.updateStatus(log_message);
    });
    
    autoUpdater.on('update-downloaded', (info: UpdateDownloadedEvent) => {
      this.updateStatus(`Update downloaded.`);
      const dialogOpts = {
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message: `New version available${info.version}`,
        detail: `A new version(${info.version}) has been downloaded. Restart the application to apply the updates.`
      };
    
      dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall();
      });
    });
  }

  private updateStatus(text: string) {
    logger.info(text);
  }
}

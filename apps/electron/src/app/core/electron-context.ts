import { BrowserWindow } from "electron";
import { Subject } from "rxjs";

export class ElectronContext {
  public mainWindow: BrowserWindow;
  public onElectronReady = new Subject<void>();
}
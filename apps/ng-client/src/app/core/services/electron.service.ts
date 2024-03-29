import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import fs from 'fs';
import { ipcRenderer, webFrame, shell } from 'electron';
import childProcess from 'child_process';

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  shell!: typeof shell;

  ipcRenderer!: typeof ipcRenderer;

  webFrame!: typeof webFrame;

  childProcess!: typeof childProcess;

  fs!: typeof fs;

  get isElectron(): boolean {
    return !!(window && window.process && window.process.type);
  }

  constructor() {
    // Conditional imports
    if (this.isElectron) {
      this.shell = window.require('electron').shell;
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.webFrame = window.require('electron').webFrame;

      this.childProcess = window.require('child_process');
      this.fs = window.require('fs');
    }
  }
}

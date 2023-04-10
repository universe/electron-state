import electron, { IpcRendererEvent, IpcMainEvent } from 'electron';

import { Transport, TransportEventCallback } from './types.js';

const { ipcRenderer, ipcMain, BrowserWindow } = electron;

export default class ElectronTransport extends Transport {
  isRenderer(): boolean {
    return process && process.type === 'renderer';
  }
  on(name: string, cb: TransportEventCallback): void {
    if (this.isRenderer()) {
      ipcRenderer.on(name, (e: IpcRendererEvent, ...args: any[]) => cb(e.sender, ...args));
    }
    else {
      ipcMain.on(name, (e: IpcMainEvent, ...args: any[]) => cb(e.sender, ...args));
    }
  }
  once(name: string, cb: TransportEventCallback): void {
    if (this.isRenderer()) {
      ipcRenderer.once(name, (e: IpcRendererEvent, ...args: any[]) => cb(e.sender, ...args));
    }
    else {
      ipcMain.once(name, (e: IpcMainEvent, ...args: any[]) => cb(e.sender, ...args));
    }
  }
  send(channel: string, ...args: any[]): void {
    if (this.isRenderer()) {
      ipcRenderer.send(channel, ...args);
    }
    else {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(channel, ...args);
      }
    }
  }
}

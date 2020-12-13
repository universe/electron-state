import { app, BrowserWindow } from 'electron';
import * as path from 'path';

import TestState from './TestState';
import UserState from './UserState';

// The main process can listen for changes to the state object.
UserState.onChange((user) => {
  if (user.isLoggedIn) {
    console.log(`${user.firstName} ${user.lastName} has logged in. Auto logging out in 10s.`);
    setTimeout(() => UserState.logOut(), 10000);
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  win.loadFile(path.join(__dirname, '../../../static/index.html'));
}

app.whenReady().then(createWindow);

console.log(TestState.toJSON());

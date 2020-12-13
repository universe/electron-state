import { app, BrowserWindow } from 'electron';
import * as path from 'path';

import UserState from './UserState';

// The main process can listen for changes to the state object.
let logoutTimer: NodeJS.Timeout | null;
UserState.onChange((user) => {
  logoutTimer && clearTimeout(logoutTimer);
  if (user.isLoggedIn) {
    console.log(`${user.firstName} ${user.lastName} has logged in. Auto logging out in 10s.`);
    logoutTimer = setTimeout(() => UserState.logOut(), 10000);
  }
});

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  win.loadFile(path.join(__dirname, '../../../static/index.html'));
});

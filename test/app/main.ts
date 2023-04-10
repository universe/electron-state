import { app, BrowserWindow } from 'electron';
import * as path from 'path';

import UserState from './UserState.js';

// The main process can listen for changes to the state object.
let logoutTimer: NodeJS.Timeout | null;
UserState.onChange((user) => {
  if (user.isLoggedIn && user.ttl === 0 && !logoutTimer) {
    console.log(`${user.firstName} ${user.lastName} has logged in. Auto logging out in 10s.`);
    UserState.setState({ ttl: 10 });
    logoutTimer = setTimeout(() => {
      logoutTimer = null;
      UserState.logOut();
    }, 10000);
  }
});

setInterval(() => {
  const { ttl } = UserState.toJSON();
  if (ttl > 0) {
    UserState.setState({ ttl: ttl - 1 });
  }
}, 1000);

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // TODO: Enable this.
      /* @ts-ignore-next-line */
      enableRemoteModule: true,
    },
  });

  win.loadFile(path.join(__dirname, '../../../static/index.html'));
});

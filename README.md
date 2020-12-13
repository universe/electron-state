# Electron Store
React-like IPC backed state objects for Electron.

## Example
You can run this example yourself! Just run `yarn start` in this repo to play with this dummy login flow. The files live in this repo at `/test/app`.

### UserState.ts
```ts
import ElectronState, { main, renderer, State } from 'electron-state';

// Extend the `ElectronState` base class to create a new IPC based shared memory model.
export default class UserState extends ElectronState {

  // Properties declared on your model define the interface of this state object.
  isLoggedIn: boolean = false;
  firstName: string | null = null;
  lastName: string | null = null;
  email: string | null = null;

  // The `@main` decorator forces async methods to run in Electron's main process.
  @main static async logIn(email: string, password: string): Promise<boolean> {
    // If you need code that can / should only execute in one process, make sure you import it only as needed.
    const { db } = await import('database');

    const user = await db.users.getByEmail(email);

    if (user?.password !== password) { return false; }

    // Use `ElectronState.setState()` to modify state objects.
    UserState.setState({
      isLoggedIn: true,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });

    return true;
  }

  // The `@renderer` decorator forces async methods to run in Electron's renderer process.
  @renderer static async logOut(): Promise<void> {
    // Access state data at any time by calling `ElectronState.toJSON()`
    const data: State<UserState> = UserState.toJSON();

    if (!data.isLoggedIn) { return; }

    // Use `ElectronState.setState()` to modify state objects.
    UserState.setState({
      isLoggedIn: false,
      firstName: null,
      lastName: null,
      email: null,
    });

    alert("You've been logged out!");
  }
}
```

### main.ts
```ts
import { app, BrowserWindow } from 'electron';

// You can import your custom `ElectronState` models into the main process.
import UserState from './UserState';

// The main process can listen for changes to the state object. It is passed a copy of the state data.
UserState.onChange((user) => {
  if (user.isLoggedIn) {
    console.log(`${user.firstName} ${user.lastName} has logged in. Auto logging out in 10s.`);

    // As defined in our UserState class, the `UserState.logOut()` method will always be run in the renderer process.
    setTimeout(() => UserState.logOut(), 10000);
  }
});

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadFile('/static/index.html'));
});
```

### app.tsx
```tsx
import * as React from 'react';
import * as ReactDOM from 'react-dom';

// ElectronState delivers a React hook for your convenience.
import { useElectronState } from 'electron-state';

// You can import your custom `ElectronState` models into the renderer process.
import UserState from './UserState';

async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
  evt.preventDefault();
  const email = (evt.currentTarget.elements.namedItem('email') as HTMLInputElement)?.value || null;
  const password = (evt.currentTarget as HTMLFormElement.elements.namedItem('password') as HTMLInputElement)?.value || null;
  if (!email || !password) {
    alert('Please provide your email and password');
    return;
  }

  // As defined in our UserState class, the `UserState.logIn` method will always be run in the main process.
  const logInSuccess = await UserState.logIn(email, password);
  alert(logInSuccess ? 'Successfully logged in!' : 'Incorrect login information.');
}

function App() {
  // ElectronState delivers a React hook for your convenience.
  const [ user, setUser ] = useElectronState(UserState);

  if (user.isLoggedIn) {
    return <section>
      <h1>{user.firstName} {user.lastName} is Logged In</h1>
      <button onClick={() => setUser({ isLoggedIn: false })}>Log Out</button>
    </section>;
  }

  return <form onSubmit={handleSubmit}>
    <input type="email" name="email" />
    <input type="password" name="password" />
    <button type="submit">Log In</button>
  </form>;
}

ReactDOM.render(<App />, document.body);
```
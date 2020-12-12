# Electron Store

React-like IPC backed state objects for Electron.

```ts
// UserState.ts
import ElectronState, { main, renderer } from 'electron-state';

export default class UserState extends ElectronState {
  isLoggedIn: boolean = false;
  firstName: string | null = null;
  lastName: string | null = null;
  email: string | null = null;

  @main static async logIn(email: string, password: string): Promise<boolean> {
    const db = await import('database');
    const user = await db.users.getByEmail(email);
    if (user?.password !== password) { return false; }
    UserState.setState({
      isLoggedIn: true,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
    return true;
  }

  @main static async logOut(): Promise<void> {
    UserState.setState({
      isLoggedIn: false,
      firstName: null,
      lastName: null,
      email: null,
    });
  }
}
```
```ts
// main.ts
import UserState from './UserState';

UserState.onChange((user) => {
  if (user.isLoggedIn) {
    console.log(`${user.firstName} ${user.lastName} has logged in. Auto logging out in 10s.`);
    setTimeout(() => UserState.logOut(), 10000);
  }
});
```
```tsx
// app.tsx
import { render, h } from 'preact';
import { useElectronState } from 'electron-state';
import UserState from './UserState';

function handleSubmit(evt: HTMLSubmitEvent) {
  const email = evt.target?.elements?.email || null;
  const password = evt.target?.elements?.password || null;
  if (!email || !password) {
    alert('Please provide your email and password');
    return;
  }
  const logInSuccess = UserState.logIn(email, password);
  alert(logInSuccess ? 'Successfully logged in!' : 'Incorrect login information.');
}

function App() {
  const [ user, setUser ] = useElectronState(UserState);
  if (user.isLoggedIn) {
    return <h1>{user.firstName} {user.lastName} is Logged In</h1>;
  }
  return <form onSubmit={handleSubmit}>
    <input type="email" name="email" />
    <input type="password" name="password" />
    <button type="submit" />
  </form>;
}

render(App, document.body);
```
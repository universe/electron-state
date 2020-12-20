import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { useElectronState } from '../../src/hooks';

import UserState from './UserState';

async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
  evt.preventDefault();
  const email = (evt.currentTarget.elements.namedItem('email') as HTMLInputElement)?.value || null;
  const password = (evt.currentTarget.elements.namedItem('password') as HTMLInputElement)?.value || null;
  if (!email || !password) {
    alert('Please provide your email and password');
    return;
  }
  const logInSuccess = await UserState.logIn(email, password);
  !logInSuccess && alert('Incorrect login information. Use the password "password".');
}

function App(): JSX.Element {
  const [ user, setUser ] = useElectronState(UserState);
  if (user.isLoggedIn) {
    return <section>
      <h1>{user.firstName} {user.lastName} is Logged In</h1>
      <h2>Logging out in: {user.ttl}</h2>
      <button onClick={() => setUser({ isLoggedIn: false })}>Log Out</button>
    </section>;
  }
  return <form onSubmit={handleSubmit}>
    <input type="email" name="email" placeholder="email" />
    <input type="password" name="password" placeholder="password" />
    <button type="submit">Log In</button>
  </form>;
}

ReactDOM.render(<App />, document.body);

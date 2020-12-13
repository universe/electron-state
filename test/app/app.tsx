import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { useElectronState } from '../../src/hooks';

import TestState from './TestState';
import UserState from './UserState';

console.log(TestState.toJSON());

(async() => {
  console.log(await TestState.multiplyInMain(2, 2));
  console.log(await TestState.multiplyInRenderer(2, 3));
})();

async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
  evt.preventDefault();
  const email = (evt.currentTarget.elements.namedItem('email') as HTMLInputElement)?.value || null;
  const password = (evt.currentTarget.elements.namedItem('password') as HTMLInputElement)?.value || null;
  if (!email || !password) {
    alert('Please provide your email and password');
    return;
  }
  const logInSuccess = await UserState.logIn(email, password);
  alert(logInSuccess ? 'Successfully logged in!' : 'Incorrect login information.');
}

function App(): JSX.Element {
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

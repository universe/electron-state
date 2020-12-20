
import { ElectronState, main, renderer, State } from '../../src';

// Extend the `ElectronState` base class to create a new IPC based shared memory model.
export default class UserState extends ElectronState {
  // Properties declared on your model define the interface of this state object.
  isLoggedIn = false;
  firstName: string | null = null;
  lastName: string | null = null;
  email: string | null = null;
  ttl = 0;

  // The `@main` decorator forces async methods to run in Electron's main process.
  @main static async logIn(email: string, password: string): Promise<boolean> {
    // If you need code that can / should only execute in one process, make sure you import it only as needed.
    const { db } = await import('./database');

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
    // Access state data by calling `ElectronState.toJSON()`
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

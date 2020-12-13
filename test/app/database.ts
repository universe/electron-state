interface User {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export const db = ({
  users: {
    getByEmail(email: string): User {
      return {
        firstName: 'Adam',
        lastName: 'Miller',
        email,
        password: 'password',
      };
    },
  },
});

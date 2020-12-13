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
        firstName: 'Test',
        lastName: 'User',
        email,
        password: 'password',
      };
    },
  },
});

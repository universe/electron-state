export interface User {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// ✨ A brilliant fake little database ✨
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

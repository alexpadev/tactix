import { createContext } from 'react';

export const UserContext = createContext({
  token: null,
  setToken: () => {},

  logout: () => {},

  hasTeam: false,
  setHasTeam: () => {},
});

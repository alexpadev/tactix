import { useContext, useCallback } from 'react';
import { UserContext } from '../context/UserContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';


export function useApi() {
  const { token, logout } = useContext(UserContext);

  const apiFetch = useCallback(
    async (path, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      let res;
      try {
        res = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers,
        });
      } catch (networkError) {
        throw networkError;
      }

      if (res.status === 401/* || res.status === 403*/) {
        logout();
        throw new Error('Unauthorized');
      }

      return res;
    },
    [token, logout]
  );

  return { apiFetch };
}

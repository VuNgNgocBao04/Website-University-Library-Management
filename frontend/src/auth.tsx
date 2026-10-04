import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, refreshCsrf } from './api';
import type { Account } from './types';
const Context = createContext<{
  user: Account | null;
  loading: boolean;
  setUser: (u: Account | null) => void;
  logout: () => Promise<void>;
}>({ user: null, loading: true, setUser: () => {}, logout: async () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<Account>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, []);
  async function logout() {
    await api('/auth/logout', 'POST');
    setUser(null);
    await refreshCsrf();
  }
  return <Context.Provider value={{ user, loading, setUser, logout }}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);

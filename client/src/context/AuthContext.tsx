import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { E, TOKEN_KEY, http, setUnauthorizedHandler } from '../api';
import type { AuthUser } from '../types';

interface Ctx { user: AuthUser | null; ready: boolean; login: (phone: string, password: string) => Promise<AuthUser>; logout: () => void }
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pickUser = (b: any): AuthUser => b?.data?.user ?? b?.data ?? b?.user ?? b;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const logout = useCallback(() => { sessionStorage.removeItem(TOKEN_KEY); setUser(null); }, []);
  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!sessionStorage.getItem(TOKEN_KEY)) { setReady(true); return; }
    http.get(E.me).then(r => setUser(pickUser(r.data))).catch(() => sessionStorage.removeItem(TOKEN_KEY)).finally(() => setReady(true));
  }, [logout]);
  const login = async (phone: string, password: string) => {
    const b = (await http.post(E.login, { phone, password })).data;
    const d = b.data ?? b; sessionStorage.setItem(TOKEN_KEY, d.token); setUser(d.user); return d.user as AuthUser;
  };
  return <AuthCtx.Provider value={{ user, ready, login, logout }}>{children}</AuthCtx.Provider>;
}

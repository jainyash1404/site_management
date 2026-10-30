import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  E,
  TOKEN_KEY,
  http,
  setUnauthorizedHandler,
} from '../api';

import type {
  AuthUser,
  AdminPermission,
} from '../types';

interface Ctx {
  user: AuthUser | null;
  ready: boolean;
  login: (phone: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  hasPermission: (permission: AdminPermission) => boolean;
  hasAnyPermission: (permissions: AdminPermission[]) => boolean;
  isSuperAdmin: boolean;
}

const AuthCtx = createContext<Ctx>(null!);

export const useAuth = () => useContext(AuthCtx);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pickUser = (b: any): AuthUser =>
  b?.data?.user ?? b?.data ?? b?.user ?? b;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);

    if (!sessionStorage.getItem(TOKEN_KEY)) {
      setReady(true);
      return;
    }

    http.get(E.me)
      .then(r => {
        const currentUser = pickUser(r.data);

        if (!currentUser?.id || !currentUser?.role) {
          logout();
          return;
        }

        setUser(currentUser);
      })
      .catch(logout)
      .finally(() => setReady(true));

  }, [logout]);

  const login = async (
    phone: string,
    password: string
  ): Promise<AuthUser> => {
    const response = (
      await http.post(E.login, { phone, password })
    ).data;

    const data = response.data ?? response;

    if (!data.token || !data.user) {
      throw new Error('Invalid login response');
    }

    const loggedInUser = pickUser(data.user);

    if (!loggedInUser?.id || !loggedInUser?.role) {
      throw new Error('Invalid user information');
    }

    sessionStorage.setItem(TOKEN_KEY, data.token);
    setUser(loggedInUser);

    return loggedInUser;
  };

  const isSuperAdmin =
    user?.role === 'ADMIN' &&
    user?.isSuperAdmin === true;

  const hasPermission = useCallback(
    (permission: AdminPermission): boolean => {
      if (!user || user.role !== 'ADMIN') {
        return false;
      }

      if (user.isSuperAdmin === true) {
        return true;
      }

      return user.permissions?.includes(permission) ?? false;
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: AdminPermission[]): boolean =>
      permissions.some(hasPermission),
    [hasPermission]
  );

  return (
    <AuthCtx.Provider
      value={{
        user,
        ready,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
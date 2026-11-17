import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onUnauthorized, setApiToken } from '../lib/api';
import { loadSession, saveSession, type Session } from '../lib/session';
import type { ProUser, StaffUser } from '../lib/types';

interface AuthApi {
  session: Session | null;
  loginStaff: (email: string, password: string) => Promise<void>;
  loginPro: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  /** Set when the session ended because the server rejected the token. */
  expired: boolean;
}

const AuthContext = createContext<AuthApi | null>(null);

const initial = loadSession();
setApiToken(initial?.token ?? null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(initial);
  const [expired, setExpired] = useState(false);
  const queryClient = useQueryClient();

  const apply = useCallback(
    (next: Session | null) => {
      setApiToken(next?.token ?? null);
      saveSession(next);
      setSession(next);
      queryClient.clear();
    },
    [queryClient],
  );

  useEffect(() => {
    onUnauthorized(() => {
      setExpired(true);
      apply(null);
    });
    return () => onUnauthorized(null);
  }, [apply]);

  const loginStaff = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ token: string; user: StaffUser }>('/admin/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuthRedirect: true,
      });
      setExpired(false);
      apply({ kind: 'staff', token: res.token, user: res.user });
    },
    [apply],
  );

  const loginPro = useCallback(
    async (phone: string, password: string) => {
      const res = await api<{ token: string; user: ProUser }>('/pro/auth/login', {
        method: 'POST',
        body: { phone, password },
        skipAuthRedirect: true,
      });
      setExpired(false);
      apply({ kind: 'pro', token: res.token, user: res.user });
    },
    [apply],
  );

  const logout = useCallback(() => {
    setExpired(false);
    apply(null);
  }, [apply]);

  const value = useMemo(() => ({ session, loginStaff, loginPro, logout, expired }), [session, loginStaff, loginPro, logout, expired]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useStaff(): StaffUser | null {
  const { session } = useAuth();
  return session?.kind === 'staff' ? session.user : null;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api';
import { setUnauthorizedHandler, tokenStore } from '../../api/client';
import type { LoginRequest, RegisterRequest, User } from '../../types/api';

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (b: LoginRequest) => Promise<void>;
  register: (b: RegisterRequest) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => tokenStore.get() !== null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!tokenStore.get()) return;
    authApi.me().then((r) => setUser(r.user)).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
      qc.clear();
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${redirect}&expired=1`, { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate, location, qc]);

  const login = useCallback(async (b: LoginRequest) => {
    const r = await authApi.login(b);
    tokenStore.set(r.token);
    setUser(r.user);
  }, []);
  const register = useCallback(async (b: RegisterRequest) => {
    const r = await authApi.register(b);
    tokenStore.set(r.token);
    setUser(r.user);
  }, []);
  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    qc.clear();
    navigate('/login', { replace: true });
  }, [navigate, qc]);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthRoot() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const { pathname, search } = useLocation();
  if (loading) return <div className="fullpage" role="status">Loading…</div>;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(pathname + search)}`} replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  if (loading) return <div className="fullpage" role="status">Loading…</div>;
  if (user) return <Navigate to={params.get('redirect') || '/projects'} replace />;
  return <Outlet />;
}

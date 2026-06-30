import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../services/api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  guestLogin: (name: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem("pymeet_user");
    try {
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("pymeet_token"));
  const [loading, setLoading] = useState(() => {
    const cachedUser = localStorage.getItem("pymeet_user");
    const cachedToken = localStorage.getItem("pymeet_token");
    return !(cachedUser && cachedToken);
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    authApi.me().then(({ data }) => {
      localStorage.setItem("pymeet_user", JSON.stringify(data));
      setUser(data);
    }).catch(() => {
      localStorage.removeItem("pymeet_token");
      localStorage.removeItem("pymeet_user");
      setToken(null);
      setUser(null);
    }).finally(() => setLoading(false));
  }, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    login: async (email, password) => {
      const { data } = await authApi.login({ email, password });
      localStorage.setItem("pymeet_token", data.access_token);
      localStorage.setItem("pymeet_user", JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
    },
    guestLogin: async (name) => {
      const { data } = await authApi.guestLogin({ name });
      localStorage.setItem("pymeet_token", data.access_token);
      localStorage.setItem("pymeet_user", JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
    },
    register: async (name, email, password) => {
      const { data } = await authApi.register({ name, email, password });
      localStorage.setItem("pymeet_token", data.access_token);
      localStorage.setItem("pymeet_user", JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
    },
    logout: () => {
      localStorage.removeItem("pymeet_token");
      localStorage.removeItem("pymeet_user");
      setToken(null);
      setUser(null);
    },
    setUser: (u: User) => {
      localStorage.setItem("pymeet_user", JSON.stringify(u));
      setUser(u);
    }
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

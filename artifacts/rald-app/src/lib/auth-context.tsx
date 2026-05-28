// RALD Auth Context — wraps RALD Auth SDK for React tree
// LILCKY STUDIO LIMITED
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { raldAuth } from "./rald-auth-sdk";
import type { RaldUser } from "./rald-auth-sdk";

export type User = RaldUser;

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage via RALD SDK
    raldAuth.init()
      .then((session) => {
        if (session) { setUser(session.user); setToken(session.token); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Subscribe to future auth state changes (e.g. from other tabs)
    return raldAuth.onAuthStateChange((session) => {
      setUser(session?.user ?? null);
      setToken(session?.token ?? null);
    });
  }, []);

  const login = (t: string, u: User) => {
    raldAuth.setSession({ token: t, user: u });
    localStorage.setItem("rald_auth_token", t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    raldAuth.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

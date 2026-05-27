import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, User } from "./api";

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
    const stored = localStorage.getItem("rald_token");
    if (stored) {
      api.auth
        .me(stored)
        .then((u) => {
          setUser(u);
          setToken(stored);
        })
        .catch(() => localStorage.removeItem("rald_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (t: string, u: User) => {
    localStorage.setItem("rald_token", t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("rald_token");
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

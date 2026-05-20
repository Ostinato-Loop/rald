import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { apiCall } from "./api";

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  token?: string;
  access_token?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("rald_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (_error) {
          // intentionally ignored
        }
    }
    setLoading(false);
  }, []);

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem("rald_user", JSON.stringify(u));
  };

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem("rald_user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("rald_user");
    apiCall("/logout", { method: "POST" }).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

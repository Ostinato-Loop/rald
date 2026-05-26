import { useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("rald_token");
    if (!token && location !== "/login") {
      setLocation("/login");
    }
  }, [location, setLocation]);

  const logout = () => {
    localStorage.removeItem("rald_token");
    setLocation("/login");
  };

  return { logout, isAuthenticated: !!localStorage.getItem("rald_token") };
}

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

const clearTokens = () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  localStorage.removeItem("active_unit_id");
  localStorage.removeItem("filter_unit_id");
};
const storeToken = (token, keep) => {
  clearTokens();
  (keep ? localStorage : sessionStorage).setItem("token", token);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) { setReady(true); return; }
    api.get("/auth/me")
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setReady(true));
  }, []);

  const login = async (username, password, keep = true) => {
    const res = await api.post("/auth/login", { username, password });
    storeToken(res.token, keep);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload) => {
    const res = await api.post("/auth/register", payload);
    storeToken(res.token, true);
    setUser(res.user);
    return res.user;
  };

  const setSession = (token, userData) => {
    storeToken(token, true);
    setUser(userData);
  };

  const refreshUser = async () => {
    try {
      const u = await api.get("/auth/me");
      setUser(u);
      return u;
    } catch {
      return null;
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, setSession, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

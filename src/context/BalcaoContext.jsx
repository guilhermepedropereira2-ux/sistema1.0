import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasRole } from "@/lib/roles";

const BalcaoContext = createContext({
  isBalcaoMode: false,
  toggleBalcaoMode: () => {},
  setBalcaoMode: () => {},
});

export function BalcaoProvider({ children }) {
  const { user } = useAuth();
  const isCaixaRole = hasRole(user, "caixa") || hasRole(user, "recepcao");

  const [isBalcaoMode, setIsBalcaoMode] = useState(() => {
    try {
      const stored = localStorage.getItem("modo_balcao_seguro");
      if (stored !== null) return stored === "true";
      return isCaixaRole;
    } catch {
      return isCaixaRole;
    }
  });

  useEffect(() => {
    if (isCaixaRole) {
      setIsBalcaoMode(true);
    }
  }, [isCaixaRole]);

  const toggleBalcaoMode = () => {
    setIsBalcaoMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("modo_balcao_seguro", String(next));
      } catch {}
      return next;
    });
  };

  const setBalcaoMode = (val) => {
    setIsBalcaoMode(val);
    try {
      localStorage.setItem("modo_balcao_seguro", String(val));
    } catch {}
  };

  return (
    <BalcaoContext.Provider value={{ isBalcaoMode, toggleBalcaoMode, setBalcaoMode, isCaixaRole }}>
      {children}
    </BalcaoContext.Provider>
  );
}

export const useBalcao = () => useContext(BalcaoContext);

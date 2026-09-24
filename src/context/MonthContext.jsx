import { createContext, useContext, useState, useEffect } from "react";
import { currentMonth } from "@/lib/format";

const MonthContext = createContext(null);

export function MonthProvider({ children }) {
  const [month, setMonth] = useState(currentMonth());
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    const handleRefresh = () => setTick((t) => t + 1);
    window.addEventListener("refresh-dashboard-data", handleRefresh);
    return () => window.removeEventListener("refresh-dashboard-data", handleRefresh);
  }, []);

  return (
    <MonthContext.Provider value={{ month, setMonth, tick, refresh }}>
      {children}
    </MonthContext.Provider>
  );
}

export const useMonth = () => useContext(MonthContext);

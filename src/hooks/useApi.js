import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useMonth } from "@/context/MonthContext";

export function useApi(fn, deps = []) {
  const { tick, month } = useMonth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [internalTick, setInternalTick] = useState(0);

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const mutate = useCallback(() => {
    setInternalTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let active = true;
    // Se já temos dados, fazemos atualização silenciosa em background para não piscar a interface
    if (data === null) {
      setLoading(true);
    }

    Promise.resolve(fnRef.current(api))
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, month, internalTick, ...deps]);

  return { data, loading, error, mutate, reload: mutate };
}

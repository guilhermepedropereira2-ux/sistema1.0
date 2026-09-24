import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.resolve(fn(api)).then((d) => active && setData(d)).finally(() => active && setLoading(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);
  return { data, loading, reload };
}

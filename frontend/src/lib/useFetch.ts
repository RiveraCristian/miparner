import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api<T>(path)
      .then((d) => { setData(d); setError(""); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

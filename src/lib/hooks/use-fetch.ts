"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";

interface UseFetchOptions {
  toastOnError?: boolean;
  enabled?: boolean;
}

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: UseFetchOptions = {}
) {
  const { toastOnError = false, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const toastOnErrorRef = useRef(toastOnError);

  useEffect(() => {
    toastOnErrorRef.current = toastOnError;
  }, [toastOnError]);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Request failed";
      setError(message);
      if (toastOnErrorRef.current) toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : "Request failed";
          setError(message);
          if (toastOnErrorRef.current) toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetcher, ...deps]);

  return { data, loading, error, reload: run, setData };
}
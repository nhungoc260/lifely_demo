"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, toApiError } from "@/lib/api";

interface State<T> {
  key: string | null;
  tick: number;
  data?: T;
  error?: ApiError;
}

/**
 * Hook lấy dữ liệu từ API thật. `key` đổi (hoặc gọi reload) thì tải lại; key = null thì tạm dừng.
 * Giữ dữ liệu cũ trong lúc tải trang mới (phù hợp phân trang) và cho phép cập nhật cục bộ bằng mutate (realtime).
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<State<T>>({ key: null, tick: -1 });
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    fetcherRef
      .current()
      .then((data) => alive && setState({ key, tick, data }))
      .catch((e) => alive && setState((s) => ({ key, tick, data: s.data, error: toApiError(e) })));
    return () => {
      alive = false;
    };
  }, [key, tick]);

  const loading = key !== null && (state.key !== key || state.tick !== tick);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const mutate = useCallback((fn: (prev: T | undefined) => T | undefined) => {
    setState((s) => ({ ...s, data: fn(s.data) }));
  }, []);

  return {
    data: state.data,
    error: loading ? undefined : state.error,
    loading,
    initialLoading: loading && state.data === undefined,
    reload,
    mutate,
  };
}

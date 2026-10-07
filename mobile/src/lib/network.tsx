import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from './config';

interface OfflineContextValue {
  isOffline: boolean;
  retryCount: number;
  retry: () => void;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOffline: false,
  retryCount: 0,
  retry: () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (mounted) setIsOffline(!res.ok);
      } catch {
        if (mounted) setIsOffline(true);
      }
    };
    check();
    intervalRef.current = setInterval(check, 15000);
    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return (
    <OfflineContext.Provider value={{ isOffline, retryCount, retry }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  backoffMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

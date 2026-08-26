import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { setAuthTokenProvider } from '@/lib/http';
import type { BuilderSession } from '@/types/api';

const BUILDER_SESSION_KEY = 'builder.session';

interface BuilderAuthContextValue {
  session: BuilderSession | null;
  isLoading: boolean;
  signIn: (session: BuilderSession) => Promise<void>;
  signOut: () => Promise<void>;
}

const BuilderAuthContext = createContext<BuilderAuthContextValue | null>(null);

export function BuilderAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<BuilderSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef<BuilderSession | null>(null);

  useEffect(() => {
    setAuthTokenProvider(() => sessionRef.current?.token ?? null);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(BUILDER_SESSION_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as BuilderSession;
            sessionRef.current = parsed;
            setSession(parsed);
          } catch {}
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (next: BuilderSession) => {
    sessionRef.current = next;
    setSession(next);
    await AsyncStorage.setItem(BUILDER_SESSION_KEY, JSON.stringify(next));
  }, []);

  const signOut = useCallback(async () => {
    sessionRef.current = null;
    setSession(null);
    await AsyncStorage.removeItem(BUILDER_SESSION_KEY);
  }, []);

  const value = useMemo(
    () => ({ session, isLoading, signIn, signOut }),
    [session, isLoading, signIn, signOut],
  );

  return <BuilderAuthContext.Provider value={value}>{children}</BuilderAuthContext.Provider>;
}

export function useBuilderAuth(): BuilderAuthContextValue {
  const context = useContext(BuilderAuthContext);
  if (!context) {
    throw new Error('useBuilderAuth must be used within a BuilderAuthProvider');
  }
  return context;
}

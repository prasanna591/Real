import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useSession } from '@/lib/session';
import { followBuilder, getFeed, listBuilderSuggestions, listFollowing, unfollowBuilder } from '@/services/api';
import type { BuilderCard, FeedResponse } from '@/types/api';

interface FollowContextValue {
  following: BuilderCard[];
  suggestions: BuilderCard[];
  feed: FeedResponse | null;
  isLoading: boolean;
  refresh: () => Promise<BuilderCard[]>;
  loadSuggestions: () => Promise<void>;
  toggle: (builderId: number) => Promise<boolean>;
  isFollowing: (builderId: number) => boolean;
}

const FollowContext = createContext<FollowContextValue | null>(null);

export function FollowProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [following, setFollowing] = useState<BuilderCard[]>([]);
  const [suggestions, setSuggestions] = useState<BuilderCard[]>([]);
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async (): Promise<BuilderCard[]> => {
    if (!user) {
      setFollowing([]);
      setFeed(null);
      setIsLoading(false);
      return [];
    }
    setIsLoading(true);
    try {
      const list = await listFollowing(user.id);
      setFollowing(list);
      setFeed(await getFeed(user.id));
      return list;
    } catch {
      setFollowing([]);
      setFeed(null);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadSuggestions = useCallback(async () => {
    try {
      setSuggestions(await listBuilderSuggestions());
    } catch {
      setSuggestions([]);
    }
  }, []);

  // Deferred so the initial fetch's setState doesn't run synchronously inside
  // the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    const t = setTimeout(() => {
      void refresh();
      void loadSuggestions();
    }, 0);
    return () => clearTimeout(t);
  }, [refresh, loadSuggestions]);

  const followingIds = useMemo(() => new Set(following.map((b) => b.id)), [following]);

  const isFollowing = useCallback(
    (builderId: number) => followingIds.has(builderId),
    [followingIds],
  );

  const toggle = useCallback(
    async (builderId: number): Promise<boolean> => {
      if (!user) return false;
      const was = isFollowing(builderId);
      // Optimistic flip for instant feel.
      setFollowing((prev) =>
        was
          ? prev.filter((b) => b.id !== builderId)
          : [...prev, { id: builderId, name: '', project_count: 0, follower_count: 0 }],
      );
      try {
        if (was) {
          await unfollowBuilder(user.id, builderId);
        } else {
          await followBuilder(user.id, builderId);
        }
        await refresh();
        return !was;
      } catch {
        // Fall back to the server's authoritative state after a failure.
        const after = await refresh();
        return after.some((b) => b.id === builderId);
      }
    },
    [user, isFollowing, refresh],
  );

  const value = useMemo(
    () => ({ following, suggestions, feed, isLoading, refresh, loadSuggestions, toggle, isFollowing }),
    [following, suggestions, feed, isLoading, refresh, loadSuggestions, toggle, isFollowing],
  );

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollow(): FollowContextValue {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
}
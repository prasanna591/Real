import { useCallback, useEffect, useState } from 'react';

import { listSaved, saveItem, unsaveItem } from '@/services/api';
import { useSession } from '@/lib/session';
import type { SavedItem } from '@/types/api';

export function useSaved() {
  const { user } = useSession();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    try {
      setItems(await listSaved(user.id));
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const itemsPromise = user ? listSaved(user.id) : Promise.resolve<SavedItem[]>([]);
    itemsPromise
      .then((nextItems) => {
        if (!cancelled) setItems(nextItems);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const keyOf = useCallback(
    (target: { projectId?: number; unitId?: number }) =>
      target.unitId ? `u-${target.unitId}` : `p-${target.projectId}`,
    [],
  );

  const findItem = useCallback(
    (target: { projectId?: number; unitId?: number }) =>
      items.find(
        (item) =>
          target.unitId
            ? item.unit_id === target.unitId && item.project_id === target.projectId
            : item.project_id !== null &&
              item.unit_id === null &&
              item.project_id === target.projectId,
      ),
    [items],
  );

  const toggle = useCallback(
    async (target: { projectId: number; unitId?: number }) => {
      if (!user) return false;
      const key = keyOf(target);
      const existing = findItem(target);

      setPendingKeys((prev) => new Set(prev).add(key));
      try {
        if (existing) {
          await unsaveItem(existing.id);
          setItems((prev) => prev.filter((item) => item.id !== existing.id));
          return false;
        }
        const created = await saveItem(user.id, target);
        setItems((prev) => [...prev, created]);
        return true;
      } catch {
        await refresh();
        return Boolean(findItem(target));
      } finally {
        setPendingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [user, keyOf, findItem, refresh],
  );

  const isSaved = useCallback(
    (target: { projectId?: number; unitId?: number }) => Boolean(findItem(target)),
    [findItem],
  );

  return { user, items, isLoading, refresh, toggle, isSaved, isPending: pendingKeys.size > 0 };
}

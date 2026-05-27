import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

let cachedBlockedIds: Set<string> = new Set();
let cacheUserId: string | null = null;

export function useBlockedUsers() {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadBlockedUsers = useCallback(async () => {
    if (!user) {
      setBlockedIds(new Set());
      cachedBlockedIds = new Set();
      cacheUserId = null;
      return;
    }

    // Use cache if same user
    if (cacheUserId === user.id && cachedBlockedIds.size >= 0) {
      setBlockedIds(new Set(cachedBlockedIds));
      return;
    }

    try {
      setLoading(true);
      console.log('[useBlockedUsers] Loading blocked users for:', user.id);
      const { data, error } = await db
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (error) {
        console.error('[useBlockedUsers] Error:', error.message);
        return;
      }

      const ids = new Set<string>((data ?? []).map((row: { blocked_id: string }) => row.blocked_id));
      cachedBlockedIds = ids;
      cacheUserId = user.id;
      setBlockedIds(ids);
      console.log('[useBlockedUsers] Loaded', ids.size, 'blocked users');
    } catch (err) {
      console.error('[useBlockedUsers] loadBlockedUsers error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const invalidateCache = useCallback(() => {
    cacheUserId = null;
    cachedBlockedIds = new Set();
  }, []);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  return { blockedIds, loading, refresh: loadBlockedUsers, invalidateCache };
}

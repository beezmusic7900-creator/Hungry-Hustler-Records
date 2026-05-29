import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useWishlist(merchId: string) {
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !merchId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await db
          .from('merch_wishlists')
          .select('id')
          .eq('user_id', user.id)
          .eq('merch_id', merchId)
          .maybeSingle();
        if (!cancelled) setWishlisted(!!data);
      } catch (err) {
        console.error('[useWishlist] load error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user, merchId]);

  const toggle = useCallback(async (): Promise<{ added: boolean } | null> => {
    if (!user) return null;
    console.log('[useWishlist] Toggle wishlist for merch:', merchId, '— currently:', wishlisted);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      const res = await supabase.functions.invoke('toggle-wishlist', {
        body: { merch_id: merchId },
      });

      if (res.error) {
        console.error('[useWishlist] toggle-wishlist error:', res.error);
        return null;
      }

      const added = !!(res.data as { added?: boolean })?.added;
      console.log('[useWishlist] Toggle result — added:', added);
      setWishlisted(added);
      return { added };
    } catch (err) {
      console.error('[useWishlist] toggle error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, merchId, wishlisted]);

  return { wishlisted, loading, toggle };
}

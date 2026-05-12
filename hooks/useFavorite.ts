import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useFavorite(itemType: 'song' | 'video' | 'merch' | 'event', itemId: string) {
  const { user } = useAuth();
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !itemId) {
      setIsFavorited(false);
      setFavoriteId(null);
      return;
    }
    checkFavorite();
  }, [user, itemId, itemType]);

  const checkFavorite = async () => {
    if (!user) return;
    try {
      const { data } = await db
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .maybeSingle();
      setIsFavorited(!!data);
      setFavoriteId(data?.id ?? null);
    } catch (err) {
      console.error('[useFavorite] checkFavorite error:', err);
    }
  };

  const toggleFavorite = useCallback(async () => {
    if (!user) {
      console.log('[useFavorite] Not logged in — navigating to fan-auth');
      router.push('/fan-auth');
      return;
    }

    setLoading(true);
    const optimisticValue = !isFavorited;
    setIsFavorited(optimisticValue);

    try {
      if (isFavorited && favoriteId) {
        console.log('[useFavorite] Remove favorite:', itemType, itemId);
        const { error } = await db
          .from('favorites')
          .delete()
          .eq('id', favoriteId);
        if (error) throw error;
        setFavoriteId(null);
      } else {
        console.log('[useFavorite] Add favorite:', itemType, itemId);
        const { data, error } = await db
          .from('favorites')
          .insert({ user_id: user.id, item_type: itemType, item_id: itemId })
          .select('id')
          .single();
        if (error) throw error;
        setFavoriteId(data?.id ?? null);
      }
    } catch (err) {
      console.error('[useFavorite] toggleFavorite error:', err);
      // Revert optimistic update
      setIsFavorited(!optimisticValue);
    } finally {
      setLoading(false);
    }
  }, [user, isFavorited, favoriteId, itemType, itemId, router]);

  return { isFavorited, toggleFavorite, loading };
}

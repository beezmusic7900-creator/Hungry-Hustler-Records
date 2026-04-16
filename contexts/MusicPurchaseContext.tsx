
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import Constants from 'expo-constants';

// ─── RevenueCat config ────────────────────────────────────────────────────────

const _extra = Constants.expoConfig?.extra || {};
// Hardcoded fallback ensures the correct key is always used even if app.json extra is stale
// Use platform-appropriate production key; fall back to test key in dev
const RC_API_KEY: string =
  (Platform.OS === 'android'
    ? (_extra.revenueCatApiKeyAndroid || _extra.revenueCatTestApiKeyAndroid)
    : (_extra.revenueCatApiKeyIos || _extra.revenueCatTestApiKeyIos)) ||
  'test_wEkIGlvWCRgUmodYuYUmFtROJxN';

// Warn loudly if still using the placeholder key — purchases will fail
if (RC_API_KEY === 'test_wEkIGlvWCRgUmodYuYUmFtROJxN') {
  console.warn(
    '[MusicPurchase] ⚠️  RevenueCat API key is the Specular placeholder. ' +
    'Replace revenueCatApiKeyIos / revenueCatApiKeyAndroid in app.json with ' +
    'your real Public SDK keys from https://app.revenuecat.com → Project Settings → API Keys'
  );
}

const MUSIC_ENTITLEMENT_ID: string =
  _extra.revenueCatMusicEntitlementId || 'music_purchase';

// Product ID pattern for non-consumable track purchases:
// com.hungryhustlerrecords.song.<trackname>
// e.g. com.hungryhustlerrecords.song.trackname

let _rcConfigured = false;

async function ensureRCConfigured(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const Purchases = (await import('react-native-purchases')).default;
    if (typeof Purchases?.configure !== 'function') {
      console.warn('[MusicPurchase] react-native-purchases native module not available (Expo Go)');
      return false;
    }
    if (!_rcConfigured) {
      console.log('[MusicPurchase] Initializing RevenueCat SDK with key:', RC_API_KEY.substring(0, 14) + '...');
      await Purchases.configure({ apiKey: RC_API_KEY });
      _rcConfigured = true;
      console.log('[MusicPurchase] RevenueCat SDK initialized, entitlement:', MUSIC_ENTITLEMENT_ID);
    }
    return true;
  } catch (e) {
    console.error('[MusicPurchase] ensureRCConfigured error:', e);
    return false;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MusicEntitlements {
  song_ids: string[];
  album_ids: string[];
  product_ids: string[];
}

interface MusicPurchaseContextType {
  entitlements: MusicEntitlements;
  isLoadingEntitlements: boolean;
  purchaseSong: (song: { id: string; apple_product_id: string }) => Promise<boolean>;
  purchaseAlbum: (album: { id: string; apple_product_id: string }) => Promise<boolean>;
  restorePurchases: () => Promise<{ restored_count: number }>;
  isSongPurchased: (songId: string) => boolean;
  isAlbumPurchased: (albumId: string) => boolean;
  refreshEntitlements: () => Promise<void>;
}

const EMPTY_ENTITLEMENTS: MusicEntitlements = {
  song_ids: [],
  album_ids: [],
  product_ids: [],
};

const MusicPurchaseContext = createContext<MusicPurchaseContextType | undefined>(undefined);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

const MUSIC_PURCHASES_URL = `${SUPABASE_URL}/functions/v1/music-purchases`;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function MusicPurchaseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<MusicEntitlements>(EMPTY_ENTITLEMENTS);
  const [isLoadingEntitlements, setIsLoadingEntitlements] = useState(false);

  const refreshEntitlements = useCallback(async () => {
    if (!user) {
      setEntitlements(EMPTY_ENTITLEMENTS);
      return;
    }
    setIsLoadingEntitlements(true);
    try {
      console.log('[MusicPurchase] Fetching entitlements from backend');
      const headers = await getAuthHeaders();
      const res = await fetch(`${MUSIC_PURCHASES_URL}/entitlements`, { headers });
      if (!res.ok) {
        const text = await res.text();
        console.error('[MusicPurchase] Entitlements fetch failed:', res.status, text);
        return;
      }
      const data = await res.json();
      console.log('[MusicPurchase] Entitlements loaded:', JSON.stringify(data));
      setEntitlements({
        song_ids: Array.isArray(data.song_ids) ? data.song_ids : [],
        album_ids: Array.isArray(data.album_ids) ? data.album_ids : [],
        product_ids: Array.isArray(data.product_ids) ? data.product_ids : [],
      });
    } catch (e: any) {
      console.error('[MusicPurchase] refreshEntitlements error:', e);
    } finally {
      setIsLoadingEntitlements(false);
    }
  }, [user]);

  // Refresh when user changes
  useEffect(() => {
    refreshEntitlements();
  }, [refreshEntitlements]);

  // ── purchaseSong ────────────────────────────────────────────────────────────

  const purchaseSong = useCallback(async (song: { id: string; apple_product_id: string }): Promise<boolean> => {
    console.log(`[MusicPurchase] purchaseSong pressed: id=${song.id}, productId=${song.apple_product_id}`);

    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'In-app purchases are only available on iOS and Android.');
      return false;
    }

    try {
      const ready = await ensureRCConfigured();
      if (!ready) {
        Alert.alert('Not Available', 'In-app purchases require a custom dev build or production build.');
        return false;
      }
      const Purchases = (await import('react-native-purchases')).default;

      let transactionId: string | undefined;
      let productId = song.apple_product_id;

      console.log('[MusicPurchase] Fetching offerings for song purchase');
      try {
        const offerings = await Purchases.getOfferings();
        let matchedPackage = null;

        // Search all offerings for a package matching this product ID
        for (const offering of Object.values(offerings.all)) {
          for (const pkg of offering.availablePackages) {
            if (pkg.product.identifier === song.apple_product_id) {
              matchedPackage = pkg;
              break;
            }
          }
          if (matchedPackage) break;
        }

        if (matchedPackage) {
          console.log('[MusicPurchase] Found package in offerings, purchasing via package');
          const result = await Purchases.purchasePackage(matchedPackage);
          transactionId = result.transaction?.transactionIdentifier;
        } else {
          console.log('[MusicPurchase] Package not in offerings, purchasing via product ID directly');
          const products = await Purchases.getProducts([song.apple_product_id]);
          if (!products || products.length === 0) {
            Alert.alert('Product Not Found', 'This song is not available for purchase at this time.');
            return false;
          }
          const result = await Purchases.purchaseStoreProduct(products[0]);
          transactionId = result.transaction?.transactionIdentifier;
        }
      } catch (purchaseError: any) {
        if (purchaseError?.userCancelled) {
          console.log('[MusicPurchase] User cancelled song purchase');
          return false;
        }
        throw purchaseError;
      }

      console.log(`[MusicPurchase] Song purchase successful, transactionId=${transactionId}`);

      // Record purchase in backend
      const headers = await getAuthHeaders();
      const body = JSON.stringify({
        product_id: productId,
        song_id: song.id,
        transaction_id: transactionId,
      });
      console.log('[MusicPurchase] POST /music-purchases (song):', body);
      const res = await fetch(MUSIC_PURCHASES_URL, {
        method: 'POST',
        headers,
        body,
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[MusicPurchase] Record purchase failed:', res.status, text);
      } else {
        console.log('[MusicPurchase] Purchase recorded in backend');
      }

      // Optimistic update
      setEntitlements((prev) => ({
        ...prev,
        song_ids: prev.song_ids.includes(song.id) ? prev.song_ids : [...prev.song_ids, song.id],
        product_ids: prev.product_ids.includes(productId) ? prev.product_ids : [...prev.product_ids, productId],
      }));

      return true;
    } catch (e: any) {
      console.error('[MusicPurchase] purchaseSong error:', e);
      Alert.alert('Purchase Failed', e?.message ?? 'An error occurred during purchase. Please try again.');
      return false;
    }
  }, []);

  // ── purchaseAlbum ───────────────────────────────────────────────────────────

  const purchaseAlbum = useCallback(async (album: { id: string; apple_product_id: string }): Promise<boolean> => {
    console.log(`[MusicPurchase] purchaseAlbum pressed: id=${album.id}, productId=${album.apple_product_id}`);

    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'In-app purchases are only available on iOS and Android.');
      return false;
    }

    try {
      const ready = await ensureRCConfigured();
      if (!ready) {
        Alert.alert('Not Available', 'In-app purchases require a custom dev build or production build.');
        return false;
      }
      const Purchases = (await import('react-native-purchases')).default;

      let transactionId: string | undefined;
      let productId = album.apple_product_id;

      console.log('[MusicPurchase] Fetching offerings for album purchase');
      try {
        const offerings = await Purchases.getOfferings();
        let matchedPackage = null;

        for (const offering of Object.values(offerings.all)) {
          for (const pkg of offering.availablePackages) {
            if (pkg.product.identifier === album.apple_product_id) {
              matchedPackage = pkg;
              break;
            }
          }
          if (matchedPackage) break;
        }

        if (matchedPackage) {
          console.log('[MusicPurchase] Found package in offerings, purchasing via package');
          const result = await Purchases.purchasePackage(matchedPackage);
          transactionId = result.transaction?.transactionIdentifier;
        } else {
          console.log('[MusicPurchase] Package not in offerings, purchasing via product ID directly');
          const products = await Purchases.getProducts([album.apple_product_id]);
          if (!products || products.length === 0) {
            Alert.alert('Product Not Found', 'This album is not available for purchase at this time.');
            return false;
          }
          const result = await Purchases.purchaseStoreProduct(products[0]);
          transactionId = result.transaction?.transactionIdentifier;
        }
      } catch (purchaseError: any) {
        if (purchaseError?.userCancelled) {
          console.log('[MusicPurchase] User cancelled album purchase');
          return false;
        }
        throw purchaseError;
      }

      console.log(`[MusicPurchase] Album purchase successful, transactionId=${transactionId}`);

      // Record purchase in backend
      const headers = await getAuthHeaders();
      const body = JSON.stringify({
        product_id: productId,
        album_id: album.id,
        transaction_id: transactionId,
      });
      console.log('[MusicPurchase] POST /music-purchases (album):', body);
      const res = await fetch(MUSIC_PURCHASES_URL, {
        method: 'POST',
        headers,
        body,
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[MusicPurchase] Record album purchase failed:', res.status, text);
      } else {
        console.log('[MusicPurchase] Album purchase recorded in backend');
      }

      // Optimistic update
      setEntitlements((prev) => ({
        ...prev,
        album_ids: prev.album_ids.includes(album.id) ? prev.album_ids : [...prev.album_ids, album.id],
        product_ids: prev.product_ids.includes(productId) ? prev.product_ids : [...prev.product_ids, productId],
      }));

      return true;
    } catch (e: any) {
      console.error('[MusicPurchase] purchaseAlbum error:', e);
      Alert.alert('Purchase Failed', e?.message ?? 'An error occurred during purchase. Please try again.');
      return false;
    }
  }, []);

  // ── restorePurchases ────────────────────────────────────────────────────────

  const restorePurchases = useCallback(async (): Promise<{ restored_count: number }> => {
    console.log('[MusicPurchase] restorePurchases pressed');

    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Restore purchases is only available on iOS and Android.');
      return { restored_count: 0 };
    }

    try {
      const ready = await ensureRCConfigured();
      if (!ready) {
        Alert.alert('Not Available', 'Restore purchases require a custom dev build or production build.');
        return { restored_count: 0 };
      }
      const Purchases = (await import('react-native-purchases')).default;

      console.log('[MusicPurchase] Calling Purchases.restorePurchases()');
      const customerInfo = await Purchases.restorePurchases();

      // Extract all non-consumable product IDs from restored transactions
      const restoredProductIds: string[] = [];
      const allTransactions = customerInfo.nonSubscriptionTransactions ?? [];
      for (const tx of allTransactions) {
        if (tx.productIdentifier && !restoredProductIds.includes(tx.productIdentifier)) {
          restoredProductIds.push(tx.productIdentifier);
        }
      }

      console.log('[MusicPurchase] Restored product IDs:', restoredProductIds);

      if (restoredProductIds.length === 0) {
        await refreshEntitlements();
        return { restored_count: 0 };
      }

      // Send to backend for bulk restore
      const headers = await getAuthHeaders();
      const body = JSON.stringify({ product_ids: restoredProductIds });
      console.log('[MusicPurchase] POST /music-purchases/restore:', body);
      const res = await fetch(`${MUSIC_PURCHASES_URL}/restore`, {
        method: 'POST',
        headers,
        body,
      });

      let restoredCount = restoredProductIds.length;
      if (res.ok) {
        const data = await res.json();
        restoredCount = data.restored_count ?? restoredProductIds.length;
        console.log('[MusicPurchase] Restore response:', JSON.stringify(data));
      } else {
        const text = await res.text();
        console.error('[MusicPurchase] Restore backend call failed:', res.status, text);
      }

      await refreshEntitlements();
      return { restored_count: restoredCount };
    } catch (e: any) {
      console.error('[MusicPurchase] restorePurchases error:', e);
      throw e;
    }
  }, [refreshEntitlements]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const isSongPurchased = useCallback(
    (songId: string) => entitlements.song_ids.includes(songId),
    [entitlements.song_ids]
  );

  const isAlbumPurchased = useCallback(
    (albumId: string) => entitlements.album_ids.includes(albumId),
    [entitlements.album_ids]
  );

  return (
    <MusicPurchaseContext.Provider
      value={{
        entitlements,
        isLoadingEntitlements,
        purchaseSong,
        purchaseAlbum,
        restorePurchases,
        isSongPurchased,
        isAlbumPurchased,
        refreshEntitlements,
      }}
    >
      {children}
    </MusicPurchaseContext.Provider>
  );
}

export function useMusicPurchase() {
  const context = useContext(MusicPurchaseContext);
  if (!context) throw new Error('useMusicPurchase must be used within MusicPurchaseProvider');
  return context;
}


import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause, X, Music, Lock, ShoppingCart, Download, CheckCircle } from 'lucide-react-native';
import { colors } from '@/styles/commonStyles';
import { supabase, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { useMusicPurchase } from '@/contexts/MusicPurchaseContext';
import * as FileSystem from 'expo-file-system/legacy';

const MUSIC_CATALOG_URL = 'https://egmaxjskylfepliwaeme.supabase.co/functions/v1/music-catalog';

type Song = {
  id: string;
  title: string;
  artist: string;
  description?: string;
  category?: string;
  file_url?: string;
  audio_url?: string;
  cover_url?: string;
  cover_image_url?: string;
  price?: number;
  is_active?: boolean;
  is_published?: boolean;
  is_premium?: boolean;
  apple_product_id?: string;
  purchase_type?: string;
  duration?: number;
  created_at?: string;
};

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const sStr = s < 10 ? `0${s}` : `${s}`;
  return `${m}:${sStr}`;
}

// ─── SongRow ────────────────────────────────────────────────────────────────

function SongRow({
  song,
  isActive,
  isPlaying,
  isPurchased,
  isPurchasing,
  isDownloading,
  onPress,
  onDownload,
}: {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  isPurchased: boolean;
  isPurchasing: boolean;
  isDownloading: boolean;
  onPress: () => void;
  onDownload: () => void;
}) {
  const isPremium = song.is_premium === true;
  const isPaid = isPremium || Number(song.price) > 0;
  const isLocked = isPaid && !isPurchased;
  const coverUri = song.cover_image_url || song.cover_url;
  const coverSource = resolveImageSource(coverUri);
  const durationText = formatDuration(song.duration);
  const priceText = `$${Number(song.price).toFixed(2)}`;

  return (
    <TouchableOpacity
      style={[styles.songRow, isActive && styles.songRowActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.coverContainer}>
        {coverUri ? (
          <Image source={coverSource} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Music size={22} color={colors.primary} />
          </View>
        )}
        {isActive && !isLocked && (
          <View style={styles.playOverlay}>
            {isPlaying ? (
              <Pause size={18} color="#fff" fill="#fff" />
            ) : (
              <Play size={18} color="#fff" fill="#fff" />
            )}
          </View>
        )}
        {isLocked && (
          <View style={styles.lockOverlay}>
            <Lock size={16} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.songInfo}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.songTitle, isActive && !isLocked && styles.songTitleActive]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          {isPurchased && isPaid && (
            <CheckCircle size={12} color={colors.primary} />
          )}
        </View>
        <Text style={styles.songArtist} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>

      <View style={styles.rightCol}>
        {isLocked ? (
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={onPress}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <ShoppingCart size={12} color={colors.background} />
                <Text style={styles.buyBtnText}>{priceText}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : isPaid && isPurchased ? (
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={onDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Download size={16} color={colors.primary} />
            )}
          </TouchableOpacity>
        ) : (
          <Text style={styles.freeTag}>Free</Text>
        )}
        <Text style={styles.duration}>{durationText}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── MiniPlayer ─────────────────────────────────────────────────────────────

function MiniPlayer({
  song,
  player,
  status,
  onClose,
}: {
  song: Song;
  player: ReturnType<typeof useAudioPlayer>;
  status: ReturnType<typeof useAudioPlayerStatus>;
  onClose: () => void;
}) {
  const coverUri = song.cover_image_url || song.cover_url;
  const coverSource = resolveImageSource(coverUri);
  const isPlaying = status.playing;

  const handlePlayPause = () => {
    console.log(`[MiniPlayer] play/pause pressed: "${song.title}", isPlaying=${isPlaying}, isLoaded=${status.isLoaded}`);
    try {
      if (isPlaying) {
        player.pause();
      } else if (status.isLoaded) {
        player.play();
      }
    } catch (e) {
      console.warn('[MiniPlayer] play/pause failed:', e);
    }
  };

  return (
    <View style={miniStyles.container}>
      <View style={miniStyles.coverWrapper}>
        {coverUri ? (
          <Image source={coverSource} style={miniStyles.cover} resizeMode="cover" />
        ) : (
          <View style={miniStyles.coverPlaceholder}>
            <Music size={20} color={colors.primary} />
          </View>
        )}
      </View>
      <View style={miniStyles.info}>
        <Text style={miniStyles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={miniStyles.artist} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>
      <TouchableOpacity style={miniStyles.actionBtn} onPress={handlePlayPause}>
        {isPlaying ? (
          <Pause size={24} color={colors.primary} fill={colors.primary} />
        ) : (
          <Play size={24} color={colors.primary} fill={colors.primary} />
        )}
      </TouchableOpacity>
      <TouchableOpacity style={miniStyles.actionBtn} onPress={onClose}>
        <X size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ExclusiveSongsScreen() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { isSongPurchased, purchaseSong, refreshEntitlements } = useMusicPurchase();

  const isMounted = useRef(true);
  const pendingPlayRef = useRef(false);

  // Stable audio source — only set after we have a confirmed non-empty URI
  const audioUri = activeSong
    ? activeSong.audio_url || activeSong.file_url || ''
    : '';
  const player = useAudioPlayer(audioUri ? { uri: audioUri } : null);
  const status = useAudioPlayerStatus(player);

  // Unmount cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      try {
        player.pause();
      } catch (_) {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for load completion and trigger pending play
  useEffect(() => {
    if (!pendingPlayRef.current) return;
    if (status.isLoaded && !status.playing) {
      console.log('[Audio] Track loaded, triggering pending play');
      pendingPlayRef.current = false;
      setPlayerReady(true);
      try {
        player.play();
      } catch (e) {
        console.warn('[Audio] play() after load failed:', e);
      }
    }
  }, [status.isLoaded, status.playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── fetchSongs ──────────────────────────────────────────────────────────

  const fetchSongs = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      console.log('[music] Fetching songs from music-catalog');
      const res = await fetch(`${MUSIC_CATALOG_URL}/songs`, { headers });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[music] Songs fetch failed:', res.status, errText);
        throw new Error('Failed to load songs');
      }

      const data = await res.json();
      const songList: Song[] = Array.isArray(data)
        ? data
        : data.songs ?? data.data ?? [];
      console.log('[music] Loaded', songList.length, 'songs');
      if (isMounted.current) setSongs(songList);
    } catch (err: any) {
      console.error('[music] fetchSongs error:', err);
      if (isMounted.current) setError(err.message ?? 'Failed to load songs');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSongs();
      refreshEntitlements();
      return () => {
        // Pause when leaving tab but keep state
        try {
          player.pause();
        } catch (_) {}
      };
    }, [fetchSongs, refreshEntitlements])
  );

  // ── handleSongPress ─────────────────────────────────────────────────────

  const handleSongPress = useCallback(
    (song: Song) => {
      console.log(`[music] Song pressed: "${song.title}" (id=${song.id}, is_premium=${song.is_premium})`);
      const isPremium = song.is_premium === true;
      const isPaid = isPremium || Number(song.price) > 0;
      const isPurchased = isSongPurchased(song.id);

      if (isPaid && !isPurchased) {
        console.log(`[music] Song is locked — opening IAP purchase flow for "${song.title}"`);
        handlePurchase(song);
        return;
      }

      const audioUrl = song.audio_url || song.file_url || '';
      if (!audioUrl) {
        Alert.alert('Unavailable', 'Audio file not available for this song.');
        return;
      }

      if (activeSong?.id === song.id) {
        // Toggle play/pause on current song
        try {
          if (status.playing) {
            console.log(`[music] Pausing: "${song.title}"`);
            player.pause();
          } else if (status.isLoaded) {
            console.log(`[music] Resuming: "${song.title}"`);
            player.play();
          } else {
            console.log(`[music] Not loaded yet — setting pendingPlay for: "${song.title}"`);
            pendingPlayRef.current = true;
          }
        } catch (e) {
          console.warn('[music] toggle play/pause failed:', e);
        }
      } else {
        // Switch to new song
        console.log(`[music] Switching to new song: "${song.title}"`);
        try {
          player.pause();
        } catch (_) {}
        pendingPlayRef.current = true;
        setPlayerReady(false);
        setActiveSong(song);
      }
    },
    [activeSong, status, player, isSongPurchased] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── handlePurchase ──────────────────────────────────────────────────────

  const handlePurchase = useCallback(
    async (song: Song) => {
      if (purchasingId) return;
      if (!song.apple_product_id) {
        Alert.alert('Not Available', 'This song is not available for purchase yet.');
        return;
      }
      console.log(`[music] IAP purchase initiated for: "${song.title}" (productId=${song.apple_product_id})`);
      setPurchasingId(song.id);
      try {
        const success = await purchaseSong({
          id: song.id,
          apple_product_id: song.apple_product_id,
        });
        if (success) {
          console.log(`[music] Purchase successful for: "${song.title}"`);
          // Entitlements updated optimistically in context; play the song
          const audioUrl = song.audio_url || song.file_url || '';
          if (audioUrl) {
            try { player.pause(); } catch (_) {}
            pendingPlayRef.current = true;
            setPlayerReady(false);
            setActiveSong(song);
          }
        }
      } finally {
        if (isMounted.current) setPurchasingId(null);
      }
    },
    [purchasingId, purchaseSong, player]
  );

  // ── handleDownload ──────────────────────────────────────────────────────

  const handleDownload = useCallback(
    async (song: Song) => {
      const audioUrl = song.audio_url || song.file_url || '';
      if (!audioUrl) {
        Alert.alert('Unavailable', 'No audio file available.');
        return;
      }
      if (downloadingId) return;
      console.log(`[music] Download initiated for: "${song.title}"`);
      setDownloadingId(song.id);
      try {
        const filename = `${song.title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        console.log('[music] Downloading to:', fileUri);
        const { uri } = await FileSystem.downloadAsync(audioUrl, fileUri);
        console.log('[music] Download complete:', uri);
        Alert.alert('Downloaded', `Saved to: ${uri}`);
      } catch (e: any) {
        console.warn('[music] Download failed:', e.message);
        Alert.alert('Download Failed', e.message ?? 'Could not download file.');
      } finally {
        if (isMounted.current) setDownloadingId(null);
      }
    },
    [downloadingId]
  );

  // ── handleCloseMiniPlayer ───────────────────────────────────────────────

  const handleCloseMiniPlayer = useCallback(() => {
    console.log('[music] Mini player closed');
    try {
      player.pause();
    } catch (_) {}
    pendingPlayRef.current = false;
    setActiveSong(null);
    setPlayerReady(false);
  }, [player]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── renderSong ──────────────────────────────────────────────────────────

  const renderSong = ({ item }: { item: Song }) => (
    <SongRow
      song={item}
      isActive={activeSong?.id === item.id}
      isPlaying={activeSong?.id === item.id && status.playing}
      isPurchased={isSongPurchased(item.id)}
      isPurchasing={purchasingId === item.id}
      isDownloading={downloadingId === item.id}
      onPress={() => handleSongPress(item)}
      onDownload={() => handleDownload(item)}
    />
  );

  const miniPlayerVisible = activeSong !== null;
  const listFooter = <View style={{ height: miniPlayerVisible ? 160 : 100 }} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EXCLUSIVE</Text>
        <Text style={styles.headerSubtitle}>Hungry Hustler Records</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Music size={48} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              console.log('[music] Retry pressed');
              fetchSongs();
            }}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : songs.length === 0 ? (
        <View style={styles.centered}>
          <Music size={56} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Exclusive Songs Yet</Text>
          <Text style={styles.emptySubtitle}>Check back soon for new releases.</Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={renderSong}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          ListFooterComponent={listFooter}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {miniPlayerVisible && activeSong && (
        <MiniPlayer
          song={activeSong}
          player={player}
          status={status}
          onClose={handleCloseMiniPlayer}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  songRowActive: {
    backgroundColor: colors.card,
  },
  coverContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  coverPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  songTitleActive: {
    color: colors.primary,
  },
  songArtist: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 56,
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  buyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.background,
  },
  downloadBtn: {
    padding: 4,
  },
  freeTag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  duration: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 86,
  },
});

const miniStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 12,
    right: 12,
    backgroundColor: colors.cardElevated,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.5)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 12,
      },
    }),
  },
  coverWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cover: {
    width: 44,
    height: 44,
  },
  coverPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionBtn: {
    padding: 8,
  },
});

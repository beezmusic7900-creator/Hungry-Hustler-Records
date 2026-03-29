
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause, X, Music, Lock } from 'lucide-react-native';
import { colors } from '@/styles/commonStyles';
import { SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

type Song = {
  id: string;
  title: string;
  artist: string;
  category: string;
  // backend may return either field name — support both
  file_url?: string;
  audio_url?: string;
  cover_url?: string;
  cover_image_url?: string;
  price: number;
  is_active: boolean;
  is_published: boolean;
  duration?: number;
  created_at: string;
};

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
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

function formatPrice(price: number): string {
  const num = Number(price);
  if (!num || num <= 0) return 'Free';
  return `$${num.toFixed(2)}`;
}

function MiniPlayer({
  song,
  player,
  onClose,
}: {
  song: Song;
  player: ReturnType<typeof useAudioPlayer>;
  onClose: () => void;
}) {
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;

  const handlePlayPause = () => {
    console.log(`[ExclusiveSongs] MiniPlayer play/pause pressed: ${song.title}, isPlaying: ${isPlaying}`);
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleClose = () => {
    console.log(`[ExclusiveSongs] MiniPlayer close pressed: ${song.title}`);
    player.pause();
    onClose();
  };

  const coverUri = song.cover_image_url || song.cover_url;
  const coverSource = resolveImageSource(coverUri);
  const priceLabel = formatPrice(song.price);

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
        <Text style={miniStyles.title} numberOfLines={1}>{song.title}</Text>
        <View style={miniStyles.metaRow}>
          <Text style={miniStyles.artist} numberOfLines={1}>{song.artist}</Text>
          <Text style={miniStyles.price}>{priceLabel}</Text>
        </View>
      </View>
      <TouchableOpacity style={miniStyles.actionBtn} onPress={handlePlayPause}>
        {isPlaying ? (
          <Pause size={24} color={colors.primary} fill={colors.primary} />
        ) : (
          <Play size={24} color={colors.primary} fill={colors.primary} />
        )}
      </TouchableOpacity>
      <TouchableOpacity style={miniStyles.actionBtn} onPress={handleClose}>
        <X size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function SongRow({
  song,
  isActive,
  isPlaying,
  onPress,
}: {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  onPress: () => void;
}) {
  const durationText = formatDuration(song.duration);
  const priceText = formatPrice(song.price);
  const songCoverUri = song.cover_image_url || song.cover_url;
  const coverSource = resolveImageSource(songCoverUri);
  const isPaid = Number(song.price) > 0;

  return (
    <TouchableOpacity
      style={[styles.songRow, isActive && styles.songRowActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.coverContainer}>
        {songCoverUri ? (
          <Image source={coverSource} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Music size={22} color={colors.primary} />
          </View>
        )}
        {isActive && (
          <View style={styles.playOverlay}>
            {isPlaying ? (
              <Pause size={18} color="#fff" fill="#fff" />
            ) : (
              <Play size={18} color="#fff" fill="#fff" />
            )}
          </View>
        )}
      </View>
      <View style={styles.songInfo}>
        <View style={styles.titleRow}>
          <Text style={[styles.songTitle, isActive && styles.songTitleActive]} numberOfLines={1}>
            {song.title}
          </Text>
          {isPaid && <Lock size={12} color={colors.primary} style={styles.lockIcon} />}
        </View>
        <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
      </View>
      <View style={styles.rightCol}>
        <Text style={[styles.priceTag, isPaid && styles.priceTagPaid]}>{priceText}</Text>
        <Text style={styles.duration}>{durationText}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ExclusiveSongsScreen() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);

  const activeSongAudioUrl = activeSong ? (activeSong.audio_url || activeSong.file_url || '') : '';
  const player = useAudioPlayer(activeSong ? { uri: activeSongAudioUrl } : null);
  const status = useAudioPlayerStatus(player);

  const fetchSongs = useCallback(async () => {
    console.log('[ExclusiveSongs] Fetching songs from /songs');
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/songs`, {
        headers: { 'apikey': SUPABASE_ANON_KEY },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text}`);
      }
      const data = await res.json();
      console.log('[ExclusiveSongs] Songs received:', data?.songs?.length ?? 0);
      setSongs(data?.songs ?? []);
    } catch (err: any) {
      console.error('[ExclusiveSongs] Error fetching songs:', err);
      setError('Failed to load content. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSongs();
    }, [fetchSongs])
  );

  const handleSongPress = (song: Song) => {
    console.log(`[ExclusiveSongs] Song pressed: ${song.title} by ${song.artist}`);
    if (activeSong?.id === song.id) {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } else {
      setActiveSong(song);
      setMiniPlayerVisible(true);
      setTimeout(() => {
        player.play();
      }, 100);
    }
  };

  const handleCloseMiniPlayer = () => {
    console.log('[ExclusiveSongs] Mini player closed');
    setMiniPlayerVisible(false);
    setActiveSong(null);
  };

  const renderSong = ({ item }: { item: Song }) => {
    const isActive = activeSong?.id === item.id;
    const isPlaying = isActive && status.playing;
    return (
      <SongRow
        song={item}
        isActive={isActive}
        isPlaying={isPlaying}
        onPress={() => handleSongPress(item)}
      />
    );
  };

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
          <TouchableOpacity style={styles.retryBtn} onPress={() => { console.log('[ExclusiveSongs] Retry pressed'); fetchSongs(); }}>
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
          onClose={handleCloseMiniPlayer}
        />
      )}
    </SafeAreaView>
  );
}

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
  lockIcon: {
    flexShrink: 0,
  },
  songArtist: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 48,
  },
  priceTag: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  priceTagPaid: {
    color: colors.primary,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  artist: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
  },
  price: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 0,
  },
  actionBtn: {
    padding: 8,
  },
});


import React, { useState, useCallback, useRef } from 'react';
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
import { Play, Pause, X, Music } from 'lucide-react-native';
import { colors } from '@/styles/commonStyles';
import { apiGet } from '@/utils/api';

type Song = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  audio_url: string;
  cover_url?: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
    console.log(`[MusicTab] MiniPlayer play/pause pressed for: ${song.title}, isPlaying: ${isPlaying}`);
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleClose = () => {
    console.log(`[MusicTab] MiniPlayer close pressed for: ${song.title}`);
    player.pause();
    onClose();
  };

  const coverSource = resolveImageSource(song.cover_url);

  return (
    <View style={miniStyles.container}>
      <View style={miniStyles.coverWrapper}>
        {song.cover_url ? (
          <Image source={coverSource} style={miniStyles.cover} resizeMode="cover" />
        ) : (
          <View style={miniStyles.coverPlaceholder}>
            <Music size={20} color={colors.primary} />
          </View>
        )}
      </View>
      <View style={miniStyles.info}>
        <Text style={miniStyles.title} numberOfLines={1}>{song.title}</Text>
        <Text style={miniStyles.artist} numberOfLines={1}>{song.artist}</Text>
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
  const coverSource = resolveImageSource(song.cover_url);

  return (
    <TouchableOpacity
      style={[styles.songRow, isActive && styles.songRowActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.coverContainer}>
        {song.cover_url ? (
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
        <Text style={[styles.songTitle, isActive && styles.songTitleActive]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
      </View>
      <Text style={styles.duration}>{durationText}</Text>
    </TouchableOpacity>
  );
}

export default function MusicScreen() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);

  const player = useAudioPlayer(activeSong ? { uri: activeSong.audio_url } : null);
  const status = useAudioPlayerStatus(player);

  const fetchSongs = useCallback(async () => {
    console.log('[MusicTab] Fetching songs from /api/songs');
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<{ songs: Song[] }>('/api/songs');
      console.log('[MusicTab] Songs received:', data?.songs?.length ?? 0);
      setSongs(data?.songs ?? []);
    } catch (err: any) {
      console.error('[MusicTab] Error fetching songs:', err);
      setError('Failed to load songs. Please try again.');
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
    console.log(`[MusicTab] Song pressed: ${song.title} by ${song.artist}`);
    if (activeSong?.id === song.id) {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } else {
      setActiveSong(song);
      setMiniPlayerVisible(true);
      // Player will reload with new source, then play
      setTimeout(() => {
        player.play();
      }, 100);
    }
  };

  const handleCloseMiniPlayer = () => {
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
        <Text style={styles.headerTitle}>MUSIC</Text>
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
          <TouchableOpacity style={styles.retryBtn} onPress={fetchSongs}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : songs.length === 0 ? (
        <View style={styles.centered}>
          <Music size={56} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Songs Yet</Text>
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
    color: colors.textSecondary,
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
  songTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  songTitleActive: {
    color: colors.primary,
  },
  songArtist: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  duration: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
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

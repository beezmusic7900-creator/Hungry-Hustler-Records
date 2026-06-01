import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  PanResponder,
  ImageSourcePropType,
  Platform,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Play,
  Pause,
  ChevronDown,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  PlusCircle,
  MessageCircle,
  ThumbsUp,
  ChevronUp,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { TYPOGRAPHY, LAYOUT } from '@/constants/Typography';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ReactionBar } from '@/components/ReactionBar';
import { CommentThread } from '@/components/CommentThread';
import { useAnalytics } from '@/hooks/useAnalytics';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function formatTime(ms: number): string {
  if (!ms || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

interface Playlist {
  id: string;
  name: string;
}

export default function PlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    currentSong,
    isPlaying,
    position,
    duration,
    queue,
    repeatMode,
    shuffle,
    togglePlayPause,
    seekTo,
    playNext,
    playPrevious,
    setRepeatMode,
    toggleShuffle,
    playSong,
  } = useAudioPlayer();

  const { trackEvent } = useAnalytics();
  const seekBarRef = useRef<View>(null);
  const seekBarWidth = useRef(0);

  const [showComments, setShowComments] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  // Song voting
  const [voteScore, setVoteScore] = useState(0);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);

  const progress = duration > 0 ? position / duration : 0;
  const positionText = formatTime(position);
  const durationText = formatTime(duration);

  const nextRepeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
  const repeatLabel = repeatMode === 'off' ? 'off' : repeatMode === 'all' ? 'all' : 'one';

  const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

  const loadVoteState = useCallback(async (songId: string) => {
    try {
      const { data: allVotes } = await db
        .from('song_votes')
        .select('vote_value')
        .eq('song_id', songId);
      const score = (allVotes ?? []).reduce((sum: number, v: { vote_value: number }) => sum + v.vote_value, 0);
      setVoteScore(score);

      if (user) {
        const { data: myVote } = await db
          .from('song_votes')
          .select('vote_value')
          .eq('song_id', songId)
          .eq('user_id', user.id)
          .maybeSingle();
        setUserVote(myVote?.vote_value ?? null);
      } else {
        setUserVote(null);
      }
    } catch (err) {
      console.error('[Player] loadVoteState error:', err);
    }
  }, [user]);

  useEffect(() => {
    trackEvent('screen_view', { screen: 'player' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentSong?.id) {
      trackEvent('song_play', { song_id: currentSong.id, title: currentSong.title });
      setVoteScore(0);
      setUserVote(null);
      loadVoteState(currentSong.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id]);

  const handleSongVote = useCallback(async (value: 1 | -1) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to vote on songs.');
      return;
    }
    if (!currentSong) return;
    console.log('[Player] Song vote:', currentSong.id, value, 'current:', userVote);

    const newValue = userVote === value ? null : value;
    const oldVote = userVote ?? 0;
    const newScore = voteScore - oldVote + (newValue ?? 0);

    // Optimistic
    setUserVote(newValue);
    setVoteScore(newScore);
    setVoteLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      if (newValue === null) {
        await db.from('song_votes').delete().eq('user_id', user.id).eq('song_id', currentSong.id);
      } else {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/cast-vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ vote_type: 'song', target_id: currentSong.id, vote_value: newValue }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error('[Player] cast-vote error:', text);
          setUserVote(userVote);
          setVoteScore(voteScore);
        }
      }
    } catch (err) {
      console.error('[Player] handleSongVote error:', err);
      setUserVote(userVote);
      setVoteScore(voteScore);
    } finally {
      setVoteLoading(false);
    }
  }, [user, currentSong, userVote, voteScore]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (seekBarWidth.current > 0) {
          const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / seekBarWidth.current));
          const ms = ratio * (seekBarWidth.current > 0 ? duration : 0);
          console.log('[Player] Seek to:', ms);
          seekTo(ms);
        }
      },
      onPanResponderMove: (evt) => {
        if (seekBarWidth.current > 0) {
          const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / seekBarWidth.current));
          const ms = ratio * duration;
          seekTo(ms);
        }
      },
    })
  ).current;

  const handleBack = () => {
    console.log('[Player] Back pressed');
    router.back();
  };

  const handlePlayPause = () => {
    console.log('[Player] Toggle play/pause');
    togglePlayPause();
  };

  const handlePrevious = () => {
    console.log('[Player] Previous pressed');
    playPrevious();
  };

  const handleNext = () => {
    console.log('[Player] Next pressed');
    playNext();
  };

  const handleRepeat = () => {
    console.log('[Player] Repeat mode changed to:', nextRepeatMode);
    setRepeatMode(nextRepeatMode);
  };

  const handleShuffle = () => {
    console.log('[Player] Shuffle toggled');
    toggleShuffle();
  };

  const handleOpenPlaylistModal = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to manage playlists.');
      return;
    }
    console.log('[Player] Open playlist modal');
    setShowPlaylistModal(true);
    setLoadingPlaylists(true);
    try {
      const { data, error } = await db
        .from('playlists')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[Player] Load playlists error:', error.message);
      } else {
        setPlaylists((data ?? []) as Playlist[]);
      }
    } catch (err) {
      console.error('[Player] handleOpenPlaylistModal error:', err);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    if (!currentSong || !user) return;
    console.log('[Player] Add song to playlist:', playlistName, 'song:', currentSong.title);
    try {
      const { data: existing } = await db
        .from('playlist_songs')
        .select('id')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? (existing[0].position ?? 0) + 1 : 0;

      const { error } = await db.from('playlist_songs').insert({
        playlist_id: playlistId,
        song_id: currentSong.id,
        position: nextPosition,
      });

      if (error) {
        console.error('[Player] Add to playlist error:', error.message);
        Alert.alert('Error', 'Could not add to playlist.');
      } else {
        Alert.alert('Added!', `"${currentSong.title}" added to ${playlistName}`);
        setShowPlaylistModal(false);
      }
    } catch (err) {
      console.error('[Player] handleAddToPlaylist error:', err);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!user || !newPlaylistName.trim()) return;
    console.log('[Player] Create new playlist:', newPlaylistName.trim());
    setCreatingPlaylist(true);
    try {
      const { data, error } = await db
        .from('playlists')
        .insert({ user_id: user.id, name: newPlaylistName.trim(), is_public: false })
        .select('id, name')
        .single();

      if (error) {
        console.error('[Player] Create playlist error:', error.message);
        Alert.alert('Error', 'Could not create playlist.');
      } else {
        setNewPlaylistName('');
        if (data) {
          await handleAddToPlaylist(data.id, data.name);
        }
      }
    } catch (err) {
      console.error('[Player] handleCreatePlaylist error:', err);
    } finally {
      setCreatingPlaylist(false);
    }
  };

  if (!currentSong) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary }}>No song playing</Text>
      </View>
    );
  }

  const songTitle = currentSong.title;
  const artistName = currentSong.artist;
  const nextThree = queue.slice(0, 3);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top row: shuffle + back + repeat */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {/* Shuffle */}
        <AnimatedPressable onPress={handleShuffle}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: shuffle ? COLORS.primaryMuted : COLORS.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: shuffle ? COLORS.primary : COLORS.border,
            }}
          >
            <Shuffle size={18} color={shuffle ? COLORS.primary : COLORS.textSecondary} />
          </View>
        </AnimatedPressable>

        {/* Back button */}
        <AnimatedPressable onPress={handleBack}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: COLORS.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <ChevronDown size={22} color={COLORS.text} />
          </View>
        </AnimatedPressable>

        {/* Repeat */}
        <AnimatedPressable onPress={handleRepeat}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: repeatMode !== 'off' ? COLORS.primaryMuted : COLORS.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: repeatMode !== 'off' ? COLORS.primary : COLORS.border,
            }}
          >
            {repeatMode === 'one' ? (
              <Repeat1 size={18} color={COLORS.primary} />
            ) : (
              <Repeat size={18} color={repeatMode !== 'off' ? COLORS.primary : COLORS.textSecondary} />
            )}
            {repeatMode !== 'off' && (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: COLORS.primary,
                  borderRadius: 8,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                }}
              >
                <Text style={{ color: COLORS.background, fontSize: 9, fontWeight: '700' }}>
                  {repeatLabel}
                </Text>
              </View>
            )}
          </View>
        </AnimatedPressable>
      </View>

      {/* Cover art */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        {currentSong.cover_url ? (
          <Image
            source={resolveImageSource(currentSong.cover_url)}
            style={{
              width: 280,
              height: 280,
              borderRadius: 20,
              ...Platform.select({
                native: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                },
                default: {},
              }),
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 280,
              height: 280,
              borderRadius: 20,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          />
        )}
      </View>

      {/* Song info + playlist button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...TYPOGRAPHY.h2,
              color: COLORS.text,
            }}
            numberOfLines={2}
          >
            {songTitle}
          </Text>
          <Text
            style={{
              ...TYPOGRAPHY.body,
              color: COLORS.textSecondary,
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {artistName}
          </Text>
        </View>
        <AnimatedPressable onPress={handleOpenPlaylistModal} style={{ marginLeft: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: COLORS.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <ListMusic size={18} color={COLORS.textSecondary} />
          </View>
        </AnimatedPressable>
      </View>

      {/* Song vote control */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Player] Upvote pressed');
            handleSongVote(1);
          }}
          disabled={voteLoading}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: userVote === 1 ? COLORS.primary : COLORS.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: userVote === 1 ? COLORS.primary : COLORS.border,
            }}
          >
            <ChevronUp size={16} color={userVote === 1 ? COLORS.background : COLORS.textSecondary} />
          </View>
        </AnimatedPressable>
        <Text
          style={{
            color: voteScore > 0 ? COLORS.primary : voteScore < 0 ? COLORS.danger : COLORS.textSecondary,
            fontSize: 13,
            fontWeight: '700',
            minWidth: 28,
            textAlign: 'center',
          }}
        >
          {voteScore > 0 ? `+${voteScore}` : String(voteScore)}
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[Player] Downvote pressed');
            handleSongVote(-1);
          }}
          disabled={voteLoading}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: userVote === -1 ? COLORS.danger : COLORS.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: userVote === -1 ? COLORS.danger : COLORS.border,
            }}
          >
            <ChevronDown size={16} color={userVote === -1 ? '#fff' : COLORS.textSecondary} />
          </View>
        </AnimatedPressable>
        <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginLeft: 4 }}>
          Rate this song
        </Text>
      </View>

      {/* Seek bar */}
      <View style={{ marginBottom: 12 }}>
        <View
          ref={seekBarRef}
          onLayout={(e) => {
            seekBarWidth.current = e.nativeEvent.layout.width;
          }}
          style={{
            height: 36,
            justifyContent: 'center',
          }}
          {...panResponder.panHandlers}
        >
          <View
            style={{
              height: 4,
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progress * 100}%`,
                backgroundColor: COLORS.primary,
                borderRadius: 2,
              }}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              left: `${progress * 100}%`,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: COLORS.primary,
              marginLeft: -7,
              top: 11,
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary }}>
            {positionText}
          </Text>
          <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary }}>
            {durationText}
          </Text>
        </View>
      </View>

      {/* Controls: prev + play/pause + next */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 8, marginBottom: 24 }}>
        {/* Previous */}
        <AnimatedPressable onPress={handlePrevious}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: COLORS.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <SkipBack size={22} color={COLORS.text} />
          </View>
        </AnimatedPressable>

        {/* Play/Pause */}
        <AnimatedPressable onPress={handlePlayPause}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              ...Platform.select({
                native: {
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 16,
                },
                default: {},
              }),
            }}
          >
            {isPlaying ? (
              <Pause size={30} color={COLORS.background} fill={COLORS.background} />
            ) : (
              <Play size={30} color={COLORS.background} fill={COLORS.background} />
            )}
          </View>
        </AnimatedPressable>

        {/* Next */}
        <AnimatedPressable onPress={handleNext}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: COLORS.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <SkipForward size={22} color={COLORS.text} />
          </View>
        </AnimatedPressable>
      </View>

      {/* Up Next */}
      {nextThree.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              ...TYPOGRAPHY.captionBold,
              color: COLORS.textSecondary,
              marginBottom: 10,
            }}
          >
            Up Next
          </Text>
          <View style={{ gap: 8 }}>
            {nextThree.map((song, index) => {
              const queueIndex = index;
              return (
                <AnimatedPressable
                  key={song.id + String(queueIndex)}
                  onPress={() => {
                    console.log('[Player] Queue item tapped:', song.title);
                    playSong(song);
                  }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 10,
                      padding: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    {song.cover_url ? (
                      <Image
                        source={resolveImageSource(song.cover_url)}
                        style={{ width: 36, height: 36, borderRadius: 6 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          backgroundColor: COLORS.primaryMuted,
                        }}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.text, fontWeight: '600' }} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 1 }} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    </View>
                    <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary }}>
                      #{String(queueIndex + 1)}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Reactions */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Reactions
        </Text>
        <ReactionBar targetType="song" targetId={currentSong.id} />
      </View>

      {/* Comments toggle */}
      <AnimatedPressable
        onPress={() => {
          console.log('[Player] Toggle comments section');
          setShowComments((v) => !v);
        }}
        style={{ marginBottom: 16 }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <MessageCircle size={18} color={COLORS.textSecondary} />
          <Text style={{ ...TYPOGRAPHY.body, color: COLORS.text, fontWeight: '600', flex: 1 }}>
            Comments
          </Text>
          <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary }}>
            {showComments ? '▲' : '▼'}
          </Text>
        </View>
      </AnimatedPressable>

      {showComments && (
        <View style={{ marginBottom: 24 }}>
          <CommentThread targetType="song" targetId={currentSong.id} />
        </View>
      )}

      {/* Playlist Modal */}
      <Modal
        visible={showPlaylistModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlaylistModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: insets.bottom + 24,
              borderWidth: 1,
              borderColor: COLORS.border,
              maxHeight: '70%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.text }}>
                Add to Playlist
              </Text>
              <AnimatedPressable onPress={() => {
                console.log('[Player] Close playlist modal');
                setShowPlaylistModal(false);
              }}>
                <Text style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary }}>Cancel</Text>
              </AnimatedPressable>
            </View>

            {/* New playlist input */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TextInput
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                placeholder="New playlist name..."
                placeholderTextColor={COLORS.textTertiary}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: COLORS.text,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              />
              <AnimatedPressable
                onPress={handleCreatePlaylist}
                disabled={creatingPlaylist || !newPlaylistName.trim()}
              >
                <View
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: COLORS.primary,
                    opacity: creatingPlaylist || !newPlaylistName.trim() ? 0.5 : 1,
                  }}
                >
                  <PlusCircle size={20} color={COLORS.primary} />
                </View>
              </AnimatedPressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingPlaylists ? (
                <View style={{ gap: 8 }}>
                  {[0, 1, 2].map((k) => (
                    <View
                      key={k}
                      style={{
                        backgroundColor: COLORS.surfaceSecondary,
                        borderRadius: 10,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      <View style={{ height: 14, backgroundColor: COLORS.surfaceTertiary, borderRadius: 6, width: '60%' }} />
                    </View>
                  ))}
                </View>
              ) : playlists.length === 0 ? (
                <Text style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 20 }}>
                  No playlists yet — create one above
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {playlists.map((pl) => (
                    <AnimatedPressable
                      key={pl.id}
                      onPress={() => handleAddToPlaylist(pl.id, pl.name)}
                    >
                      <View
                        style={{
                          backgroundColor: COLORS.surfaceSecondary,
                          borderRadius: 10,
                          padding: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                        }}
                      >
                        <ThumbsUp size={16} color={COLORS.textSecondary} />
                        <Text style={{ ...TYPOGRAPHY.body, color: COLORS.text, fontWeight: '600', flex: 1 }}>
                          {pl.name}
                        </Text>
                        <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary }}>+</Text>
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

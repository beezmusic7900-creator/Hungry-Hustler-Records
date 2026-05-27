import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  Platform,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import {
  Play,
  Pause,
  Video,
  ChevronUp,
  ChevronDown,
  MessageCircle,
  BarChart2,
  Music,
  ThumbsUp,
  CheckCircle,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase, supabasePublic } from '@/integrations/supabase/client';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRewards } from '@/hooks/useRewards';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Artist {
  id: string;
  name: string;
  genre: string | null;
  bio: string | null;
  image_url: string | null;
  apple_music_url: string | null;
}

interface SongItem {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string | null;
  vote_score?: number;
  user_vote?: number | null;
}

interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  youtube_id: string | null;
  youtube_url: string | null;
  video_url: string | null;
}

interface ArtistQuestion {
  id: string;
  user_id: string;
  question: string;
  upvotes: number;
  is_answered: boolean;
  created_at: string;
  asker_name: string | null;
  asker_avatar: string | null;
  answer_text: string | null;
  user_upvoted: boolean;
}

interface Poll {
  id: string;
  question: string;
  description: string | null;
  is_closed: boolean;
  closes_at: string | null;
  options: PollOption[];
  user_vote_option_id: string | null;
}

interface PollOption {
  id: string;
  option_text: string;
  position: number;
  vote_count: number;
}

type TabKey = 'songs' | 'questions' | 'polls' | 'videos';

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>{title}</Text>
      <View
        style={{
          width: 32,
          height: 3,
          backgroundColor: COLORS.primary,
          borderRadius: 2,
          marginTop: 4,
          ...Platform.select({
            native: {
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
            },
            default: {},
          }),
        }}
      />
    </View>
  );
}

function ArtistSongRow({ item, onVote }: { item: SongItem; onVote: (songId: string, value: 1 | -1 | 0) => void }) {
  const { currentSong, isPlaying, playSong } = useAudioPlayer();
  const isCurrentSong = currentSong?.id === item.id;
  const isThisPlaying = isCurrentSong && isPlaying;

  const score = item.vote_score ?? 0;
  const userVote = item.user_vote ?? null;

  const handlePlay = () => {
    console.log('[ArtistDetail] Play song:', item.title);
    playSong({
      id: item.id,
      title: item.title,
      artist: item.artist,
      cover_url: item.cover_url,
      audio_url: item.audio_url,
    });
  };

  const handleUpvote = () => {
    console.log('[ArtistDetail] Upvote song:', item.id, 'current vote:', userVote);
    onVote(item.id, userVote === 1 ? 0 : 1);
  };

  const handleDownvote = () => {
    console.log('[ArtistDetail] Downvote song:', item.id, 'current vote:', userVote);
    onVote(item.id, userVote === -1 ? 0 : -1);
  };

  const scoreText = score > 0 ? `+${score}` : String(score);

  return (
    <View
      style={{
        backgroundColor: isCurrentSong ? COLORS.primaryMuted : COLORS.surface,
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: isCurrentSong ? COLORS.primary : COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {item.cover_url ? (
        <Image
          source={resolveImageSource(item.cover_url)}
          style={{ width: 44, height: 44, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Music size={18} color={COLORS.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>

      {/* Vote controls */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <AnimatedPressable onPress={handleUpvote}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: userVote === 1 ? COLORS.primary : COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: userVote === 1 ? COLORS.primary : COLORS.border,
            }}
          >
            <ChevronUp size={14} color={userVote === 1 ? COLORS.background : COLORS.textSecondary} />
          </View>
        </AnimatedPressable>
        <Text
          style={{
            color: score > 0 ? COLORS.primary : score < 0 ? COLORS.danger : COLORS.textSecondary,
            fontSize: 11,
            fontWeight: '700',
            minWidth: 24,
            textAlign: 'center',
          }}
        >
          {scoreText}
        </Text>
        <AnimatedPressable onPress={handleDownvote}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: userVote === -1 ? COLORS.danger : COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: userVote === -1 ? COLORS.danger : COLORS.border,
            }}
          >
            <ChevronDown size={14} color={userVote === -1 ? '#fff' : COLORS.textSecondary} />
          </View>
        </AnimatedPressable>
      </View>

      {/* Play button */}
      <AnimatedPressable onPress={handlePlay}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isCurrentSong ? COLORS.primary : COLORS.surface,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isCurrentSong ? COLORS.primary : COLORS.border,
          }}
        >
          {isThisPlaying ? (
            <Pause size={12} color={COLORS.background} fill={COLORS.background} />
          ) : (
            <Play
              size={12}
              color={isCurrentSong ? COLORS.background : COLORS.primary}
              fill={isCurrentSong ? COLORS.background : COLORS.primary}
            />
          )}
        </View>
      </AnimatedPressable>
    </View>
  );
}

function ArtistVideoCard({ item, cardWidth }: { item: VideoItem; cardWidth: number }) {
  const router = useRouter();
  const resolvedUrl = item.video_url ?? item.youtube_url ?? '';
  const derivedYoutubeId =
    item.youtube_id ??
    (resolvedUrl ? getYouTubeId(resolvedUrl) : null);
  const thumbnailUri = item.thumbnail_url
    ? item.thumbnail_url
    : derivedYoutubeId
    ? `https://img.youtube.com/vi/${derivedYoutubeId}/hqdefault.jpg`
    : '';

  const handlePress = () => {
    console.log('[ArtistDetail] Video pressed:', item.title);
    router.push(`/video-player?id=${item.id}`);
  };

  return (
    <AnimatedPressable onPress={handlePress} style={{ width: cardWidth }}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 10,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <View style={{ aspectRatio: 16 / 9, position: 'relative' }}>
          {thumbnailUri ? (
            <Image
              source={resolveImageSource(thumbnailUri)}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Video size={24} color={COLORS.primary} />
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: COLORS.primary,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Play size={14} color="#FFF" fill="#FFF" />
            </View>
          </View>
        </View>
        <View style={{ padding: 8 }}>
          <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '600' }} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function QuestionCard({
  question,
  onUpvote,
}: {
  question: ArtistQuestion;
  onUpvote: (questionId: string) => void;
}) {
  const timeText = timeAgo(question.created_at);
  const askerName = question.asker_name ?? 'Fan';

  const handleUpvote = () => {
    console.log('[ArtistDetail] Upvote question:', question.id);
    onUpvote(question.id);
  };

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: question.is_answered ? COLORS.primary : COLORS.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>
              {askerName}
            </Text>
            <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>{timeText}</Text>
            {question.is_answered && (
              <View
                style={{
                  backgroundColor: COLORS.primaryMuted,
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
              >
                <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '700' }}>
                  Answered
                </Text>
              </View>
            )}
          </View>
          <Text style={{ color: COLORS.text, fontSize: 14, lineHeight: 20 }}>
            {question.question}
          </Text>
        </View>

        {/* Upvote */}
        <AnimatedPressable onPress={handleUpvote}>
          <View
            style={{
              alignItems: 'center',
              gap: 2,
              backgroundColor: question.user_upvoted ? COLORS.primaryMuted : COLORS.surfaceSecondary,
              borderRadius: 8,
              padding: 8,
              borderWidth: 1,
              borderColor: question.user_upvoted ? COLORS.primary : COLORS.border,
              minWidth: 40,
            }}
          >
            <ThumbsUp
              size={14}
              color={question.user_upvoted ? COLORS.primary : COLORS.textSecondary}
              fill={question.user_upvoted ? COLORS.primary : 'transparent'}
            />
            <Text
              style={{
                color: question.user_upvoted ? COLORS.primary : COLORS.textSecondary,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {String(question.upvotes)}
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Answer */}
      {question.answer_text ? (
        <View
          style={{
            marginTop: 12,
            backgroundColor: COLORS.primaryMuted,
            borderRadius: 8,
            padding: 10,
            borderLeftWidth: 3,
            borderLeftColor: COLORS.primary,
          }}
        >
          <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
            Artist Reply
          </Text>
          <Text style={{ color: COLORS.text, fontSize: 13, lineHeight: 19 }}>
            {question.answer_text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function PollCard({
  poll,
  onVote,
}: {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
}) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.vote_count, 0);

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
        {poll.question}
      </Text>
      {poll.description ? (
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 10 }}>
          {poll.description}
        </Text>
      ) : null}
      {poll.is_closed && (
        <View
          style={{
            backgroundColor: 'rgba(255,68,68,0.1)',
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
            alignSelf: 'flex-start',
            marginBottom: 10,
          }}
        >
          <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '600' }}>Closed</Text>
        </View>
      )}
      <View style={{ gap: 8 }}>
        {poll.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
          const isSelected = poll.user_vote_option_id === option.id;
          const pctText = `${pct}%`;

          const handleVote = () => {
            if (poll.is_closed) return;
            console.log('[ArtistDetail] Vote poll option:', option.id, 'poll:', poll.id);
            onVote(poll.id, option.id);
          };

          return (
            <AnimatedPressable key={option.id} onPress={handleVote} disabled={poll.is_closed}>
              <View
                style={{
                  borderRadius: 8,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: isSelected ? COLORS.primary : COLORS.border,
                  backgroundColor: COLORS.surfaceSecondary,
                }}
              >
                {/* Progress bar background */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, bottom: 0,
                    width: `${pct}%`,
                    backgroundColor: isSelected ? COLORS.primaryMuted : 'rgba(255,255,255,0.04)',
                  }}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    {isSelected && (
                      <CheckCircle size={14} color={COLORS.primary} />
                    )}
                    <Text
                      style={{
                        color: isSelected ? COLORS.primary : COLORS.text,
                        fontSize: 13,
                        fontWeight: isSelected ? '700' : '400',
                        flex: 1,
                      }}
                      numberOfLines={2}
                    >
                      {option.option_text}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: isSelected ? COLORS.primary : COLORS.textSecondary,
                      fontSize: 12,
                      fontWeight: '700',
                      marginLeft: 8,
                    }}
                  >
                    {pctText}
                  </Text>
                </View>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
      <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginTop: 8 }}>
        {String(totalVotes)}
        {' votes'}
      </Text>
    </View>
  );
}

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { awardPoints } = useRewards();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [questions, setQuestions] = useState<ArtistQuestion[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('songs');

  // Q&A composer
  const [questionText, setQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [questionSuccess, setQuestionSuccess] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (id) loadArtist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadArtist = async () => {
    try {
      console.log(`[ArtistDetail] Loading artist: ${id}`);
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await (supabasePublic as any)
        .from('artists')
        .select('*')
        .eq('id', id as string)
        .single();

      if (dbError) {
        console.error('[ArtistDetail] Supabase error:', dbError.message);
        setError("Couldn't load artist profile.");
        return;
      }
      setArtist(data);
      navigation.setOptions({ title: data.name });

      await Promise.all([
        loadSongs(data.name),
        loadVideos(),
        loadQuestions(),
        loadPolls(),
      ]);
    } catch (err) {
      console.error('[ArtistDetail] Failed to load artist:', err);
      setError("Couldn't load artist profile.");
    } finally {
      setLoading(false);
    }
  };

  const loadSongs = async (artistName: string) => {
    try {
      const { data } = await (supabasePublic as any)
        .from('songs')
        .select('id, title, artist, cover_url, audio_url')
        .ilike('artist', `%${artistName}%`)
        .eq('is_published', true)
        .limit(10);

      const songList = (data ?? []) as SongItem[];

      // Load vote scores
      if (songList.length > 0) {
        const songIds = songList.map((s: SongItem) => s.id);
        const { data: voteData } = await (supabasePublic as any)
          .from('song_votes')
          .select('song_id, vote_value')
          .in('song_id', songIds);

        const scoreMap: Record<string, number> = {};
        (voteData ?? []).forEach((v: { song_id: string; vote_value: number }) => {
          scoreMap[v.song_id] = (scoreMap[v.song_id] ?? 0) + v.vote_value;
        });

        let userVoteMap: Record<string, number> = {};
        if (user) {
          const { data: userVotes } = await db
            .from('song_votes')
            .select('song_id, vote_value')
            .eq('user_id', user.id)
            .in('song_id', songIds);
          (userVotes ?? []).forEach((v: { song_id: string; vote_value: number }) => {
            userVoteMap[v.song_id] = v.vote_value;
          });
        }

        setSongs(songList.map((s: SongItem) => ({
          ...s,
          vote_score: scoreMap[s.id] ?? 0,
          user_vote: userVoteMap[s.id] ?? null,
        })));
      } else {
        setSongs(songList);
      }
      console.log(`[ArtistDetail] Loaded ${songList.length} songs`);
    } catch (err) {
      console.error('[ArtistDetail] loadSongs error:', err);
    }
  };

  const loadVideos = async () => {
    try {
      const { data } = await (supabasePublic as any)
        .from('videos')
        .select('id, title, thumbnail_url, youtube_id, youtube_url, video_url')
        .eq('artist_id', id as string)
        .eq('is_published', true)
        .limit(8);
      setVideos((data ?? []) as VideoItem[]);
      console.log(`[ArtistDetail] Loaded ${(data ?? []).length} videos`);
    } catch (err) {
      console.error('[ArtistDetail] loadVideos error:', err);
    }
  };

  const loadQuestions = async () => {
    try {
      const { data } = await (supabasePublic as any)
        .from('artist_questions')
        .select('id, user_id, question, upvotes, is_answered, created_at')
        .eq('artist_id', id as string)
        .eq('is_hidden', false)
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      const qList = (data ?? []) as ArtistQuestion[];

      // Load answers
      const answeredIds = qList.filter((q) => q.is_answered).map((q) => q.id);
      let answerMap: Record<string, string> = {};
      if (answeredIds.length > 0) {
        const { data: answers } = await (supabasePublic as any)
          .from('artist_answers')
          .select('question_id, answer_text')
          .in('question_id', answeredIds);
        (answers ?? []).forEach((a: { question_id: string; answer_text: string }) => {
          answerMap[a.question_id] = a.answer_text;
        });
      }

      // Load user upvotes
      let upvotedSet = new Set<string>();
      if (user && qList.length > 0) {
        const qIds = qList.map((q) => q.id);
        const { data: upvotes } = await db
          .from('question_upvotes')
          .select('question_id')
          .eq('user_id', user.id)
          .in('question_id', qIds);
        (upvotes ?? []).forEach((u: { question_id: string }) => upvotedSet.add(u.question_id));
      }

      // Load asker profiles
      const userIds = [...new Set(qList.map((q) => q.user_id))];
      let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await (supabasePublic as any)
          .from('fan_profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds);
        (profiles ?? []).forEach((p: { id: string; display_name: string | null; avatar_url: string | null }) => {
          profileMap[p.id] = p;
        });
      }

      setQuestions(qList.map((q) => ({
        ...q,
        asker_name: profileMap[q.user_id]?.display_name ?? 'Fan',
        asker_avatar: profileMap[q.user_id]?.avatar_url ?? null,
        answer_text: answerMap[q.id] ?? null,
        user_upvoted: upvotedSet.has(q.id),
      })));
      console.log(`[ArtistDetail] Loaded ${qList.length} questions`);
    } catch (err) {
      console.error('[ArtistDetail] loadQuestions error:', err);
    }
  };

  const loadPolls = async () => {
    try {
      const { data: pollData } = await (supabasePublic as any)
        .from('polls')
        .select('id, question, description, is_closed, closes_at')
        .eq('artist_id', id as string)
        .order('created_at', { ascending: false })
        .limit(10);

      const pollList = (pollData ?? []) as Poll[];
      if (pollList.length === 0) {
        setPolls([]);
        return;
      }

      const pollIds = pollList.map((p) => p.id);
      const { data: optionData } = await (supabasePublic as any)
        .from('poll_options')
        .select('id, poll_id, option_text, position, vote_count')
        .in('poll_id', pollIds)
        .order('position', { ascending: true });

      let userVoteMap: Record<string, string> = {};
      if (user) {
        const { data: userVotes } = await db
          .from('poll_votes')
          .select('poll_id, option_id')
          .eq('user_id', user.id)
          .in('poll_id', pollIds);
        (userVotes ?? []).forEach((v: { poll_id: string; option_id: string }) => {
          userVoteMap[v.poll_id] = v.option_id;
        });
      }

      const optionsByPoll: Record<string, PollOption[]> = {};
      (optionData ?? []).forEach((o: PollOption & { poll_id: string }) => {
        if (!optionsByPoll[o.poll_id]) optionsByPoll[o.poll_id] = [];
        optionsByPoll[o.poll_id].push(o);
      });

      setPolls(pollList.map((p) => ({
        ...p,
        options: optionsByPoll[p.id] ?? [],
        user_vote_option_id: userVoteMap[p.id] ?? null,
      })));
      console.log(`[ArtistDetail] Loaded ${pollList.length} polls`);
    } catch (err) {
      console.error('[ArtistDetail] loadPolls error:', err);
    }
  };

  const handleSongVote = async (songId: string, value: 1 | -1 | 0) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to vote on songs.');
      return;
    }
    console.log('[ArtistDetail] Song vote:', songId, value);

    // Optimistic update
    setSongs((prev) =>
      prev.map((s) => {
        if (s.id !== songId) return s;
        const oldVote = s.user_vote ?? 0;
        const newScore = (s.vote_score ?? 0) - oldVote + value;
        return { ...s, user_vote: value === 0 ? null : value, vote_score: newScore };
      })
    );

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      if (value === 0) {
        // Remove vote
        await db.from('song_votes').delete().eq('user_id', user.id).eq('song_id', songId);
      } else {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/cast-vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ vote_type: 'song', target_id: songId, vote_value: value }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error('[ArtistDetail] cast-vote error:', text);
        } else {
          awardPoints('vote_song', { reference_id: songId }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[ArtistDetail] handleSongVote error:', err);
    }
  };

  const handleUpvoteQuestion = async (questionId: string) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to upvote questions.');
      return;
    }
    console.log('[ArtistDetail] Upvote question:', questionId);

    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const wasUpvoted = question.user_upvoted;

    // Optimistic update
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, user_upvoted: !wasUpvoted, upvotes: q.upvotes + (wasUpvoted ? -1 : 1) }
          : q
      )
    );

    try {
      if (wasUpvoted) {
        await db.from('question_upvotes').delete().eq('user_id', user.id).eq('question_id', questionId);
        await db.from('artist_questions').update({ upvotes: question.upvotes - 1 }).eq('id', questionId);
      } else {
        await db.from('question_upvotes').insert({ user_id: user.id, question_id: questionId });
        await db.from('artist_questions').update({ upvotes: question.upvotes + 1 }).eq('id', questionId);
      }
    } catch (err) {
      console.error('[ArtistDetail] handleUpvoteQuestion error:', err);
      // Revert
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, user_upvoted: wasUpvoted, upvotes: question.upvotes }
            : q
        )
      );
    }
  };

  const handleSubmitQuestion = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to ask a question.');
      return;
    }
    if (!questionText.trim()) return;
    console.log('[ArtistDetail] Submit question:', questionText.trim());
    setSubmittingQuestion(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ artist_id: id, question: questionText.trim() }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[ArtistDetail] submit-question error:', text);
        Alert.alert('Error', 'Could not submit question. Please try again.');
        return;
      }

      console.log('[ArtistDetail] Question submitted successfully');
      setQuestionText('');
      setQuestionSuccess(true);
      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
        Animated.delay(2000),
        Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(() => setQuestionSuccess(false));

      awardPoints('ask_artist', { reference_id: id as string }).catch(() => {});
      await loadQuestions();
    } catch (err) {
      console.error('[ArtistDetail] handleSubmitQuestion error:', err);
      Alert.alert('Error', 'Could not submit question.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handlePollVote = async (pollId: string, optionId: string) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to vote on polls.');
      return;
    }
    console.log('[ArtistDetail] Poll vote:', pollId, optionId);

    // Optimistic update
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        const oldOptionId = p.user_vote_option_id;
        return {
          ...p,
          user_vote_option_id: optionId,
          options: p.options.map((o) => {
            if (o.id === optionId) return { ...o, vote_count: o.vote_count + 1 };
            if (o.id === oldOptionId) return { ...o, vote_count: Math.max(0, o.vote_count - 1) };
            return o;
          }),
        };
      })
    );

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/cast-vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ vote_type: 'poll', target_id: pollId, option_id: optionId }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[ArtistDetail] cast-vote poll error:', text);
      } else {
        awardPoints('vote_poll', { reference_id: pollId }).catch(() => {});
      }
    } catch (err) {
      console.error('[ArtistDetail] handlePollVote error:', err);
    }
  };

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'songs', label: 'Songs', icon: <Music size={14} color={activeTab === 'songs' ? COLORS.background : COLORS.textSecondary} /> },
    { key: 'questions', label: 'Q&A', icon: <MessageCircle size={14} color={activeTab === 'questions' ? COLORS.background : COLORS.textSecondary} /> },
    { key: 'polls', label: 'Polls', icon: <BarChart2 size={14} color={activeTab === 'polls' ? COLORS.background : COLORS.textSecondary} /> },
    { key: 'videos', label: 'Videos', icon: <Video size={14} color={activeTab === 'videos' ? COLORS.background : COLORS.textSecondary} /> },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Photo */}
      {loading ? (
        <SkeletonLine width="100%" height={250} borderRadius={0} />
      ) : artist?.image_url ? (
        <Image
          source={resolveImageSource(artist.image_url)}
          style={{ width: '100%', height: 250 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 250,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: COLORS.primary, fontSize: 80, fontWeight: '700' }}>
            {artist?.name?.charAt(0) ?? '?'}
          </Text>
        </View>
      )}

      <View style={{ padding: 20 }}>
        {/* Name */}
        {loading ? (
          <SkeletonLine width="60%" height={28} style={{ marginBottom: 16 }} />
        ) : (
          <Text
            style={{
              color: COLORS.text,
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: -0.5,
              marginBottom: 8,
            }}
          >
            {artist?.name}
          </Text>
        )}

        {/* Genre */}
        {artist?.genre ? (
          <View
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 3,
              alignSelf: 'flex-start',
              borderWidth: 1,
              borderColor: COLORS.primary,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '600' }}>
              {artist.genre}
            </Text>
          </View>
        ) : null}

        {/* Bio */}
        {loading ? (
          <View style={{ gap: 8, marginBottom: 24 }}>
            <SkeletonLine width="100%" height={14} />
            <SkeletonLine width="95%" height={14} />
            <SkeletonLine width="80%" height={14} />
          </View>
        ) : artist?.bio ? (
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 14,
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            {artist.bio}
          </Text>
        ) : null}

        {/* Tab bar */}
        {!loading && (
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: COLORS.surface,
              borderRadius: 10,
              padding: 4,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            {TABS.map((tab) => (
              <AnimatedPressable
                key={tab.key}
                onPress={() => {
                  console.log('[ArtistDetail] Tab pressed:', tab.key);
                  setActiveTab(tab.key);
                }}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    paddingVertical: 8,
                    borderRadius: 7,
                    backgroundColor: activeTab === tab.key ? COLORS.primary : 'transparent',
                  }}
                >
                  {tab.icon}
                  <Text
                    style={{
                      color: activeTab === tab.key ? COLORS.background : COLORS.textSecondary,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {tab.label}
                  </Text>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        )}

        {/* Songs tab */}
        {activeTab === 'songs' && !loading && (
          <View>
            <SectionHeader title="Songs" />
            {songs.length === 0 ? (
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 24,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Music size={28} color={COLORS.textTertiary} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 10 }}>
                  No songs yet
                </Text>
              </View>
            ) : (
              songs.map((song) => (
                <ArtistSongRow key={song.id} item={song} onVote={handleSongVote} />
              ))
            )}
          </View>
        )}

        {/* Q&A tab */}
        {activeTab === 'questions' && !loading && (
          <View>
            <SectionHeader title="Ask the Artist" />

            {/* Question composer */}
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 }}>
                Ask {artist?.name ?? 'the artist'} a question
              </Text>
              <TextInput
                value={questionText}
                onChangeText={setQuestionText}
                placeholder={`What would you like to ask ${artist?.name ?? 'the artist'}?`}
                placeholderTextColor={COLORS.textTertiary}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 8,
                  padding: 12,
                  color: COLORS.text,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  minHeight: 72,
                  textAlignVertical: 'top',
                  marginBottom: 10,
                }}
              />
              {questionSuccess && (
                <Animated.View
                  style={{
                    opacity: successAnim,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <CheckCircle size={14} color={COLORS.primary} />
                  <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                    Question submitted!
                  </Text>
                </Animated.View>
              )}
              <AnimatedPressable
                onPress={handleSubmitQuestion}
                disabled={submittingQuestion || !questionText.trim()}
              >
                <View
                  style={{
                    backgroundColor: questionText.trim() ? COLORS.primary : COLORS.surfaceSecondary,
                    borderRadius: 8,
                    paddingVertical: 10,
                    alignItems: 'center',
                    opacity: submittingQuestion ? 0.7 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: questionText.trim() ? COLORS.background : COLORS.textTertiary,
                      fontSize: 13,
                      fontWeight: '700',
                    }}
                  >
                    {submittingQuestion ? 'Submitting...' : 'Submit Question'}
                  </Text>
                </View>
              </AnimatedPressable>
            </View>

            {questions.length === 0 ? (
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 24,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <MessageCircle size={28} color={COLORS.textTertiary} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 10 }}>
                  No questions yet — be the first to ask!
                </Text>
              </View>
            ) : (
              questions.map((q) => (
                <QuestionCard key={q.id} question={q} onUpvote={handleUpvoteQuestion} />
              ))
            )}
          </View>
        )}

        {/* Polls tab */}
        {activeTab === 'polls' && !loading && (
          <View>
            <SectionHeader title="Polls" />
            {polls.length === 0 ? (
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 24,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <BarChart2 size={28} color={COLORS.textTertiary} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 10 }}>
                  No polls yet — check back soon!
                </Text>
              </View>
            ) : (
              polls.map((poll) => (
                <PollCard key={poll.id} poll={poll} onVote={handlePollVote} />
              ))
            )}
          </View>
        )}

        {/* Videos tab */}
        {activeTab === 'videos' && !loading && (
          <View>
            <SectionHeader title="Videos" />
            {videos.length === 0 ? (
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 24,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Video size={28} color={COLORS.textTertiary} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 10 }}>
                  No videos yet
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {videos.map((video) => (
                  <ArtistVideoCard key={video.id} item={video} cardWidth={160} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Error */}
        {error && !loading && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
              Couldn't load artist
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
              {error}
            </Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[ArtistDetail] Retry loading');
                loadArtist();
              }}
              style={{ marginTop: 20 }}
            >
              <View
                style={{
                  backgroundColor: COLORS.primaryMuted,
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 28,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
              >
                <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Try Again</Text>
              </View>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

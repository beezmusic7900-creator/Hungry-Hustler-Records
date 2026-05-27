import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
const RECENTLY_PLAYED_KEY = 'hhr_recently_played';
const MAX_RECENTLY_PLAYED = 50;

export interface Song {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string | null;
}

export type RepeatMode = 'off' | 'one' | 'all';

interface AudioPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  position: number;   // milliseconds
  duration: number;   // milliseconds
  loading: boolean;
  queue: Song[];
  recentlyPlayed: Song[];
  repeatMode: RepeatMode;
  shuffle: boolean;
  playSong: (song: Song) => Promise<void>;
  playQueue: (songs: Song[], startIndex?: number) => Promise<void>;
  enqueue: (song: Song) => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  clearQueue: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  togglePlayPause: () => Promise<void>;
  seekTo: (ms: number) => Promise<void>;
  stop: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

async function trackListen(songId: string, completed: boolean, playDurationMs: number) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/track-listen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ song_id: songId, completed, play_duration_ms: playDurationMs }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn('[AudioPlayer] track-listen non-ok:', res.status, text);
    } else {
      const json = await res.json();
      console.log('[AudioPlayer] track-listen result:', json);
    }
  } catch (err) {
    console.warn('[AudioPlayer] track-listen error:', err);
  }
}

async function recordListenActivity(songId: string, songTitle: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    console.log('[AudioPlayer] Recording listen activity for:', songTitle);
    fetch(`${SUPABASE_URL}/functions/v1/record-activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        activity_type: 'listened',
        target_type: 'song',
        target_id: songId,
        target_label: songTitle,
      }),
    }).catch(() => {});
  } catch (err) {
    console.warn('[AudioPlayer] recordListenActivity error:', err);
  }
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>('off');
  const [shuffle, setShuffleState] = useState(false);

  // Refs for use inside callbacks without stale closures
  const queueRef = useRef<Song[]>([]);
  const repeatModeRef = useRef<RepeatMode>('off');
  const shuffleRef = useRef(false);
  const currentSongRef = useRef<Song | null>(null);
  const durationRef = useRef(0);
  const positionRef = useRef(0);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { positionRef.current = position; }, [position]);

  // Load recently played from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(RECENTLY_PLAYED_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Song[];
          setRecentlyPlayed(parsed);
          console.log('[AudioPlayer] Loaded', parsed.length, 'recently played from storage');
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const addToRecentlyPlayed = useCallback((song: Song) => {
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((s) => s.id !== song.id);
      const updated = [song, ...filtered].slice(0, MAX_RECENTLY_PLAYED);
      AsyncStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const unloadCurrent = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.remove();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }
  }, []);

  const advanceQueue = useCallback(async () => {
    const q = queueRef.current;
    const mode = repeatModeRef.current;
    const shuf = shuffleRef.current;
    const cur = currentSongRef.current;

    if (mode === 'one' && cur) {
      console.log('[AudioPlayer] Repeat one — replaying:', cur.title);
      // Re-play current song by calling playSong inline
      if (!cur.audio_url) return;
      setLoading(true);
      setPosition(0);
      unloadCurrent();
      try {
        const player = createAudioPlayer({ uri: cur.audio_url });
        player.addListener('playbackStatusUpdate', (status) => {
          setPosition(Math.round((status.currentTime ?? 0) * 1000));
          setDuration(Math.round((status.duration ?? 0) * 1000));
          setIsPlaying(status.playing ?? false);
          if (status.didJustFinish) {
            console.log('[AudioPlayer] Song finished (repeat one):', cur.title);
            setIsPlaying(false);
            setPosition(0);
            advanceQueue();
          }
        });
        playerRef.current = player;
        player.play();
        setIsPlaying(true);
        trackListen(cur.id, false, 0);
      } catch (err) {
        console.error('[AudioPlayer] advanceQueue repeat-one error:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (q.length === 0) {
      if (mode === 'all' && cur) {
        // Nothing in queue but repeat all — just replay current
        console.log('[AudioPlayer] Repeat all — no queue, replaying current');
      }
      console.log('[AudioPlayer] Queue empty, stopping');
      setIsPlaying(false);
      return;
    }

    let nextIndex = 0;
    if (shuf) {
      nextIndex = Math.floor(Math.random() * q.length);
    }
    const nextSong = q[nextIndex];
    const newQueue = [...q.slice(0, nextIndex), ...q.slice(nextIndex + 1)];
    setQueue(newQueue);
    queueRef.current = newQueue;

    console.log('[AudioPlayer] Auto-advancing to:', nextSong.title);
    if (!nextSong.audio_url) return;

    setLoading(true);
    setCurrentSong(nextSong);
    currentSongRef.current = nextSong;
    setPosition(0);
    setDuration(0);
    unloadCurrent();
    addToRecentlyPlayed(nextSong);
    trackListen(nextSong.id, false, 0);

    try {
      const player = createAudioPlayer({ uri: nextSong.audio_url });
      player.addListener('playbackStatusUpdate', (status) => {
        setPosition(Math.round((status.currentTime ?? 0) * 1000));
        const dur = Math.round((status.duration ?? 0) * 1000);
        setDuration(dur);
        durationRef.current = dur;
        setIsPlaying(status.playing ?? false);
        if (status.didJustFinish) {
          console.log('[AudioPlayer] Song finished:', nextSong.title);
          setIsPlaying(false);
          setPosition(0);
          trackListen(nextSong.id, true, durationRef.current);
          recordListenActivity(nextSong.id, nextSong.title);
          advanceQueue();
        }
      });
      playerRef.current = player;
      player.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('[AudioPlayer] advanceQueue play error:', err);
      setCurrentSong(null);
    } finally {
      setLoading(false);
    }
  }, [unloadCurrent, addToRecentlyPlayed]);

  const playSong = useCallback(async (song: Song) => {
    if (!song.audio_url) {
      console.log('[AudioPlayer] No audio_url for song:', song.title);
      return;
    }
    console.log('[AudioPlayer] playSong:', song.title, song.audio_url);
    setLoading(true);
    setCurrentSong(song);
    currentSongRef.current = song;
    setPosition(0);
    setDuration(0);

    unloadCurrent();
    addToRecentlyPlayed(song);
    trackListen(song.id, false, 0);

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });

      const player = createAudioPlayer({ uri: song.audio_url });

      player.addListener('playbackStatusUpdate', (status) => {
        setPosition(Math.round((status.currentTime ?? 0) * 1000));
        const dur = Math.round((status.duration ?? 0) * 1000);
        setDuration(dur);
        durationRef.current = dur;
        setIsPlaying(status.playing ?? false);
        if (status.didJustFinish) {
          console.log('[AudioPlayer] Song finished:', song.title);
          setIsPlaying(false);
          setPosition(0);
          trackListen(song.id, true, durationRef.current);
          recordListenActivity(song.id, song.title);
          advanceQueue();
        }
      });

      playerRef.current = player;
      player.play();
      setIsPlaying(true);
      console.log('[AudioPlayer] Playing:', song.title);
    } catch (err) {
      console.error('[AudioPlayer] Failed to play song:', err);
      setCurrentSong(null);
    } finally {
      setLoading(false);
    }
  }, [unloadCurrent, addToRecentlyPlayed, advanceQueue]);

  const playQueue = useCallback(async (songs: Song[], startIndex = 0) => {
    if (songs.length === 0) return;
    console.log('[AudioPlayer] playQueue:', songs.length, 'songs, startIndex:', startIndex);
    const first = songs[startIndex];
    const rest = [...songs.slice(0, startIndex), ...songs.slice(startIndex + 1)];
    setQueue(rest);
    queueRef.current = rest;
    await playSong(first);
  }, [playSong]);

  const enqueue = useCallback((song: Song) => {
    console.log('[AudioPlayer] enqueue:', song.title);
    setQueue((prev) => {
      const updated = [...prev, song];
      queueRef.current = updated;
      return updated;
    });
  }, []);

  const playNext = useCallback(async () => {
    console.log('[AudioPlayer] playNext pressed');
    await advanceQueue();
  }, [advanceQueue]);

  const playPrevious = useCallback(async () => {
    console.log('[AudioPlayer] playPrevious pressed');
    // If more than 3 seconds in, restart current song
    if (positionRef.current > 3000 && currentSongRef.current) {
      if (!playerRef.current) return;
      playerRef.current.seekTo(0);
      setPosition(0);
      return;
    }
    // Otherwise go to recently played
    const recent = recentlyPlayed;
    if (recent.length > 1) {
      const prev = recent[1];
      console.log('[AudioPlayer] Going to previous song:', prev.title);
      await playSong(prev);
    }
  }, [recentlyPlayed, playSong]);

  const clearQueue = useCallback(() => {
    console.log('[AudioPlayer] clearQueue');
    setQueue([]);
    queueRef.current = [];
  }, []);

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    console.log('[AudioPlayer] setRepeatMode:', mode);
    setRepeatModeState(mode);
    repeatModeRef.current = mode;
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffleState((prev) => {
      const next = !prev;
      shuffleRef.current = next;
      console.log('[AudioPlayer] toggleShuffle:', next);
      return next;
    });
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        console.log('[AudioPlayer] Pause');
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        console.log('[AudioPlayer] Resume');
        playerRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('[AudioPlayer] togglePlayPause error:', err);
    }
  }, [isPlaying]);

  const seekTo = useCallback(async (ms: number) => {
    if (!playerRef.current) return;
    const seconds = ms / 1000;
    console.log('[AudioPlayer] seekTo:', ms, 'ms =', seconds, 's');
    try {
      playerRef.current.seekTo(seconds);
      setPosition(ms);
    } catch (err) {
      console.error('[AudioPlayer] seekTo error:', err);
    }
  }, []);

  const stop = useCallback(async () => {
    console.log('[AudioPlayer] stop');
    unloadCurrent();
    setCurrentSong(null);
    currentSongRef.current = null;
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setQueue([]);
    queueRef.current = [];
  }, [unloadCurrent]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        position,
        duration,
        loading,
        queue,
        recentlyPlayed,
        repeatMode,
        shuffle,
        playSong,
        playQueue,
        enqueue,
        playNext,
        playPrevious,
        clearQueue,
        setRepeatMode,
        toggleShuffle,
        togglePlayPause,
        seekTo,
        stop,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}

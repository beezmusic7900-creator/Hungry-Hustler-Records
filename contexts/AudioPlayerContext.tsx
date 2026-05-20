import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

export interface Song {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string | null;
}

interface AudioPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  position: number;   // milliseconds
  duration: number;   // milliseconds
  loading: boolean;
  playSong: (song: Song) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (ms: number) => Promise<void>;
  stop: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

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

  const playSong = useCallback(async (song: Song) => {
    if (!song.audio_url) {
      console.log('[AudioPlayer] No audio_url for song:', song.title);
      return;
    }
    console.log('[AudioPlayer] playSong:', song.title, song.audio_url);
    setLoading(true);
    setCurrentSong(song);
    setPosition(0);
    setDuration(0);

    unloadCurrent();

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });

      const player = createAudioPlayer({ uri: song.audio_url });

      player.addListener('playbackStatusUpdate', (status) => {
        // expo-audio reports time in seconds — convert to ms for the existing interface
        setPosition(Math.round((status.currentTime ?? 0) * 1000));
        setDuration(Math.round((status.duration ?? 0) * 1000));
        setIsPlaying(status.playing ?? false);
        if (status.didJustFinish) {
          console.log('[AudioPlayer] Song finished:', song.title);
          setIsPlaying(false);
          setPosition(0);
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
  }, [unloadCurrent]);

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
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [unloadCurrent]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        position,
        duration,
        loading,
        playSong,
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

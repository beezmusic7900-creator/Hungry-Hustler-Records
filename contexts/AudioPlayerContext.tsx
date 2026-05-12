import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Audio } from 'expo-av';

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
  position: number;
  duration: number;
  loading: boolean;
  playSong: (song: Song) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (ms: number) => Promise<void>;
  stop: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  const unloadCurrent = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
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

    await unloadCurrent();

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: song.audio_url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis ?? 0);
            setDuration(status.durationMillis ?? 0);
            setIsPlaying(status.isPlaying ?? false);
            if (status.didJustFinish) {
              console.log('[AudioPlayer] Song finished:', song.title);
              setIsPlaying(false);
              setPosition(0);
            }
          }
        }
      );
      soundRef.current = sound;
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
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        console.log('[AudioPlayer] Pause');
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        console.log('[AudioPlayer] Resume');
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('[AudioPlayer] togglePlayPause error:', err);
    }
  }, []);

  const seekTo = useCallback(async (ms: number) => {
    if (!soundRef.current) return;
    console.log('[AudioPlayer] seekTo:', ms);
    try {
      await soundRef.current.setPositionAsync(ms);
      setPosition(ms);
    } catch (err) {
      console.error('[AudioPlayer] seekTo error:', err);
    }
  }, []);

  const stop = useCallback(async () => {
    console.log('[AudioPlayer] stop');
    await unloadCurrent();
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

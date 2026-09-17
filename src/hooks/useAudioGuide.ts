import { useRef, useCallback, useState } from 'react';

export const useAudioGuide = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const playBase64Audio = useCallback((base64String: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audioSrc = `data:audio/wav;base64,${base64String}`;
      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = (e) => {
        console.error('Audio playback error event:', e);
        setIsPlaying(false);
      };

      audio.play().catch((err) => {
        console.warn('Audio auto-play blocked by browser policy:', err);
        setIsPlaying(false);
      });
    } catch (err) {
      console.error('Audio playback error:', err);
      setIsPlaying(false);
    }
  }, []);

  const synthesizeAndPlay = useCallback(async (
    text: string,
    targetLanguageCode: string = 'hi-IN',
    speaker: string = 'meera',
    poiId?: string
  ) => {
    if (!text || !text.trim()) return;
    setIsLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/tts/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text.slice(0, 480),
          target_language_code: targetLanguageCode,
          speaker: speaker,
          poi_id: poiId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio_base64) {
          playBase64Audio(data.audio_base64);
        }
      } else {
        console.warn('TTS Synthesis request returned non-200 status:', res.status);
      }
    } catch (err) {
      console.error('Failed to synthesize Sarvam AI speech:', err);
    } finally {
      setIsLoading(false);
    }
  }, [playBase64Audio]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return { playBase64Audio, synthesizeAndPlay, stopAudio, isPlaying, isLoading };
};

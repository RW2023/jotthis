'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2, Volume2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TTSPlayerProps {
  text: string;
  voice?: string;
  userId: string;
}

export default function TTSPlayer({ text, voice = 'alloy', userId }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeVoice, setActiveVoice] = useState(voice);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load voice preference from localStorage
    const savedVoice = localStorage.getItem('openai_tts_voice');
    if (savedVoice) {
      setActiveVoice(savedVoice);
    }
  }, []);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioUrl) {
      // Resume or restart
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    // Fetch Audio
    setIsLoading(true);
    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openai-key': localStorage.getItem('openai_api_key') || '',
        },
        body: JSON.stringify({ text, voice: activeVoice, userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate speech');
      }

      const url = data.url;
      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);

      await audio.play();
      setIsPlaying(true);

    } catch (error: unknown) {
      console.error('TTS Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to play audio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-full pr-4 border border-slate-700/50 backdrop-blur-sm">
      <button
        onClick={handlePlay}
        disabled={isLoading}
        className="btn btn-circle btn-sm btn-primary text-white border-none shadow-lg shadow-cyan-500/20 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
          <Volume2 className="w-3 h-3 text-cyan-400" />
          {isPlaying ? 'Playing...' : 'Listen to Note'}
        </span>
        {/* Simple visualizer bar when playing (fake) */}
        {isPlaying && (
          <div className="flex gap-0.5 items-end h-2 mt-0.5">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-cyan-400/80 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Loader2, Volume2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

function FrequencyBars({ color = 'cyan' }: { color?: 'cyan' | 'emerald' }) {
  const colorClass = color === 'cyan' ? 'bg-cyan-400/80' : 'bg-emerald-400/80';
  return (
    <div className="flex gap-[2px] items-end h-3 mt-0.5">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className={`w-[3px] ${colorClass} rounded-full animate-pulse`}
          style={{ height: `${30 + Math.sin(i * 0.8) * 25}%`, animationDelay: `${i * 0.08}s`, animationDuration: `${0.6 + (i % 3) * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export { FrequencyBars };

interface TTSPlayerProps {
  text: string;
  voice?: string;
  userId: string;
  compact?: boolean;
}

export default function TTSPlayer({ text, voice = 'alloy', userId, compact = false }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeVoice, setActiveVoice] = useState(voice);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const savedVoice = localStorage.getItem('openai_tts_voice');
    if (savedVoice) setActiveVoice(savedVoice);
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: activeVoice, userId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate speech');

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
  }, [isPlaying, audioUrl, text, activeVoice, userId]);

  if (compact) {
    return (
      <button
        onClick={handlePlay}
        disabled={isLoading}
        className="btn btn-circle btn-sm btn-primary text-white border-none shadow-lg shadow-cyan-500/20 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 w-8 h-8 min-h-0"
        title="Listen to Note"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>
    );
  }

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
        {isPlaying && <FrequencyBars color="cyan" />}
      </div>
    </div>
  );
}

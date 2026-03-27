'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface NoteAudioPlayerProps {
  audioUrl: string;
  compact?: boolean;
}

function PlaybackBars() {
  return (
    <div className="flex gap-[2px] items-end h-3 mt-0.5">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="w-[3px] bg-emerald-400/80 rounded-full animate-pulse"
          style={{ height: `${30 + Math.sin(i * 0.8) * 25}%`, animationDelay: `${i * 0.08}s`, animationDuration: `${0.6 + (i % 3) * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export default function NoteAudioPlayer({ audioUrl, compact = false }: NoteAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => setIsPlaying(false);
    audio.onpause = () => setIsPlaying(false);
    audio.onplay = () => setIsPlaying(true);

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  return (
    <div
      className={`flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-full border border-slate-700/50 backdrop-blur-sm transition-all hover:bg-slate-700/50 ${compact ? 'pr-1.5' : 'pr-4'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={handlePlay}
        className={`btn btn-circle btn-sm btn-primary text-white border-none shadow-lg shadow-emerald-500/20 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 ${compact ? 'w-8 h-8 min-h-0' : ''}`}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>

      {!compact && (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Mic className="w-3 h-3 text-emerald-400" />
            {isPlaying ? 'Playing Original...' : 'Original Audio'}
          </span>
          {isPlaying && <PlaybackBars />}
        </div>
      )}
    </div>
  );
}

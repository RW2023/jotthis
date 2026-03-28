'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, X } from 'lucide-react';

interface VisceralRecorderProps {
  analyserNode: AnalyserNode | null;
  onStop: () => void;
  duration: number;
  liveTranscript?: string;
}

export default function VisceralRecorder({ analyserNode, onStop, duration, liveTranscript }: VisceralRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    const render = () => {
      analyserNode.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - 40; // Shift up slightly for transcript space
      const radius = Math.min(centerX, centerY) * 0.35;

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const average = sum / dataArray.length;
      const pulse = 1 + (average / 128) * 0.5;

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.2 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 211, 238, ${0.02 + (average / 255) * 0.04})`;
      ctx.fill();

      // Circular frequency bars
      ctx.beginPath();
      const gradient = ctx.createLinearGradient(0, centerY - radius, 0, centerY + radius);
      gradient.addColorStop(0, '#22d3ee');
      gradient.addColorStop(0.5, '#818cf8');
      gradient.addColorStop(1, '#e879f9');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#818cf8';

      const bars = 100;
      const step = (Math.PI * 2) / bars;

      for (let i = 0; i < bars; i++) {
        const dataIndex = Math.floor((i / bars) * (dataArray.length / 2));
        const val = dataArray[dataIndex];
        const barHeight = (val / 255) * (radius * 0.8) * pulse;

        const angle = i * step;
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Inner glow circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.95, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyserNode]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        role="img"
        aria-label="Audio frequency visualizer"
      />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg mx-auto px-6">
        {/* Timer */}
        <div className="text-6xl font-mono font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-2xl">
          {formatDuration(duration)}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 text-slate-400/80 uppercase tracking-[0.2em] text-sm animate-pulse">
          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          Recording
        </div>

        {/* Live Transcript Preview */}
        <AnimatePresence>
          {liveTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10 }}
              className="max-h-32 overflow-hidden w-full"
            >
              <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 px-6 py-4 mx-auto max-w-md">
                <p className="text-slate-100 text-base text-center leading-relaxed tracking-wide">
                  &ldquo;{liveTranscript}&rdquo;
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stop Button */}
        <div className="mt-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStop}
            className="btn btn-circle btn-xl w-24 h-24 bg-red-500 hover:bg-red-600 border-none shadow-[0_0_30px_rgba(239,68,68,0.4)] flex items-center justify-center group"
          >
            <Square className="w-8 h-8 text-white fill-white" />
          </motion.button>
        </div>

        <p className="mt-2 text-slate-500 text-sm font-medium">Tap to finish</p>
      </div>

      {/* Close */}
      <button
        onClick={onStop}
        className="absolute top-8 right-8 btn btn-circle btn-ghost text-slate-500 hover:text-white"
        aria-label="Stop recording"
      >
        <X className="w-6 h-6" />
      </button>
    </motion.div>
  );
}

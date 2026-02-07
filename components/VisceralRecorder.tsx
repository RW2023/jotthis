'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, X, Mic } from 'lucide-react';

interface VisceralRecorderProps {
  analyserNode: AnalyserNode | null;
  onStop: () => void;
  duration: number; // in seconds
}

export default function VisceralRecorder({ analyserNode, onStop, duration }: VisceralRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    const render = () => {
      analyserNode.getByteFrequencyData(dataArray);

      // Clear with slight fade for trail effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.4;
      
      // Calculate average volume for pulsing
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const pulse = 1 + (average / 128) * 0.5;

      // Draw specialized circular waveform
      ctx.beginPath();
      // Gradient for likely user preference (Cyberpunk / Premium)
      const gradient = ctx.createLinearGradient(0, centerY - radius, 0, centerY + radius);
      gradient.addColorStop(0, '#22d3ee'); // Cyan
      gradient.addColorStop(0.5, '#818cf8'); // Indigo
      gradient.addColorStop(1, '#e879f9'); // Fuchsia
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#818cf8';

      const bars = 100;
      const step = (Math.PI * 2) / bars;

      for (let i = 0; i < bars; i++) {
        // Mirror the frequency data (bass at bottom/top, treble at sides? or traditional circle)
        // Let's map frequency to angle
        const dataIndex = Math.floor((i / bars) * (dataArray.length / 2)); // Use lower half of spectrum (bass/mids)
        const val = dataArray[dataIndex];
        const barHeight = (val / 255) * (radius * 0.8) * pulse;

        const angle = i * step;

        // Start point (on circle)
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;

        // End point (outwards)
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();

      // Inner glow circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.95, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
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
      />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Timer */}
        <div className="text-6xl font-mono font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-2xl">
          {formatDuration(duration)}
        </div>

        {/* Status Text */}
        <div className="flex items-center gap-2 text-slate-400/80 uppercase tracking-[0.2em] text-sm animate-pulse">
           <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
           Recording
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center gap-6">
           <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStop}
            className="btn btn-circle btn-xl w-24 h-24 bg-red-500 hover:bg-red-600 border-none shadow-[0_0_30px_rgba(239,68,68,0.4)] flex items-center justify-center group"
          >
            <Square className="w-8 h-8 text-white fill-white" />
          </motion.button>
        </div>
        
        <p className="mt-4 text-slate-500 text-sm font-medium">Tap to finish</p>
      </div>

      {/* Close/Cancel (Optional) */}
      <button 
        onClick={onStop} // For now, close just stops. Later could be cancel.
        className="absolute top-8 right-8 btn btn-circle btn-ghost text-slate-500 hover:text-white"
      >
        <X className="w-6 h-6" />
      </button>
    </motion.div>
  );
}

'use client';

import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  volume: number; // 0-100
}

export default function AudioWaveform({ volume }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set styles
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ef4444'; // Red-500
      ctx.beginPath();

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      
      // Volume smoothing/mapping
      // Map 0-100 input to reasonable amplitude (e.g., 0 to height/2)
      // Add a base amplitude so line isn't flat when volume is 0
      const baseAmplitude = 2; 
      const volumeAmplitude = (volume / 100) * (height / 2 - 4);
      const amplitude = baseAmplitude + volumeAmplitude;

      // Draw sine wave
      // y = A * sin(kx + phase)
      phaseRef.current += 0.15; // Speed of horizontal movement

      for (let x = 0; x <= width; x++) {
        // Taper amplitude at edges for cleaner look in circle
        let taper = 1;
        if (x < 10) taper = x / 10;
        if (x > width - 10) taper = (width - x) / 10;

        const y = centerY + Math.sin(x * 0.05 + phaseRef.current) * amplitude * taper;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [volume]);

  return (
    <canvas 
      ref={canvasRef} 
      width={100} 
      height={60} 
      className="w-full h-full absolute inset-0 rounded-full opacity-80"
    />
  );
}

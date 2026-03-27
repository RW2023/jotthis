'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAudioAnalyserReturn {
  frequencyData: number[];
  isActive: boolean;
  connectAudio: (audio: HTMLAudioElement) => void;
  disconnect: () => void;
}

export function useAudioAnalyser(barCount: number = 16): UseAudioAnalyserReturn {
  const [frequencyData, setFrequencyData] = useState<number[]>(new Array(barCount).fill(0));
  const [isActive, setIsActive] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const connectedElementRef = useRef<HTMLAudioElement | null>(null);

  const disconnect = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsActive(false);
    setFrequencyData(new Array(barCount).fill(0));
  }, [barCount]);

  const connectAudio = useCallback((audio: HTMLAudioElement) => {
    // Already connected to this element
    if (connectedElementRef.current === audio && isActive) return;

    try {
      if (!contextRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        contextRef.current = new AudioCtx();
      }

      const ctx = contextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // createMediaElementSource can only be called once per element
      if (connectedElementRef.current !== audio) {
        if (sourceRef.current) {
          try { sourceRef.current.disconnect(); } catch { /* ignore */ }
        }
        sourceRef.current = ctx.createMediaElementSource(audio);
        connectedElementRef.current = audio;
      }

      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 64;
        analyserRef.current.smoothingTimeConstant = 0.8;
      }

      sourceRef.current!.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);

      setIsActive(true);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        const bins = analyserRef.current.frequencyBinCount;
        const step = Math.max(1, Math.floor(bins / barCount));
        const bars: number[] = [];

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += dataArray[i * step + j] || 0;
          }
          bars.push((sum / step / 255) * 100);
        }

        setFrequencyData(bars);
        animFrameRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch {
      // If analyser fails (CORS, browser restrictions), do nothing.
      // Audio still plays normally since we didn't interrupt it.
      setIsActive(false);
    }
  }, [barCount, isActive]);

  useEffect(() => {
    return () => {
      disconnect();
      try {
        if (contextRef.current?.state !== 'closed') {
          contextRef.current?.close();
        }
      } catch { /* ignore */ }
    };
  }, [disconnect]);

  return { frequencyData, isActive, connectAudio, disconnect };
}

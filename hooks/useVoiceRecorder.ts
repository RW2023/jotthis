'use client';

import { useState, useRef, useCallback } from 'react';

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error';

interface UseVoiceRecorderReturn {
  status: RecordingStatus;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setStatus('recording');
      setDuration(0);

      // Update duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      setStatus('error');
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state !== 'recording') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setStatus('idle');
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, []);

  return {
    status,
    duration,
    startRecording,
    stopRecording,
    error,
  };
}

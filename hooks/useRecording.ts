'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { User } from 'firebase/auth';
import { VoiceNote, NoteCategory } from '@/types';
import { useVoiceRecorder } from './useVoiceRecorder';
import { saveVoiceNote, uploadAudio } from '@/lib/firebase-helpers';

interface UseRecordingProps {
  user: User | null;
  setNotes: React.Dispatch<React.SetStateAction<VoiceNote[]>>;
  setSelectedNote: React.Dispatch<React.SetStateAction<VoiceNote | null>>;
  onRequireAuth: () => void;
}

// Browser Speech Recognition types
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export function useRecording({ user, setNotes, setSelectedNote, onRequireAuth }: UseRecordingProps) {
  const { status, duration, volume, startRecording, stopRecording, error, analyserNode } = useVoiceRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startLiveTranscript = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.log('[LiveTranscript] SpeechRecognition not supported');
      return;
    }

    // Small delay to let MediaRecorder fully acquire the mic first
    setTimeout(() => {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalText = '';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcript + ' ';
            } else {
              interim = transcript;
            }
          }
          setLiveTranscript((finalText + interim).trim());
        };

        recognition.onerror = (e: { error: string }) => {
          console.log('[LiveTranscript] Error:', e.error);
        };

        recognition.onend = () => {
          // Restart if still recording (browser stops after pauses in speech)
          if (recognitionRef.current === recognition) {
            try { recognition.start(); } catch { /* ignore */ }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        console.log('[LiveTranscript] Started');
      } catch (err) {
        console.log('[LiveTranscript] Failed to start:', err);
      }
    }, 500);
  }, []);

  const stopLiveTranscript = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  const handleRecord = useCallback(async () => {
    if (!user) {
      onRequireAuth();
      return;
    }

    if (status === 'idle') {
      const apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey) {
        toast('Please add your OpenAI API Key in Settings to transcribe audio.', {
          icon: '🔑',
          style: { borderRadius: '10px', background: '#1e293b', color: '#fff' },
        });
      }
      setLiveTranscript('');
      await startRecording();
      startLiveTranscript();
    } else {
      // Stop recording and process
      stopLiveTranscript();
      setIsProcessing(true);
      const audioBlob = await stopRecording();

      if (audioBlob) {
        try {
          const audioUrl = await uploadAudio(user.uid, audioBlob);

          const formData = new FormData();
          formData.append('audio', audioBlob);

          const apiKey = localStorage.getItem('openai_api_key');
          const headers: Record<string, string> = {};
          if (apiKey) headers['x-openai-key'] = apiKey;

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers,
            body: formData,
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            toast.error(data.error || 'Transcription failed. Check your API key and try again.');
            return;
          }

          const noteId = await saveVoiceNote(user.uid, {
            userId: user.uid,
            title: data.title,
            transcript: data.transcript,
            originalTranscript: data.originalTranscript,
            smartCategory: (data.category ? data.category.charAt(0).toUpperCase() + data.category.slice(1).toLowerCase() : 'Uncategorized') as NoteCategory,
            triage: data.triage,
            tags: data.tags,
            audioUrl,
          });

          const newNote: VoiceNote = {
            id: noteId,
            userId: user.uid,
            title: data.title,
            transcript: data.transcript,
            originalTranscript: data.originalTranscript,
            smartCategory: (data.category ? data.category.charAt(0).toUpperCase() + data.category.slice(1).toLowerCase() : 'Uncategorized') as NoteCategory,
            triage: {
              ...data.triage,
              priority: data.triage?.priority?.toLowerCase() || 'medium',
              actionType: data.triage?.actionType?.toLowerCase() || 'reference',
            },
            tags: data.tags,
            audioUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
            isFavorite: false,
          };

          setNotes(prev => [newNote, ...prev]);
          setSelectedNote(newNote);
          setLiveTranscript('');
        } catch (err) {
          console.error('Transcription failed:', err);
          toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      } else {
        toast.error('No audio was captured. Please try again.');
        setIsProcessing(false);
      }
    }
  }, [user, status, startRecording, stopRecording, setNotes, setSelectedNote, onRequireAuth, startLiveTranscript, stopLiveTranscript]);

  return {
    status,
    duration,
    volume,
    error,
    analyserNode,
    isProcessing,
    liveTranscript,
    handleRecord,
  };
}

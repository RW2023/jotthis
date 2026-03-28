'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Zap, Lightbulb, Check, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { VoiceNote } from '@/types';

interface RelayMenuProps {
  note: VoiceNote;
  isAdmin: boolean;
}

type Destination = 'andy' | 'pipeline' | 'idea';
type SendStatus = 'idle' | 'sending' | 'sent';

const destinations: { id: Destination; label: string; desc: string; icon: typeof Send }[] = [
  { id: 'andy', label: 'Send to Andy', desc: 'Message queue for next session', icon: MessageCircle },
  { id: 'pipeline', label: 'Content Pipeline', desc: 'Generate blog + video content', icon: Zap },
  { id: 'idea', label: 'Save as Idea', desc: 'Add to ideas bank', icon: Lightbulb },
];

export default function RelayMenu({ note, isAdmin }: RelayMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [statuses, setStatuses] = useState<Record<Destination, SendStatus>>({
    andy: 'idle',
    pipeline: 'idle',
    idea: 'idle',
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Don't render for non-admin users
  if (!isAdmin) return null;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleRelay = async (destination: Destination) => {
    if (statuses[destination] === 'sending' || statuses[destination] === 'sent') return;

    setStatuses(prev => ({ ...prev, [destination]: 'sending' }));

    try {
      const adminKey = localStorage.getItem('openai_api_key');
      const response = await fetch('/api/relay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify({
          destination,
          note: {
            id: note.id,
            title: note.title,
            transcript: note.transcript,
            tags: note.tags,
            category: note.smartCategory,
            triage: note.triage,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Relay failed');
      }

      setStatuses(prev => ({ ...prev, [destination]: 'sent' }));

      const labels: Record<Destination, string> = {
        andy: 'Sent to Andy',
        pipeline: 'Sent to pipeline',
        idea: 'Saved as idea',
      };
      toast.success(labels[destination]);
    } catch (error: unknown) {
      setStatuses(prev => ({ ...prev, [destination]: 'idle' }));
      console.error('Relay failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to relay note');
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-circle btn-sm btn-ghost text-slate-400 hover:text-cyan-400 transition-colors"
        title="Send to..."
      >
        <Send className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700/50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Send to</p>
          </div>

          {destinations.map((dest) => {
            const status = statuses[dest.id];
            const Icon = dest.icon;

            return (
              <button
                key={dest.id}
                onClick={() => handleRelay(dest.id)}
                disabled={status === 'sending' || status === 'sent'}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-700/50 transition-colors disabled:opacity-60 disabled:cursor-default text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                  {status === 'sending' ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : status === 'sent' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Icon className="w-4 h-4 text-slate-300" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${status === 'sent' ? 'text-green-400' : 'text-slate-200'}`}>
                    {status === 'sent' ? 'Sent' : dest.label}
                  </p>
                  <p className="text-xs text-slate-500">{dest.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

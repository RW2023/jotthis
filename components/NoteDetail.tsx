'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Loader2, ListChecks, Lightbulb, Search, Tag } from 'lucide-react';
import { VoiceNote } from '@/types';

interface NoteDetailProps {
  note: VoiceNote;
  onBack: () => void;
  onUpdate: (note: VoiceNote) => void;
}

type InsightType = 'actionItems' | 'contentIdeas' | 'research';

export default function NoteDetail({ note, onBack, onUpdate }: NoteDetailProps) {
  const [loadingInsight, setLoadingInsight] = useState<InsightType | null>(null);
  const [insights, setInsights] = useState<VoiceNote['insights']>(note.insights || {});

  const extractInsights = async (type: InsightType) => {
    setLoadingInsight(type);

    try {
      const apiKey = localStorage.getItem('openai_api_key');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openai-key': apiKey || '',
        },
        body: JSON.stringify({
          transcript: note.transcript,
          type,
        }),
      });

      const data = await response.json();

      console.log('API Response:', data);

      if (data.success) {
        // Map 'research' to 'researchPointers' to match VoiceNote type
        const stateKey = type === 'research' ? 'researchPointers' : type;
        const updatedInsights = { ...insights, [stateKey]: data.insights };

        console.log('Updating insights state:', updatedInsights);
        setInsights(updatedInsights);

        const updatedNote = { ...note, insights: updatedInsights };
        onUpdate(updatedNote);
      } else {
        console.error('API returned success: false', data);
      }
    } catch (err) {
      console.error('Failed to extract insights:', err);
    } finally {
      setLoadingInsight(null);
    }
  };

  const insightButtons = [
    {
      type: 'actionItems' as InsightType,
      label: 'Action Items',
      icon: ListChecks,
      color: 'text-green-400',
    },
    {
      type: 'contentIdeas' as InsightType,
      label: 'Content Ideas',
      icon: Lightbulb,
      color: 'text-yellow-400',
    },
    {
      type: 'research' as InsightType,
      label: 'Research',
      icon: Search,
      color: 'text-blue-400',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="btn btn-circle btn-ghost text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-100">{note.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date(note.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {note.tags.map(tag => (
            <span key={tag} className="badge badge-lg glass text-cyan-300 border-cyan-400/30">
              <Tag className="w-4 h-4 mr-1" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Transcript */}
      <div className="glass p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          Transcript
        </h2>
        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{note.transcript}</p>
      </div>

      {/* Insight Extraction Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {insightButtons.map(({ type, label, icon: Icon, color }) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => extractInsights(type)}
            disabled={loadingInsight !== null}
            className="glass glass-hover p-4 rounded-xl text-left flex items-center gap-3"
          >
            {loadingInsight === type ? (
              <Loader2 className={`w-5 h-5 ${color} animate-spin`} />
            ) : (
              <Icon className={`w-5 h-5 ${color}`} />
            )}
            <span className="text-slate-200 font-medium">{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Insights Display */}
      <AnimatePresence>
        {Object.entries(insights || {}).map(([type, items]) =>
          items && items.length > 0 ? (
            <motion.div
              key={type}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass p-6 rounded-xl mb-4"
            >
              <h3 className="text-lg font-semibold text-slate-200 mb-3 capitalize">
                {type.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <ul className="space-y-2">
                {items.map((item, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="text-slate-300 flex items-start gap-2"
                  >
                    <span className="text-cyan-400 mt-1">•</span>
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ) : null
        )}
      </AnimatePresence>
    </motion.div>
  );
}

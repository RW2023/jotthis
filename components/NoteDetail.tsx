import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Loader2, ListChecks, Lightbulb, Search, Tag, Share2, Copy, Check, Archive, ArchiveRestore, RefreshCcw, Trash2, Heart, Lock, Unlock } from 'lucide-react';
import { VoiceNote } from '@/types';
import TTSPlayer from './TTSPlayer';

import { updateNoteShareToken } from '@/lib/firebase-helpers';

interface NoteDetailProps {
  note: VoiceNote;
  onBack: () => void;
  onUpdate: (note: VoiceNote) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string, isArchived: boolean) => void;
  onRestore: (id: string) => void;
  onFavorite: (id: string, isFavorite: boolean) => void;
  onLock: (id: string, isLocked: boolean) => void;
  isTrash: boolean;
}

type InsightType = 'actionItems' | 'contentIdeas' | 'research';



export default function NoteDetail({
  note,
  onBack,
  onUpdate,
  onDelete,
  onArchive,
  onRestore,
  onFavorite,
  onLock,
  isTrash
}: NoteDetailProps) {
  const [loadingInsight, setLoadingInsight] = useState<InsightType | null>(null);
  const [insights, setInsights] = useState<VoiceNote['insights']>(note.insights || {});
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const handleShare = async () => {
    setShowShareModal(true);

    if (!note.shareToken) {
      setGeneratingLink(true);
      try {
        // Generate a simple unique token (random string)
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        await updateNoteShareToken(note.userId, note.id, token, true);

        const updatedNote = { ...note, shareToken: token, isShared: true };
        onUpdate(updatedNote);
      } catch (error) {
        console.error('Error generating share link:', error);
        toast.error('Failed to generate share link');
      } finally {
        setGeneratingLink(false);
      }
    }
  };

  const copyToClipboard = () => {
    if (!note.shareToken) return;

    const url = `${window.location.origin}/share/${note.id}?token=${note.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    toast.success('Link copied to clipboard!');
  };

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

        if (data.insights.length === 0) {
          toast.success('No unique actionable items found in this note.', {
            icon: 'ℹ️',
            style: {
              borderRadius: '10px',
              background: '#1e293b',
              color: '#fff',
            },
          });
        } else {
          toast.success('Analysis complete!', {
            icon: '✨',
            style: {
              borderRadius: '10px',
              background: '#1e293b',
              color: '#fff',
            },
          });
        }

        const updatedNote = { ...note, insights: updatedInsights };
        onUpdate(updatedNote);
      } else {
        console.error('API returned success: false', data);
      }
    } catch (err) {
      console.error('Failed to extract insights:', err);
      toast.error('Failed to analyze note. Check your API Key.', {
        style: {
          borderRadius: '10px',
          background: '#1e293b',
          color: '#fff',
        },
      });
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

        {!isTrash && (
          <TTSPlayer
            text={note.transcript}
            userId={note.userId}
          />
        )}
      </div>

      <div className="flex gap-2">
        {/* Actions */}
        {!isTrash && (
          <>
            <button
              onClick={() => onLock(note.id, !note.isLocked)}
              className={`btn btn-ghost btn-circle ${note.isLocked ? 'text-amber-500 hover:text-amber-400' : 'text-slate-400 hover:text-amber-500'}`}
              title={note.isLocked ? "Unlock Note" : "Lock Note"}
            >
              {note.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </button>

            <button
              onClick={() => {
                if (!note.isLocked) onArchive(note.id, !note.isArchived);
              }}
              disabled={!!note.isLocked}
              className={`btn btn-ghost btn-circle ${note.isLocked ? 'opacity-50 cursor-not-allowed text-slate-600' : 'text-slate-400 hover:text-cyan-400'}`}
              title={note.isLocked ? "Unlock to Archive" : (note.isArchived ? "Unarchive" : "Archive")}
            >
              {note.isArchived ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
            </button>

            <button
              onClick={handleShare}
              className="btn btn-ghost text-cyan-400 hover:bg-cyan-400/10 gap-2"
            >
              <Share2 className="w-5 h-5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </>
        )}

        {isTrash && (
          <button
            onClick={() => onRestore(note.id)}
            className="btn btn-ghost text-green-400 hover:bg-green-400/10 gap-2"
          >
            <RefreshCcw className="w-5 h-5" />
            <span className="hidden sm:inline">Restore</span>
          </button>
        )}

        <button
          onClick={() => {
            if (!note.isLocked) onDelete(note.id);
          }}
          disabled={!!note.isLocked}
          className={`btn btn-ghost btn-circle ${note.isLocked ? 'opacity-50 cursor-not-allowed text-slate-600' : (isTrash ? 'text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-400')}`}
          title={note.isLocked ? "Unlock to Delete" : (isTrash ? "Delete Permanently" : "Move to Trash")}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>


      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1e293b] border border-slate-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-400" />
                Share Note
              </h3>
              <p className="text-slate-400 mb-6 text-sm">
                Anyone with this link can view the transcript of this note.
              </p>

              {generatingLink ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : (
                <div className="bg-black/30 p-3 rounded-lg flex items-center gap-3 border border-slate-700/50">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-slate-300 text-sm truncate font-mono">
                      {typeof window !== 'undefined' ? `${window.location.origin}/share/${note.id}?token=${note.shareToken}` : 'Loading...'}
                    </p>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="btn btn-square btn-sm btn-ghost hover:bg-white/10 text-cyan-400"
                  >
                    {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="btn btn-ghost text-slate-300 hover:text-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Selection */}
      <div className="mb-6">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
          Category
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full border border-slate-700">Focus Mode</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {(['Work', 'Personal', 'Family', 'Hobby', 'Uncategorized'] as const).map(category => {
            const isSelected = note.smartCategory === category || (!note.smartCategory && category === 'Uncategorized');
            let activeStyle = '';
            if (category === 'Work') activeStyle = 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg ring-1 ring-emerald-400';
            if (category === 'Personal') activeStyle = 'bg-blue-500 text-white shadow-blue-500/20 shadow-lg ring-1 ring-blue-400';
            if (category === 'Family') activeStyle = 'bg-amber-500 text-white shadow-amber-500/20 shadow-lg ring-1 ring-amber-400';
            if (category === 'Hobby') activeStyle = 'bg-rose-500 text-white shadow-rose-500/20 shadow-lg ring-1 ring-rose-400';
            if (category === 'Uncategorized') activeStyle = 'bg-slate-700 text-slate-200 ring-1 ring-slate-600';

            return (
              <button
                key={category}
                onClick={() => onUpdate({ ...note, smartCategory: category })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent
                  ${isSelected
                    ? activeStyle
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-slate-700/50'
                  }
                `}
              >
                {category}
              </button>
            );
          })}
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

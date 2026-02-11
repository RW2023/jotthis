import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Loader2, ListChecks, Lightbulb, Search, Tag, Share2, Copy, Check, Archive, ArchiveRestore, RefreshCcw, Trash2, Lock, Unlock, CalendarPlus, Mail } from 'lucide-react';
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

type InsightType = 'actionItems' | 'contentIdeas' | 'research' | 'all';

export default function NoteDetail({
  note,
  onBack,
  onUpdate,
  onDelete,
  onArchive,
  onRestore,
  onFavorite: _onFavorite,
  onLock,
  isTrash
}: NoteDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(note.title);
  const [editedTranscript, setEditedTranscript] = useState(note.transcript);
  const [loadingInsight, setLoadingInsight] = useState<InsightType | null>(null);
  const [insights, setInsights] = useState<VoiceNote['insights']>(note.insights || {});
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyTranscriptSuccess, setCopyTranscriptSuccess] = useState(false);
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

  const copyShareLink = () => {
    if (!note.shareToken) return;

    const url = `${window.location.origin}/share/${note.id}?token=${note.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    toast.success('Link copied to clipboard!');
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(note.transcript);
    setCopyTranscriptSuccess(true);
    setTimeout(() => setCopyTranscriptSuccess(false), 2000);
    toast.success('Transcript copied to clipboard!');
  };

  const handleSave = async () => {
    if (!editedTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    if (!editedTranscript.trim()) {
      toast.error('Transcript cannot be empty');
      return;
    }

    try {
      await onUpdate({
        ...note,
        title: editedTitle.trim(),
        transcript: editedTranscript.trim(),
      });
      setIsEditing(false);
      toast.success('Note updated!');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleCancel = () => {
    setEditedTitle(note.title);
    setEditedTranscript(note.transcript);
    setIsEditing(false);
  };

  /* AI Analysis Handler */
  const handleAnalyze = async () => {
    setLoadingInsight('all');
    try {
      const response = await fetch(`/api/notes/${note.id}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();

      if (data.success) {
        toast.success('Note analyzed successfully!', { icon: '✨' });

        // Update local state immediately for responsiveness
        const updatedNote = {
          ...note,
          summary: data.data.summary,
          actionItems: data.data.actionItems,
          tags: [...(note.tags || []), ...(data.data.tags || [])], // Merge tags
          isAnalyzed: true
        };

        onUpdate(updatedNote);
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze note. Please try again.');
    } finally {
      setLoadingInsight(null);
    }
  };

  /* Smart Actions */
  const addToCalendar = (text: string) => {
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&details=Generated from JotThis`;
    window.open(url, '_blank');
  };

  const sendEmail = (text: string) => {
    const url = `mailto:?subject=${encodeURIComponent("Action Item: " + text)}&body=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto pb-20"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="btn btn-circle btn-ghost text-slate-400 lg:hidden" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-2xl font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              placeholder="Note Title"
              autoFocus
            />
          ) : (
              <h1 className="text-3xl font-bold text-slate-100">{note.title}</h1>
          )}
          <p className="text-sm text-slate-500 mt-1">
            {new Date(note.createdAt).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              hour: 'numeric', minute: '2-digit'
            })}
          </p>
        </div>

        {!isTrash && (
          <TTSPlayer text={note.transcript} userId={note.userId} />
        )}
      </div>

      <div className="flex gap-2 mb-8">
        {/* Actions Toolbar */}
        {!isTrash && (
          <>
            <button
              onClick={() => onLock(note.id, !note.isLocked)}
              className={`btn btn-ghost btn-circle ${note.isLocked ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
              title={note.isLocked ? "Unlock Note" : "Lock Note"}
            >
              {note.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </button>

            <button
              onClick={() => !note.isLocked && onArchive(note.id, !note.isArchived)}
              disabled={!!note.isLocked}
              className={`btn btn-ghost btn-circle ${note.isLocked ? 'opacity-50' : 'text-slate-400 hover:text-cyan-400'}`}
              title={note.isArchived ? "Unarchive" : "Archive"}
            >
              {note.isArchived ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
            </button>

            <button onClick={handleShare} className="btn btn-ghost text-cyan-400 hover:bg-cyan-400/10 gap-2">
              <Share2 className="w-5 h-5" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-ghost text-slate-400 hover:text-cyan-400 gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </>
        )}

        {isTrash && (
          <button onClick={() => onRestore(note.id)} className="btn btn-ghost text-green-400 hover:bg-green-400/10 gap-2">
            <RefreshCcw className="w-5 h-5" />
            <span className="hidden sm:inline">Restore</span>
          </button>
        )}

        <button
          onClick={() => !note.isLocked && onDelete(note.id)}
          disabled={!!note.isLocked}
          className={`btn btn-ghost btn-circle ${note.isLocked ? 'opacity-50' : (isTrash ? 'text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-400')}`}
          title={isTrash ? "Delete Permanently" : "Move to Trash"}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* AI Summary Section */}
      {note.summary && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-3 text-indigo-300 font-semibold">
            <Sparkles className="w-5 h-5" />
            <h3>AI Summary</h3>
          </div>
          <p className="text-slate-200 leading-relaxed text-lg font-medium">{note.summary}</p>
        </motion.div>
      )}

      {/* Action Items & Tags Grid */}
      {(note.actionItems?.length || 0) > 0 || (note.tags?.length || 0) > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Action Items */}
          {note.actionItems && note.actionItems.length > 0 && (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4 text-emerald-400 font-semibold">
                <ListChecks className="w-5 h-5" />
                <h3>Action Items</h3>
              </div>
              <ul className="space-y-3">
                {note.actionItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 group relative pr-8">
                    <div className="mt-1 w-5 h-5 flex-shrink-0 rounded border border-emerald-500/30 flex items-center justify-center group-hover:border-emerald-500/60 transition-colors cursor-default">
                      {/* Checkbox placeholder */}
                    </div>
                    <span className="text-slate-300 group-hover:text-slate-200 transition-colors flex-1">{item}</span>

                    {/* Smart Actions (Show on Hover) */}
                    <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-[#1e293b] shadow-lg rounded-lg p-1 border border-slate-700/50 -mt-1 transform translate-x-2">
                      <button
                        onClick={() => addToCalendar(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                        title="Add to Calendar"
                      >
                        <CalendarPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => sendEmail(item)}
                        className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-md transition-colors"
                        title="Send via Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags Cloud */}
          {note.tags && note.tags.length > 0 && (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4 text-cyan-400 font-semibold">
                <Tag className="w-5 h-5" />
                <h3>Smart Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {note.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Transcript Editor */}
      <div className="glass p-6 rounded-xl mb-6 relative group">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-200">Transcript</h2>
          <button onClick={copyTranscript} className="btn btn-ghost btn-sm text-slate-400 hover:text-cyan-400 gap-2">
            {copyTranscriptSuccess ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span className="text-xs">Copy</span>
          </button>
        </div>

        {isEditing ? (
          <textarea
            value={editedTranscript}
            onChange={(e) => setEditedTranscript(e.target.value)}
            className="w-full h-96 bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-slate-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none font-mono text-base"
          />
        ) : (
          <div className="prose prose-invert max-w-none text-slate-300 leading-8">
            {note.transcript}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="flex justify-end gap-3 mb-6">
          <button onClick={handleCancel} className="btn btn-ghost text-slate-400">Cancel</button>
          <button onClick={handleSave} className="btn bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/20 border-none">Save Changes</button>
        </div>
      )}

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

      {/* Generate AI Analysis Button (if not yet analyzed) */}
      {!note.isAnalyzed && !loadingInsight && !isTrash && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAnalyze}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Generate AI Insights
        </motion.button>
      )}

      {loadingInsight && (
        <div className="w-full py-8 text-center text-slate-400 flex flex-col items-center gap-3 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p>Analyzing note content...</p>
        </div>
      )}

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
                  <button onClick={copyShareLink} className="btn btn-square btn-sm btn-ghost hover:bg-white/10 text-cyan-400">
                    {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

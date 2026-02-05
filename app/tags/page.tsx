'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { loadUserNotes } from '@/lib/firebase-helpers';
import { VoiceNote } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Search, Tag, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TagCloudPage() {
  const { user, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      if (!authLoading) setLoading(false);
      return;
    }

    const loadNotes = async () => {
      setLoading(true);
      try {
        const userNotes = await loadUserNotes(user.uid);
        setNotes(userNotes);
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [user, authLoading]);

  // Aggregate tags
  const tagCounts = notes.reduce((acc, note) => {
    note.tags?.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) // Sort by count desc, then alpha
    .map(([tag, count]) => ({ tag, count }));

  const filteredTags = sortedTags.filter(item => 
    item.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNotes = selectedTag 
    ? notes.filter(note => note.tags?.includes(selectedTag)) 
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="btn btn-circle btn-ghost text-slate-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Tag Cloud
            </h1>
            <p className="text-slate-500 text-sm">
              Explore your {notes.length} notes by topic
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-8 relative max-w-md mx-auto">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-500" />
          </div>
          <input
            type="text"
            className="input input-bordered w-full pl-10 bg-slate-800/50 border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-slate-100 placeholder:text-slate-500 rounded-xl transition-all"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tag Cloud */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <AnimatePresence>
            {filteredTags.map(({ tag, count }) => {
               // Calculate size based on count (min 1, max 5 for example)
               const maxCount = sortedTags[0]?.count || 1;
               const scale = 1 + (count / maxCount) * 0.5; // Scale from 1.0 to 1.5
               const opacity = selectedTag && selectedTag !== tag ? 0.5 : 1;
               
               return (
                <motion.button
                  key={tag}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity, scale: selectedTag === tag ? 1.1 : 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`
                    px-4 py-2 rounded-full border transition-all duration-300 flex items-center gap-2
                    ${selectedTag === tag 
                      ? 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                      : 'bg-slate-800/50 text-cyan-400 border-slate-700/50 hover:bg-slate-700/50 hover:border-cyan-500/30'
                    }
                  `}
                  style={{ fontSize: `${1 * (0.9 + (count/maxCount)*0.4)}rem` }}
                >
                  <Tag className="w-3 h-3 opacity-70" />
                  {tag}
                  <span className={`text-xs ml-1 px-1.5 py-0.5 rounded-full ${selectedTag === tag ? 'bg-white/20' : 'bg-slate-900/50'}`}>
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
          
          {filteredTags.length === 0 && (
             <div className="text-slate-500 py-8">No tags found matching "{searchQuery}"</div>
          )}
        </div>

        {/* Results Section */}
        <AnimatePresence>
          {selectedTag && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-cyan-400" />
                Notes tagged with "{selectedTag}"
              </h2>
              
              <div className="grid gap-4">
                {filteredNotes.map(note => (
                  <Link 
                    key={note.id} 
                    href={`/?search=${selectedTag}`} // Or maybe just link to home with search usage? Actually linking to Home might reset state. 
                    // Better to maybe show a mini card. But recreating NoteCard is complex.
                    // For now, let's make it simple cards that might link to the main view if possible. 
                    // Actually, since main view wipes state on reload, a link back to /?search=tag is the best "deep link" approach if supported.
                    // I will need to update Home to read search param.
                    className="glass p-4 rounded-xl hover:bg-white/5 transition-colors group block"
                  >
                     <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                           {note.title}
                        </h3>
                        <span className="text-xs text-slate-500">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                     </div>
                     <p className="text-slate-400 text-sm line-clamp-2">
                       {note.transcript}
                     </p>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

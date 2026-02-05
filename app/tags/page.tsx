'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { loadUserNotes } from '@/lib/firebase-helpers';
import { VoiceNote } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Search, Tag, Loader2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TagCloudPage() {
  const { user, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Smart Grouping State
  const [isSmartView, setIsSmartView] = useState(false);
  const [isGrouping, setIsGrouping] = useState(false);
  const [tagClusters, setTagClusters] = useState<{ theme: string; tags: string[]; hexColor?: string }[]>([]);

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

  useEffect(() => {
    // Load persisted state on mount
    const savedSmartView = localStorage.getItem('smartViewActive');
    const savedClusters = localStorage.getItem('tagClusters');

    if (savedSmartView === 'true' && savedClusters) {
      try {
        setTagClusters(JSON.parse(savedClusters));
        setIsSmartView(true);
      } catch (e) {
        console.error('Failed to parse saved clusters', e);
      }
    }
  }, []);

  // Handle Smart Grouping
  const handleSmartGroupToggle = async () => {
    if (isSmartView) {
      setIsSmartView(false);
      localStorage.setItem('smartViewActive', 'false');
      return;
    }

    // If we already have clusters, just switch view
    if (tagClusters.length > 0) {
      setIsSmartView(true);
      localStorage.setItem('smartViewActive', 'true');
      return;
    }

    setIsGrouping(true);
    try {
      const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));
      const response = await fetch('/api/organize-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openai-key': localStorage.getItem('openai_api_key') || '',
        },
        body: JSON.stringify({ tags: allTags }),
      });

      const data = await response.json();
      if (data.success && data.clusters) {
        setTagClusters(data.clusters);
        setIsSmartView(true);
        // Persist state
        localStorage.setItem('tagClusters', JSON.stringify(data.clusters));
        localStorage.setItem('smartViewActive', 'true');
      }
    } catch (error) {
      console.error('Failed to group tags:', error);
    } finally {
      setIsGrouping(false);
    }
  };

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


          <button
            onClick={handleSmartGroupToggle}
            disabled={isGrouping}
            className={`btn btn-sm gap-2 transition-all ${isSmartView
              ? 'btn-primary shadow-lg shadow-cyan-500/20'
              : 'btn-ghost text-slate-400 hover:text-cyan-400'
              }`}
          >
            {isGrouping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className={`w-4 h-4 ${isSmartView ? 'text-yellow-300' : ''}`} />
            )}
            {isSmartView ? 'Smart View Active' : 'Smart Group'}
          </button>
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

        {/* Tag Cloud (Default View) */}
        {!isSmartView && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <AnimatePresence>
            {filteredTags.map(({ tag, count }) => {
               // Calculate size based on count (min 1, max 5 for example)
               const maxCount = sortedTags[0]?.count || 1;
              // const scale = 1 + (count / maxCount) * 0.5; // Unused
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
              <div className="text-slate-500 py-8">No tags found matching &quot;{searchQuery}&quot;</div>
            )}
          </div>
        )}

        {/* Smart Clusters View */}
        <AnimatePresence>
          {isSmartView && tagClusters.map((cluster, idx) => (
            <motion.div
              key={cluster.theme}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="mb-8"
            >
              <h3
                className="text-lg font-semibold mb-3 border-b border-slate-800 pb-1 flex items-center gap-2"
                style={{ color: cluster.hexColor || '#94a3b8' }}
              >
                <span className="w-2 h-8 rounded-r-full" style={{ backgroundColor: cluster.hexColor || '#94a3b8' }} />
                {cluster.theme}
              </h3>
              <div className="flex flex-wrap gap-2 pl-4">
                {cluster.tags.map(tag => {
                  const count = tagCounts[tag] || 0;
                  // Use the cluster color for the active state
                  const activeColor = cluster.hexColor || '#06b6d4';
                  const isSelected = selectedTag === tag;

                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`
                            px-3 py-1 text-sm rounded-full border transition-all flex items-center gap-2
                            ${isSelected
                          ? 'text-white shadow-lg'
                          : 'bg-slate-800/30 text-slate-300 border-slate-700/50 hover:bg-slate-700/50'
                        }
                          `}
                      style={{
                        backgroundColor: isSelected ? activeColor : undefined,
                        borderColor: isSelected ? activeColor : undefined,
                        boxShadow: isSelected ? `0 0 15px ${activeColor}40` : undefined
                      }}
                    >
                      <Tag className="w-3 h-3 opacity-50" />
                      {tag}
                      <span className="text-[10px] opacity-70 bg-black/20 px-1 rounded ml-1">{count}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Results Sidebar */}
        <AnimatePresence>
          {selectedTag && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedTag(null)}
                className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              />

              {/* Sidebar panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 right-0 bottom-0 w-full md:w-96 bg-slate-900/95 border-l border-slate-700 shadow-2xl p-6 z-50 overflow-y-auto backdrop-blur-xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-cyan-400" />
                    {selectedTag}
                  </h2>
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid gap-4">
                  {filteredNotes.map(note => (
                    <Link
                      key={note.id} 
                      href={`/?search=${selectedTag}`}
                      className="glass p-4 rounded-xl hover:bg-white/5 transition-colors group block border border-slate-700/50"
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

                  {filteredNotes.length === 0 && (
                    <p className="text-slate-500 text-center py-4">No notes found (this shouldn&apos;t happen).</p>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

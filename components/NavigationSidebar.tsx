'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Settings, LogOut, Tag, Heart, Trash2, Archive,
  CheckSquare, LayoutGrid
} from 'lucide-react';
import { User } from 'firebase/auth';

interface NavigationSidebarProps {
  viewMode: 'active' | 'archived' | 'trash' | 'favorites';
  setViewMode: (mode: 'active' | 'archived' | 'trash' | 'favorites') => void;
  isFocusMode: boolean;
  setIsFocusMode: (val: boolean) => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  sortOrder: 'newest' | 'oldest';
  setSortOrder: (val: 'newest' | 'oldest') => void;
  showSettings: () => void;
  user: User | null;
  signOut: () => void;
  className?: string;
}

export default function NavigationSidebar({
  viewMode,
  setViewMode,
  isFocusMode,
  setIsFocusMode,
  isSelectionMode,
  onToggleSelectionMode,
  sortOrder: _sortOrder,
  setSortOrder: _setSortOrder,
  showSettings,
  user,
  signOut,
  className = ''
}: NavigationSidebarProps) {
  
  const navItems = [
    { id: 'active', label: 'Active', icon: LayoutGrid, color: 'text-cyan-400' },
    { id: 'favorites', label: 'Favorites', icon: Heart, color: 'text-amber-400' },
    { id: 'archived', label: 'Archive', icon: Archive, color: 'text-slate-400' },
    { id: 'trash', label: 'Trash', icon: Trash2, color: 'text-red-400' },
  ] as const;

  return (
    <div className={`flex flex-col h-full bg-slate-900/50 backdrop-blur-xl border-r border-slate-700/50 p-4 ${className}`}>
      {/* Header / Logo */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 flex-shrink-0">
          <Image
            src="/icon-512.png"
            alt="JotThis Logo"
            fill
            className="object-cover"
          />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent truncate">
          JotThis
        </h1>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1 flex-1">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
          Notes
        </div>
        
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setViewMode(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              viewMode === item.id 
                ? 'bg-white/10 text-white shadow-lg' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <item.icon className={`w-5 h-5 ${viewMode === item.id ? item.color : 'text-current'}`} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

        <div className="pt-4 mt-4 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
            Tools
          </div>

          <Link
            href="/tags"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all"
          >
            <Tag className="w-5 h-5" />
            <span className="font-medium">Tags</span>
          </Link>

          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              isFocusMode 
                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/50' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isFocusMode ? 'bg-emerald-400/20' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${isFocusMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            </div>
            <span className="font-medium">Focus Mode</span>
          </button>

          <button
            onClick={onToggleSelectionMode}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isSelectionMode
              ? 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/50'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
          >
            <CheckSquare className={`w-5 h-5 ${isSelectionMode ? 'fill-cyan-400/20' : ''}`} />
            <span className="font-medium">Select Notes</span>
          </button>
        </div>
      </nav>

      {/* Footer / Settings */}
      <div className="mt-auto pt-4 border-t border-slate-800 space-y-2">
        <button
          onClick={showSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>

        {user && (
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
}

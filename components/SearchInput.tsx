'use client';

import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SearchInput({ value, onChange, className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        
        {/* Input Field */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search notes..."
          className="input input-bordered w-full pl-10 pr-10 bg-slate-800/50 border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-full transition-all duration-300 placeholder:text-slate-500 text-slate-200"
        />

        {/* Clear Button */}
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <div className="btn btn-circle btn-xs btn-ghost hover:bg-slate-700/50">
                <X className="h-4 w-4 text-slate-400" />
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

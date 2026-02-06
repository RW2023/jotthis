import React from 'react';
import { VoiceNote, NotePriority, ActionType } from '@/types';
import { AlertCircle, Calendar, ShoppingCart, Lightbulb, CheckSquare, BookOpen, Clock } from 'lucide-react';

interface TriageCenterProps {
  notes: VoiceNote[];
  onFilterChange: (filter: { type: 'priority' | 'action', value: string } | null) => void;
  activeFilter: { type: 'priority' | 'action', value: string } | null;
}

export function TriageCenter({ notes, onFilterChange, activeFilter }: TriageCenterProps) {
  // 1. Calculate Stats
  const criticalCount = notes.filter(n => n.triage?.priority?.toLowerCase() === 'critical' && !n.isArchived && n.triage?.status !== 'done').length;
  const highCount = notes.filter(n => n.triage?.priority?.toLowerCase() === 'high' && !n.isArchived && n.triage?.status !== 'done').length;
  const actionCounts = {
    task: notes.filter(n => n.triage?.actionType?.toLowerCase() === 'task' && !n.isArchived && n.triage?.status !== 'done').length,
    calendar: notes.filter(n => n.triage?.actionType?.toLowerCase() === 'calendar' && !n.isArchived && n.triage?.status !== 'done').length,
    purchase: notes.filter(n => n.triage?.actionType?.toLowerCase() === 'purchase' && !n.isArchived && n.triage?.status !== 'done').length,
    idea: notes.filter(n => n.triage?.actionType?.toLowerCase() === 'idea' && !n.isArchived && n.triage?.status !== 'done').length,
  };

  const isActive = (type: 'priority' | 'action', value: string) =>
    activeFilter?.type === type && activeFilter?.value === value;

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          Triage Center
        </h2>
        {activeFilter && (
          <button
            onClick={() => onFilterChange(null)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Priority Block */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
          <h3 className="text-xs font-medium text-zinc-500 mb-3 uppercase">Urgency</h3>
          <div className="flex gap-3">
            <button
              onClick={() => onFilterChange(isActive('priority', 'critical') ? null : { type: 'priority', value: 'critical' })}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${isActive('priority', 'critical')
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800'
                }`}
            >
              <span className="text-2xl font-bold mb-1 text-rose-500">{criticalCount}</span>
              <span className="text-xs font-medium">Do Now</span>
            </button>
            <button
              onClick={() => onFilterChange(isActive('priority', 'high') ? null : { type: 'priority', value: 'high' })}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${isActive('priority', 'high')
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800'
                }`}
            >
              <span className="text-2xl font-bold mb-1 text-amber-500">{highCount}</span>
              <span className="text-xs font-medium">Schedule</span>
            </button>
          </div>
        </div>

        {/* Action Type Block */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
          <h3 className="text-xs font-medium text-zinc-500 mb-3 uppercase">Action Buckets</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { type: 'task', icon: CheckSquare, label: 'Tasks', count: actionCounts.task, color: 'text-emerald-400' },
              { type: 'calendar', icon: Calendar, label: 'Events', count: actionCounts.calendar, color: 'text-blue-400' },
              { type: 'purchase', icon: ShoppingCart, label: 'Buy', count: actionCounts.purchase, color: 'text-purple-400' },
              { type: 'idea', icon: Lightbulb, label: 'Ideas', count: actionCounts.idea, color: 'text-yellow-400' },
            ].map((bucket) => (
              <button
                key={bucket.type}
                onClick={() => onFilterChange(isActive('action', bucket.type) ? null : { type: 'action', value: bucket.type })}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${isActive('action', bucket.type)
                  ? 'bg-zinc-800 border-zinc-600'
                  : 'bg-zinc-800/30 border-transparent hover:bg-zinc-800/50'
                  }`}
              >
                <bucket.icon className={`w-5 h-5 mb-2 ${bucket.color}`} />
                <span className="text-xs text-zinc-400">{bucket.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

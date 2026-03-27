'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Settings,
    LogOut,
    Mic,
    Search,
    Sun,
    Moon,
    FileAudio
} from 'lucide-react';
import { useNotes } from '@/components/NotesProvider';
import { useAuth } from '@/components/AuthProvider';

export const CommandPalette = () => {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { signOut } = useAuth();
    const { notes } = useNotes();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <>
            {/* 
        This is a portal-like overlay. 
        cmdk handles focus trapping automatically. 
      */}
            <Command.Dialog
                open={open}
                onOpenChange={setOpen}
                label="Global Command Menu"
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[640px] w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden"
            >
                <div className="flex items-center border-b border-slate-700/50 px-3">
                    <Search className="w-5 h-5 text-slate-400 mr-2" />
                    <Command.Input
                        placeholder="Type a command or search..."
                        className="w-full bg-transparent p-4 text-lg text-white placeholder:text-slate-500 outline-none"
                    />
                </div>

                <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 scrollbar-thin scrollbar-thumb-slate-700">
                    <Command.Empty className="py-6 text-center text-slate-500">
                        No results found.
                    </Command.Empty>

                    <Command.Group heading="Notes" className="text-xs font-bold text-slate-500 px-2 py-1.5 mb-1 uppercase tracking-wider">
                        {notes.map((note) => (
                            <Command.Item
                                key={note.id}
                                value={`${note.title} ${note.transcript} ${note.tags?.join(' ')} ${note.smartCategory} ${note.triage?.priority} ${note.triage?.actionType}`}
                                onSelect={() => runCommand(() => router.push(`/dashboard?noteId=${note.id}`))}
                                className="flex items-center gap-2 px-2 py-2.5 rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-white cursor-pointer transition-colors aria-selected:bg-cyan-500/20 aria-selected:text-cyan-400"
                            >
                                <FileAudio className="w-4 h-4 min-w-[16px]" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate">{note.title}</span>
                                    <span className="text-xs text-slate-500 truncate">{note.smartCategory}</span>
                                </div>
                            </Command.Item>
                        ))}
                    </Command.Group>

                    <Command.Group heading="Navigation" className="text-xs font-bold text-slate-500 px-2 py-1.5 mb-1 uppercase tracking-wider">
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/dashboard'))}
                            className="flex items-center gap-2 px-2 py-2.5 rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-white cursor-pointer transition-colors aria-selected:bg-cyan-500/20 aria-selected:text-cyan-400"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Dashboard</span>
                        </Command.Item>

                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/settings'))}
                            className="flex items-center gap-2 px-2 py-2.5 rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-white cursor-pointer transition-colors aria-selected:bg-cyan-500/20 aria-selected:text-cyan-400"
                        >
                            <Settings className="w-4 h-4" />
                            <span>Settings</span>
                        </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Actions" className="text-xs font-bold text-slate-500 px-2 py-1.5 mb-1 uppercase tracking-wider">
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/dashboard?action=record'))}
                            className="flex items-center gap-2 px-2 py-2.5 rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-white cursor-pointer transition-colors aria-selected:bg-cyan-500/20 aria-selected:text-cyan-400"
                        >
                            <Mic className="w-4 h-4" />
                            <span>Start Recording</span>
                        </Command.Item>

                        <Command.Item
                            onSelect={() => runCommand(() => signOut())}
                            className="flex items-center gap-2 px-2 py-2.5 rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-white cursor-pointer transition-colors aria-selected:bg-cyan-500/20 aria-selected:text-cyan-400"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Theme" className="text-xs font-bold text-slate-500 px-2 py-1.5 mb-1 uppercase tracking-wider">
                        <Command.Item
                            onSelect={() => runCommand(() => console.log('Theme: Dark'))}
                            className="flex items-center gap-2 px-2 py-2.5 rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-white cursor-pointer transition-colors aria-selected:bg-cyan-500/20 aria-selected:text-cyan-400"
                        >
                            <Moon className="w-4 h-4" />
                            <span>Dark Mode</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => console.log('Theme: Light'))}
                            className="flex items-center gap-2 px-2 py-2.5 rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-white cursor-pointer transition-colors aria-selected:bg-cyan-500/20 aria-selected:text-cyan-400"
                        >
                            <Sun className="w-4 h-4" />
                            <span>Light Mode</span>
                        </Command.Item>
                    </Command.Group>
                </Command.List>

                <div className="border-t border-slate-700/50 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Use arrow keys to navigate</span>
                    <div className="flex gap-2">
                        <span className="bg-slate-700 px-1.5 py-0.5 rounded">Esc</span>
                        <span>to close</span>
                    </div>
                </div>
            </Command.Dialog>
        </>
    );
};

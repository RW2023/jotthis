'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, CheckCircle2, ArrowRight, Zap, Shield, Layers, Play, Brain, Tag, ListChecks } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';

// Interactive typing animation for the hero demo
function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
    const [displayed, setDisplayed] = useState('');
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const startTimer = setTimeout(() => setStarted(true), delay);
        return () => clearTimeout(startTimer);
    }, [delay]);

    useEffect(() => {
        if (!started) return;
        let i = 0;
        const interval = setInterval(() => {
            setDisplayed(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 30);
        return () => clearInterval(interval);
    }, [text, started]);

    return (
        <span>
            {displayed}
            {started && displayed.length < text.length && (
                <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-pulse" />
            )}
        </span>
    );
}

// Animated waveform bars for the hero recording demo
function HeroWaveform() {
    return (
        <div className="flex items-center gap-[2px] h-8">
            {[...Array(32)].map((_, i) => (
                <motion.div
                    key={i}
                    className="w-[3px] bg-gradient-to-t from-cyan-500 to-purple-500 rounded-full"
                    animate={{
                        height: [
                            `${12 + Math.sin(i * 0.5) * 8}px`,
                            `${20 + Math.cos(i * 0.3) * 12}px`,
                            `${8 + Math.sin(i * 0.7) * 16}px`,
                            `${12 + Math.sin(i * 0.5) * 8}px`,
                        ],
                    }}
                    transition={{
                        duration: 1.5 + Math.random() * 0.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.03,
                    }}
                />
            ))}
        </div>
    );
}

export default function LandingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [demoPhase, setDemoPhase] = useState<'recording' | 'processing' | 'result'>('recording');
    const howItWorksRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cycle through demo phases
    useEffect(() => {
        const phases: Array<{ phase: typeof demoPhase; duration: number }> = [
            { phase: 'recording', duration: 4000 },
            { phase: 'processing', duration: 2000 },
            { phase: 'result', duration: 5000 },
        ];

        let current = 0;
        let timer: NodeJS.Timeout;

        const cycle = () => {
            setDemoPhase(phases[current].phase);
            timer = setTimeout(() => {
                current = (current + 1) % phases.length;
                cycle();
            }, phases[current].duration);
        };

        cycle();
        return () => clearTimeout(timer);
    }, []);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 overflow-x-hidden relative selection:bg-cyan-500/30 selection:text-cyan-200">

            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[120px]" />
                <div className="absolute top-[20%] left-[50%] translate-x-[-50%] w-[800px] h-[400px] bg-indigo-500/5 blur-[100px] rounded-full opacity-50" />
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/80 backdrop-blur-lg border-b border-white/5 py-4' : 'py-6 bg-transparent'}`}>
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 ring-1 ring-white/10">
                            <Image src="/icon-512.png" alt="JotThis Logo" fill className="object-cover" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            JotThis
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="px-5 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white transition-colors"
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium backdrop-blur-md border border-white/10 transition-all group"
                        >
                            Get Started <ArrowRight className="w-4 h-4 inline-block ml-1 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-32 pb-20 lg:pt-48 lg:pb-32 container mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
                        <Sparkles className="w-3 h-3" />
                        AI-Powered Voice Notes
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
                        Capture Thoughts at the <br />
                        <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl">
                            Speed of Speech
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Turn messy voice notes into structured insights, action items, and clear summaries instantly.
                        Stop typing, start flowing.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 flex items-center justify-center gap-2"
                        >
                            <Mic className="w-5 h-5" />
                            Start Recording Free
                        </button>
                        <button
                            onClick={() => howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-semibold backdrop-blur-md border border-slate-700 transition-all flex items-center justify-center gap-2 group"
                            aria-label="Scroll to see how it works"
                        >
                            <Play className="w-5 h-5 fill-slate-300 group-hover:text-cyan-400 group-hover:fill-cyan-400 transition-colors" />
                            See How It Works
                        </button>
                    </div>

                    {/* Interactive Hero Demo */}
                    <div className="mt-20 relative max-w-5xl mx-auto">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 pointer-events-none" />
                        <div className="relative rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl overflow-hidden shadow-2xl shadow-cyan-900/20">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />

                            {/* Live Demo UI */}
                            <div className="p-8 md:p-12 grid md:grid-cols-2 gap-12 items-center min-h-[320px]">
                                {/* Left: Recording / Processing */}
                                <div className="space-y-6 text-left">
                                    <AnimatePresence mode="wait">
                                        {demoPhase === 'recording' && (
                                            <motion.div
                                                key="recording"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="space-y-4"
                                            >
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse" />
                                                    <span className="text-slate-300 font-mono text-sm">Recording... 00:14</span>
                                                </div>
                                                <HeroWaveform />
                                                <p className="text-slate-400 text-sm mt-4 font-mono leading-relaxed">
                                                    <TypewriterText
                                                        text="We need to reschedule the team sync to Monday and review the Q3 budget before the board meeting..."
                                                        delay={300}
                                                    />
                                                </p>
                                            </motion.div>
                                        )}

                                        {demoPhase === 'processing' && (
                                            <motion.div
                                                key="processing"
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="flex flex-col items-center justify-center py-8"
                                            >
                                                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                                                    <Brain className="w-8 h-8 text-cyan-400 animate-pulse" />
                                                </div>
                                                <p className="text-cyan-300 text-sm font-medium">AI Processing...</p>
                                                <div className="flex gap-1 mt-3">
                                                    {[0, 1, 2].map(i => (
                                                        <motion.div
                                                            key={i}
                                                            className="w-2 h-2 rounded-full bg-cyan-400"
                                                            animate={{ opacity: [0.3, 1, 0.3] }}
                                                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                                        />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        {demoPhase === 'result' && (
                                            <motion.div
                                                key="result"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="space-y-3"
                                            >
                                                <div className="flex items-center gap-2 mb-4">
                                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                    <span className="text-green-400 text-sm font-medium">Transcribed & Analyzed</span>
                                                </div>
                                                <h3 className="text-white font-semibold text-lg">Team Sync Reschedule</h3>
                                                <p className="text-slate-400 text-sm leading-relaxed">
                                                    We need to reschedule the team sync to Monday and review the Q3 budget before the board meeting.
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {['Work', 'High Priority', 'Calendar'].map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Right: Result Cards */}
                                <div className="space-y-4">
                                    <motion.div
                                        animate={{ opacity: demoPhase === 'result' ? 1 : 0.4 }}
                                        transition={{ duration: 0.5 }}
                                        className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 hover:border-cyan-500/30 transition-colors"
                                    >
                                        <h3 className="text-white font-semibold flex items-center gap-2">
                                            <ListChecks className="w-4 h-4 text-green-400" /> Action Items
                                        </h3>
                                        <ul className="mt-2 space-y-2 text-sm text-slate-400">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500/60 mt-0.5 flex-shrink-0" />
                                                Reschedule team sync to Monday
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500/60 mt-0.5 flex-shrink-0" />
                                                Review Q3 budget proposal
                                            </li>
                                        </ul>
                                    </motion.div>
                                    <motion.div
                                        animate={{ opacity: demoPhase === 'result' ? 1 : 0.3 }}
                                        transition={{ duration: 0.5, delay: 0.15 }}
                                        className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 hover:border-purple-500/30 transition-colors ml-4"
                                    >
                                        <h3 className="text-white font-semibold flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-purple-400" /> Key Insights
                                        </h3>
                                        <p className="mt-2 text-sm text-slate-400">
                                            Board meeting dependency requires budget review completion by Friday.
                                        </p>
                                    </motion.div>
                                    <motion.div
                                        animate={{ opacity: demoPhase === 'result' ? 1 : 0.2 }}
                                        transition={{ duration: 0.5, delay: 0.3 }}
                                        className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 hover:border-amber-500/30 transition-colors"
                                    >
                                        <h3 className="text-white font-semibold flex items-center gap-2">
                                            <Tag className="w-4 h-4 text-amber-400" /> Auto-Tagged
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {['#meetings', '#budget', '#Q3', '#team'].map(tag => (
                                                <span key={tag} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 text-xs border border-amber-500/20">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-cyan-500/20 blur-[60px] rounded-full z-[-1]" />
                    </div>
                </motion.div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-slate-900 relative">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Why JotThis?</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">Beyond simple transcription. A second brain for your voice.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Mic,
                                title: "Whisper-Perfect",
                                desc: "Industry-leading accuracy for every mumble, fast talker, and accent.",
                                color: "text-cyan-400",
                                bg: "bg-cyan-500/10"
                            },
                            {
                                icon: Layers,
                                title: "Auto-Triage",
                                desc: "Automatically categorizes notes, extracts tasks, and assigns priority levels.",
                                color: "text-purple-400",
                                bg: "bg-purple-500/10"
                            },
                            {
                                icon: Shield,
                                title: "Private & Secure",
                                desc: "Your thoughts are yours. Firebase encryption and privacy-first architecture.",
                                color: "text-emerald-400",
                                bg: "bg-emerald-500/10"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                whileHover={{ y: -5 }}
                                className="p-8 rounded-2xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 hover:border-white/10 transition-all group backdrop-blur-sm"
                            >
                                <div className={`w-12 h-12 rounded-lg ${feature.bg} flex items-center justify-center mb-6 ring-1 ring-inset ring-white/10 group-hover:scale-110 transition-transform`}>
                                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section ref={howItWorksRef} id="how-it-works" className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-slate-800/20" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">From Chaos to Clarity</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">Three steps. Zero effort. Your voice does the work.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            {
                                step: 1,
                                icon: Mic,
                                title: "Record",
                                desc: "Tap once and speak freely. No time limits, no fuss. The immersive visualizer lets you know it's listening.",
                                color: "from-cyan-500 to-blue-500",
                                glow: "shadow-cyan-500/20"
                            },
                            {
                                step: 2,
                                icon: Brain,
                                title: "Process",
                                desc: "AI transcribes with Whisper, cleans up filler words, generates a title, tags, category, and priority level.",
                                color: "from-purple-500 to-indigo-500",
                                glow: "shadow-purple-500/20"
                            },
                            {
                                step: 3,
                                icon: Zap,
                                title: "Act",
                                desc: "Get a structured note with action items, key insights, and smart tags. Search, filter, and triage instantly.",
                                color: "from-emerald-500 to-teal-500",
                                glow: "shadow-emerald-500/20"
                            }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="relative text-center group"
                            >
                                {/* Connector line (hidden on first and mobile) */}
                                {i < 2 && (
                                    <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-slate-700 to-transparent" />
                                )}

                                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${item.color} mx-auto mb-6 flex items-center justify-center shadow-xl ${item.glow} group-hover:scale-110 transition-transform`}>
                                    <item.icon className="w-10 h-10 text-white" />
                                </div>

                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Step {item.step}</div>
                                <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 relative text-center px-6">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 blur-[100px] rounded-full z-[-1]" />

                <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to clear your mind?</h2>
                <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">Join thousands of thinkers who maximize their productivity with voice.</p>

                <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-10 py-5 rounded-full bg-white text-slate-900 font-bold text-lg hover:bg-cyan-50 transition-colors shadow-xl shadow-cyan-500/10"
                >
                    Get Started for Free
                </button>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 bg-slate-900 text-slate-500 text-sm">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="relative w-6 h-6 rounded overflow-hidden">
                            <Image src="/icon-512.png" alt="JotThis" fill className="object-cover" />
                        </div>
                        <span className="font-semibold text-slate-300">JotThis</span>
                    </div>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">Terms</a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">Contact</a>
                    </div>
                    <p>&copy; {new Date().getFullYear()} JotThis AI. All rights reserved.</p>
                </div>
            </footer>

            {/* Auth Modal */}
            {showAuthModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setShowAuthModal(false)}
                    />
                    <div className="relative z-10 w-full max-w-md">
                        <AuthModal isOpen={true} onClose={() => setShowAuthModal(false)} />
                    </div>
                </div>
            )}

        </div>
    );
}

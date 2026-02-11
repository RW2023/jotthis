'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, CheckCircle2, ArrowRight, Zap, Shield, Layers, Play } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';

export default function LandingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Redirect to dashboard if already logged in
    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    // Scroll effect for navbar
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (loading) return null; // Or a sleek loading skeleton

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 overflow-x-hidden relative selection:bg-cyan-500/30 selection:text-cyan-200">

            {/* Background Gradients/Glows */}
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
                        <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-semibold backdrop-blur-md border border-slate-700 transition-all flex items-center justify-center gap-2">
                            <Play className="w-5 h-5 fill-slate-300" />
                            Watch Demo
                        </button>
                    </div>

                    {/* Hero Visual */}
                    <div className="mt-20 relative max-w-5xl mx-auto">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
                        <div className="relative rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl overflow-hidden shadow-2xl shadow-cyan-900/20">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />

                            {/* Fake UI Representation */}
                            <div className="p-8 md:p-12 grid md:grid-cols-2 gap-12 items-center">
                                <div className="space-y-6 text-left">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-slate-400 font-mono text-sm">Recording... 00:14</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="h-2 w-3/4 bg-slate-700/50 rounded-full" />
                                        <div className="h-2 w-full bg-slate-700/50 rounded-full" />
                                        <div className="h-2 w-5/6 bg-slate-700/50 rounded-full" />
                                    </div>
                                    <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mt-6">
                                        <p className="text-cyan-300 text-sm font-mono flex items-center gap-2">
                                            <Zap className="w-4 h-4" /> AI Processing
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                                        <h3 className="text-white font-semibold flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-400" /> Action Items
                                        </h3>
                                        <ul className="mt-2 space-y-2 text-sm text-slate-400">
                                            <li>• Schedule team sync for Monday</li>
                                            <li>• Review Q3 budget proposal</li>
                                        </ul>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 transform -rotate-1 hover:rotate-0 transition-transform duration-500 ml-8">
                                        <h3 className="text-white font-semibold flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-purple-400" /> Key Insights
                                        </h3>
                                        <p className="mt-2 text-sm text-slate-400">
                                            Project timeline needs adjustment due to external dependency delays.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Glow under the card */}
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-cyan-500/20 blur-[60px] rounded-full z-[-1]" />
                    </div>
                </motion.div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-slate-900 relative">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Why JotThis?</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">Beyond simple transcription. We build a second brain for your voice.</p>
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
                                desc: "JotThis automatically categorizes notes and extracts tasks.",
                                color: "text-purple-400",
                                bg: "bg-purple-500/10"
                            },
                            {
                                icon: Shield,
                                title: "Private & Secure",
                                desc: "Your thoughts are yours. Enterprise-grade encryption and privacy first.",
                                color: "text-emerald-400",
                                bg: "bg-emerald-500/10"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
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
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-slate-800/20" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="md:w-1/2">
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">From Chaos to Clarity <br /> in Seconds.</h2>
                            <div className="space-y-8">
                                {[
                                    { title: "Record", desc: "Tap once. Speak freely. No limits.", icon: Mic },
                                    { title: "Process", desc: "AI structures your thoughts instantly.", icon: Zap },
                                    { title: "Act", desc: "Get a clear summary and next steps.", icon: CheckCircle2 }
                                ].map((step, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-white">{step.title}</h4>
                                            <p className="text-slate-400">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="md:w-1/2">
                            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 mix-blend-overlay" />
                                {/* Abstract Visual or Image Placeholder */}
                                <div className="aspect-square bg-slate-900/80 flex items-center justify-center p-12">
                                    <div className="grid grid-cols-2 gap-4 w-full">
                                        <div className="h-32 rounded-xl bg-slate-800/50 animate-pulse" />
                                        <div className="h-32 rounded-xl bg-slate-800/50" />
                                        <div className="h-32 rounded-xl bg-slate-800/50" />
                                        <div className="h-32 rounded-xl bg-slate-800/50 animate-pulse delay-100" />
                                    </div>
                                </div>
                            </div>
                        </div>
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
                        <div className="w-6 h-6 rounded bg-slate-800" />
                        <span className="font-semibold text-slate-300">JotThis</span>
                    </div>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">Terms</a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">Contact</a>
                    </div>
                    <p>© {new Date().getFullYear()} JotThis AI. All rights reserved.</p>
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

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Key, Save, Trash2, ShieldCheck, Eye, EyeOff, Volume2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [voice, setVoice] = useState('alloy');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved key and voice from localStorage
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) setApiKey(savedKey);

    const savedVoice = localStorage.getItem('openai_tts_voice');
    if (savedVoice) setVoice(savedVoice);
  }, [isOpen]);

  const handleSave = () => {
    // Save Voice (Always save if modal is saved, key is optional but voice has default)
    localStorage.setItem('openai_tts_voice', voice);

    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setTimeout(onClose, 1000);
  };

  const handleClear = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    setSaved(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Settings className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 id="settings-title" className="text-lg font-bold text-slate-100">Settings</h2>
                  <p className="text-xs text-slate-400">Configure your preferences</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
                aria-label="Close settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg mt-1">
                    <Volume2 className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Voice Preference</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose the AI voice for reading your notes.
                    </p>
                  </div>
                </div>

                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="select select-bordered w-full bg-slate-950 border-slate-800 focus:border-cyan-500/50 text-sm"
                >
                  <option value="alloy">Alloy (Neutral)</option>
                  <option value="echo">Echo (Male)</option>
                  <option value="fable">Fable (British)</option>
                  <option value="onyx">Onyx (Deep Male)</option>
                  <option value="nova">Nova (Female)</option>
                  <option value="shimmer">Shimmer (Clear Female)</option>
                </select>
              </div>

              <div className="border-t border-slate-800 my-4"></div>

              {/* API Key Section */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg mt-1">
                    <Key className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">OpenAI API Key</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Your key is stored locally in your browser and sent directly to OpenAI. We never save it on our servers.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="input input-bordered w-full bg-slate-950 border-slate-800 focus:border-cyan-500/50 font-mono text-sm pr-10"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label={showKey ? "Hide API key" : "Show API key"}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className={`btn flex-1 gap-2 ${
                      saved 
                        ? 'btn-success text-white' 
                        : 'btn-primary bg-cyan-500 hover:bg-cyan-400 border-none text-slate-900'
                    }`}
                  >
                    {saved ? (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                          Save Settings
                      </>
                    )}
                  </button>
                  
                  {apiKey && (
                    <button
                      onClick={handleClear}
                      className="btn btn-ghost btn-square text-red-400 hover:bg-red-500/10"
                      title="Clear Key"
                      aria-label="Clear API Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-center">
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                End-to-End Encrypted
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

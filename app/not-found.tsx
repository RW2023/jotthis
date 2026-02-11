import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-200">
      <h2 className="text-4xl font-bold mb-4 text-cyan-400">404 - Page Not Found</h2>
      <p className="text-lg text-slate-400 mb-8">Could not find requested resource</p>
      <Link 
        href="/"
        className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl transition-all shadow-lg shadow-cyan-500/20"
      >
        <Home className="w-5 h-5" />
        Return Home
      </Link>
    </div>
  );
}

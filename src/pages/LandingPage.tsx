import React, { useEffect, useState } from 'react';
import { PlusCircle, Sparkles, Radio, Zap, Shield, QrCode, ArrowRight, RefreshCw, BarChart2, KeyRound } from 'lucide-react';
import { Poll } from '../types';
import { api } from '../services/api';
import { PollCard } from '../components/PollCard';
import { ShareModal } from '../components/ShareModal';
import { useToast } from '../context/ToastContext';

interface LandingPageProps {
  onNavigate: (view: string, pollId?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSharePoll, setSelectedSharePoll] = useState<Poll | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [joiningKey, setJoiningKey] = useState(false);
  const { showToast } = useToast();

  const loadPublicPolls = async () => {
    setLoading(true);
    try {
      const data = await api.getPolls();
      setPolls(data);
    } catch (err: any) {
      console.error('Failed to load polls', err);
      showToast('Could not fetch polls', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputKey.trim().toUpperCase();
    if (!clean) return;
    setJoiningKey(true);
    try {
      const poll = await api.getPoll(clean);
      if (poll && poll.id) {
        onNavigate('poll', poll.id);
      } else {
        showToast('No poll found with that Key', 'error');
      }
    } catch {
      showToast('Poll key not found. Check the code and try again.', 'error');
    } finally {
      setJoiningKey(false);
    }
  };

  useEffect(() => {
    loadPublicPolls();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Decorative background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-violet-600/10 rounded-full blur-2xl pointer-events-none -z-10" />

        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Redis Pub/Sub &amp; Native WebSockets</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Ask. Vote. See the <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-200 bg-clip-text text-transparent">
              pulse live.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            Create a poll, share one link or QR code, and watch responses arrive in real time across hundreds of audience screens. No browser refresh required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button
              id="hero-cta-create-poll"
              onClick={() => onNavigate('create')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create a Poll</span>
            </button>

            {polls.length > 0 && (
              <button
                id="hero-cta-view-demo"
                onClick={() => onNavigate('poll', polls[0].id)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-800 hover:border-slate-700 transition-all"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>View Live Demo Poll</span>
              </button>
            )}
          </div>

          {/* Quick Join With Poll Key */}
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm">
            <form onSubmit={handleJoinByKey} className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full">
                <KeyRound className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="landing-quick-key-input"
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                  placeholder="Enter Poll Key (e.g. STACK-26)"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                id="btn-landing-join-key"
                type="submit"
                disabled={joiningKey || !inputKey.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shrink-0 transition-colors shadow-sm"
              >
                {joiningKey ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Join Poll</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
            {polls.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-2.5 text-[11px] text-slate-400">
                <span>Active keys:</span>
                {polls.slice(0, 3).map((p) => p.code ? (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setInputKey(p.code!);
                      onNavigate('poll', p.id);
                    }}
                    className="font-mono font-bold text-amber-300/90 hover:text-amber-200 underline decoration-dotted"
                  >
                    {p.code}
                  </button>
                ) : null)}
              </div>
            )}
          </div>
        </div>

        {/* Feature badges row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 pt-8 border-t border-slate-900">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <Radio className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Sub-10ms Updates</h4>
            <p className="text-xs text-slate-400 mt-1">Direct WebSocket broadcast via Redis Pub/Sub.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <Zap className="w-5 h-5 text-indigo-400 mb-2" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Atomic Counters</h4>
            <p className="text-xs text-slate-400 mt-1">Zero race conditions using Redis HINCRBY.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <Shield className="w-5 h-5 text-violet-400 mb-2" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Mongo Durability</h4>
            <p className="text-xs text-slate-400 mt-1">Full audit trails, indexes, and user ownership.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <QrCode className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Instant QR Share</h4>
            <p className="text-xs text-slate-400 mt-1">Audience scans and votes without signing up.</p>
          </div>
        </div>
      </section>

      {/* Live Polls Directory */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
              <span>Active Public Polls</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Pick a poll to test live voting across multiple browser tabs simultaneously.
            </p>
          </div>
          <button
            onClick={loadPublicPolls}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
            title="Refresh poll list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/30 border border-slate-800">
            <BarChart2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No active polls found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
              Be the first to create a live poll and invite people to vote!
            </p>
            <button
              onClick={() => onNavigate('create')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Poll</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                onView={(id) => onNavigate('poll', id)}
                onShare={(p) => setSelectedSharePoll(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-4 text-center text-xs text-slate-500">
        <p>PulsePoll • Production Full-Stack Live Polling Engine • Go Gin / Redis / MongoDB / React</p>
      </footer>

      {/* Share Modal */}
      {selectedSharePoll && (
        <ShareModal
          isOpen={!!selectedSharePoll}
          onClose={() => setSelectedSharePoll(null)}
          pollId={selectedSharePoll.id}
          question={selectedSharePoll.question}
          code={selectedSharePoll.code}
        />
      )}
    </div>
  );
};

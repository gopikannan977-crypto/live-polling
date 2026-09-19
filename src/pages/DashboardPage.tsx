import React, { useState, useEffect } from 'react';
import { PlusCircle, BarChart3, Activity, CheckCircle2, Lock, RefreshCw, Layers } from 'lucide-react';
import { Poll } from '../types';
import { api } from '../services/api';
import { PollCard } from '../components/PollCard';
import { ShareModal } from '../components/ShareModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface DashboardPageProps {
  onNavigate: (view: string, pollId?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSharePoll, setSelectedSharePoll] = useState<Poll | null>(null);

  const fetchMyPolls = async () => {
    setLoading(true);
    try {
      const data = await api.getMyPolls();
      setPolls(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch your polls', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyPolls();
    }
  }, [isAuthenticated]);

  const handleClosePoll = async (id: string) => {
    try {
      const updated = await api.closePoll(id);
      setPolls((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'closed', closedAt: updated.closedAt } : p)));
      showToast('Poll closed successfully. Voting is now locked.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to close poll', 'error');
    }
  };

  const handleDeletePoll = async (id: string) => {
    try {
      await api.deletePoll(id);
      setPolls((prev) => prev.filter((p) => p.id !== id));
      showToast('Poll deleted successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete poll', 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="text-center max-w-sm p-6 rounded-2xl border border-slate-800 bg-slate-900">
          <p className="text-sm text-slate-300 mb-4">Please log in to access your dashboard.</p>
          <button
            onClick={() => onNavigate('login')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalPolls = polls.length;
  const activePolls = polls.filter((p) => p.status === 'active').length;
  const totalVotesReceived = polls.reduce((acc, p) => acc + (p.totalVotes || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Creator Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Logged in as <span className="text-indigo-400 font-mono">{user?.email}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMyPolls}
            className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
            title="Refresh poll list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            id="dashboard-btn-create-poll"
            onClick={() => onNavigate('create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/25 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Poll</span>
          </button>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10">
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Polls</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-white mt-0.5">{totalPolls}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Polls</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-white mt-0.5">{activePolls}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Votes Cast</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-white mt-0.5">{totalVotesReceived}</p>
          </div>
        </div>
      </div>

      {/* Polls section */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>Your Managed Polls</span>
          <span className="text-xs font-mono font-normal text-slate-400 px-2 py-0.5 rounded-full bg-slate-800">
            {polls.length}
          </span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/30 border border-slate-800">
            <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">You haven't created any polls yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-5">
              Launch your first live interactive poll and start capturing audience feedback in real time.
            </p>
            <button
              onClick={() => onNavigate('create')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Poll</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                isOwner={true}
                onView={(id) => onNavigate('poll', id)}
                onShare={(p) => setSelectedSharePoll(p)}
                onClose={handleClosePoll}
                onDelete={handleDeletePoll}
              />
            ))}
          </div>
        )}
      </div>

      {selectedSharePoll && (
        <ShareModal
          isOpen={!!selectedSharePoll}
          onClose={() => setSelectedSharePoll(null)}
          pollId={selectedSharePoll.id}
          question={selectedSharePoll.question}
        />
      )}
    </div>
  );
};

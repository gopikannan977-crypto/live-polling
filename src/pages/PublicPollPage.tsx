import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio,
  Share2,
  Lock,
  ArrowLeft,
  Check,
  AlertCircle,
  Users,
  RefreshCw,
  BarChart2,
  ShieldCheck,
  Zap,
  Sparkles,
  KeyRound,
  Copy,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { Poll, RealtimeEvent, AIPollInsights } from '../types';
import { api, hasVotedOnPoll } from '../services/api';
import { usePollSocket } from '../hooks/usePollSocket';
import { LiveResultsBar } from '../components/LiveResultsBar';
import { ShareModal } from '../components/ShareModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface PublicPollPageProps {
  pollId: string;
  onNavigate: (view: string, pollId?: string) => void;
}

export const PublicPollPage: React.FC<PublicPollPageProps> = ({ pollId, onNavigate }) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [submittingVote, setSubmittingVote] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [livePulseFlash, setLivePulseFlash] = useState(false);

  // AI Insights State
  const [insights, setInsights] = useState<AIPollInsights | null>(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);

  // Check if voter already voted on this device/browser
  useEffect(() => {
    const existing = hasVotedOnPoll(pollId);
    if (existing) {
      setVotedOptionId(existing);
      setSelectedOptionId(existing);
    }
  }, [pollId]);

  // Load initial poll document from REST API
  const loadPoll = async () => {
    setLoading(true);
    try {
      const data = await api.getPoll(pollId);
      setPoll(data);
    } catch (err: any) {
      console.error('Failed to load poll', err);
      showToast(err.message || 'Poll not found', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPoll();
  }, [pollId]);

  // Realtime WebSocket subscriber hook
  const { status: socketStatus } = usePollSocket(poll?.id || pollId, {
    enabled: !!pollId,
    onEvent: (event: RealtimeEvent) => {
      // Trigger subtle live flash animation
      setLivePulseFlash(true);
      setTimeout(() => setLivePulseFlash(false), 900);

      if (event.type === 'vote_cast' || event.type === 'initial_state') {
        setPoll((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            counts: event.counts,
            totalVotes: event.totalVotes,
            ...(event.status ? { status: event.status } : {}),
          };
        });
      } else if (event.type === 'poll_closed') {
        setPoll((prev) => (prev ? { ...prev, status: 'closed', closedAt: event.closedAt || null } : prev));
        showToast('This poll was just closed by the organizer.', 'info');
      }
    },
  });

  const isOwner = useMemo(() => {
    return isAuthenticated && user && poll && poll.ownerId === user.id;
  }, [isAuthenticated, user, poll]);

  const isClosed = poll?.status === 'closed';

  // Identify highest voted option for trophy highlight
  const leadingOptionId = useMemo(() => {
    if (!poll || !poll.counts || poll.totalVotes === 0) return null;
    let max = -1;
    let leader: string | null = null;
    Object.entries(poll.counts).forEach(([optId, count]) => {
      if (count > max) {
        max = count;
        leader = optId;
      }
    });
    return max > 0 ? leader : null;
  }, [poll]);

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId) {
      showToast('Please choose an option to cast your vote.', 'error');
      return;
    }
    if (isClosed) {
      showToast('Voting is closed for this poll.', 'error');
      return;
    }
    if (votedOptionId) {
      showToast('You have already submitted a vote on this poll.', 'info');
      return;
    }

    setSubmittingVote(true);
    try {
      const activeId = poll ? poll.id : pollId;
      const res = await api.vote(activeId, selectedOptionId);
      setVotedOptionId(selectedOptionId);
      // Immediately reflect local count if WebSocket message is en route
      setPoll((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          counts: res.counts,
          totalVotes: res.totalVotes,
        };
      });
      showToast('Vote successfully recorded in real time!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit vote', 'error');
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleClosePoll = async () => {
    if (!confirm('Are you sure you want to close this poll? Further voting will be permanently disabled.')) {
      return;
    }
    try {
      const activeId = poll ? poll.id : pollId;
      const updated = await api.closePoll(activeId);
      setPoll(updated);
      showToast('Poll closed successfully.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to close poll', 'error');
    }
  };

  const handleRunAIAnalysis = async () => {
    if (!poll) return;
    setAnalyzingAI(true);
    try {
      const data = await api.analyzeResults(poll.id);
      setInsights(data);
      showToast('AI analysis generated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to run AI analysis', 'error');
    } finally {
      setAnalyzingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">Connecting to live poll...</p>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="text-center max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-1">Poll Not Found</h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-6">
            The requested poll or join key does not exist or may have been deleted.
          </p>
          <button
            onClick={() => onNavigate('landing')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top action bar: Back button + Join Key + Live socket indicator + Share button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'landing')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isAuthenticated ? 'Dashboard' : 'Explore'}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Poll Join Key with 1-click copy */}
          {poll.code && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(poll.code!);
                showToast(`Poll Key ${poll.code} copied!`, 'success');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
              title="Click to copy Poll Join Key"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>KEY: {poll.code}</span>
              <Copy className="w-3 h-3 text-amber-400/70 ml-0.5" />
            </button>
          )}

          {/* WebSocket Status Pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm transition-all ${
              socketStatus === 'connected'
                ? livePulseFlash
                  ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-md shadow-emerald-500/20 scale-105'
                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                : socketStatus === 'connecting'
                ? 'bg-amber-950/60 text-amber-400 border-amber-800/80 animate-pulse'
                : 'bg-rose-950/60 text-rose-400 border-rose-800/80'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                socketStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : socketStatus === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="font-mono text-[11px]">
              {socketStatus === 'connected'
                ? '● LIVE'
                : socketStatus === 'connecting'
                ? 'Connecting...'
                : 'Offline'}
            </span>
          </div>

          <button
            id="btn-open-share-modal"
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/90 hover:bg-indigo-600 text-white shadow-sm transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share &amp; QR</span>
          </button>
        </div>
      </div>

      {/* Main Poll Card */}
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-md p-6 sm:p-10 shadow-2xl space-y-8">
        {/* Header with question & badge */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  !isClosed
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {!isClosed ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Active Live Poll</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>Voting Closed</span>
                  </>
                )}
              </span>

              {isOwner && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  You are the creator
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-slate-200">{poll.totalVotes}</span>
              <span>total {poll.totalVotes === 1 ? 'response' : 'responses'}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
            {poll.question}
          </h1>
        </div>

        {/* Voting Interface (If active and not yet voted) */}
        {!isClosed && !votedOptionId ? (
          <form onSubmit={handleVoteSubmit} className="space-y-4 pt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Select one option to cast your live vote:
            </p>

            <div className="grid grid-cols-1 gap-3">
              {poll.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                return (
                  <label
                    key={option.id}
                    id={`vote-option-label-${option.id}`}
                    onClick={() => setSelectedOptionId(option.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10 scale-[1.01]'
                        : 'bg-slate-950/70 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600 bg-slate-900'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm sm:text-base font-semibold">{option.text}</span>
                    </div>

                    <span className="text-xs font-mono text-slate-500">
                      {isSelected ? 'Selected' : 'Click to select'}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="pt-3">
              <button
                id="btn-submit-vote"
                type="submit"
                disabled={submittingVote || !selectedOptionId}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all"
              >
                {submittingVote ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Submit Vote</span>
                    <Zap className="w-4 h-4 text-amber-300" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : null}

        {/* Live Results Display */}
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                {isClosed ? 'Final Results' : 'Real-time Live Results'}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {votedOptionId && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800/40">
                  <Check className="w-3.5 h-3.5" /> Vote cast
                </span>
              )}

              {/* AI Key Insights Button */}
              <button
                id="btn-ai-analyze-results"
                onClick={handleRunAIAnalysis}
                disabled={analyzingAI}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md transition-all"
              >
                {analyzingAI ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>{analyzingAI ? 'Analyzing...' : 'AI Insights'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {poll.options.map((option) => (
              <LiveResultsBar
                key={option.id}
                option={option}
                count={poll.counts?.[option.id] || 0}
                totalVotes={poll.totalVotes || 0}
                isLeading={leadingOptionId === option.id}
                isUserSelection={votedOptionId === option.id}
              />
            ))}
          </div>
        </div>

        {/* AI Executive Insights Card */}
        {insights && (
          <div className="p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 via-slate-900 to-purple-950/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-900/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Gemini Executive Insights</h4>
                  <p className="text-[11px] text-slate-400">Algorithmic analysis of audience voting patterns</p>
                </div>
              </div>
              <button
                onClick={handleRunAIAnalysis}
                disabled={analyzingAI}
                className="text-[11px] font-semibold text-indigo-300 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${analyzingAI ? 'animate-spin' : ''}`} />
                <span>Re-analyze</span>
              </button>
            </div>

            {/* Summary */}
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {insights.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-900/30">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Dominant Preference
                </span>
                <p className="text-xs text-slate-300">{insights.dominantChoice}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-900/30">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" /> Margin &amp; Spread
                </span>
                <p className="text-xs text-slate-300">{insights.marginAnalysis}</p>
              </div>
            </div>

            {/* Discussion Prompts */}
            {insights.discussionPrompts && insights.discussionPrompts.length > 0 && (
              <div className="pt-2 border-t border-indigo-950">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Audience Discussion Prompts</span>
                </span>
                <ul className="space-y-1.5">
                  {insights.discussionPrompts.map((prompt, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-indigo-900/50 text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{prompt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Owner Control Actions (Close Poll) */}
        {isOwner && !isClosed && (
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Creator Controls</p>
              <p className="text-xs text-slate-400">
                Close this poll to permanently disable further incoming votes and freeze final results.
              </p>
            </div>
            <button
              id="btn-owner-close-poll"
              onClick={handleClosePoll}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Close Poll to Voting</span>
            </button>
          </div>
        )}

        {isClosed && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center">
            <p className="text-xs sm:text-sm text-slate-400">
              Voting has ended for this poll. Results are permanently preserved.
            </p>
          </div>
        )}
      </div>

      {/* Share Modal with QR code */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        pollId={poll.id}
        question={poll.question}
        code={poll.code}
      />
    </div>
  );
};

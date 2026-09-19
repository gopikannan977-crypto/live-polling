import React, { useState } from 'react';
import { Share2, Lock, ArrowRight, Clock, Users, Trash2, KeyRound } from 'lucide-react';
import { Poll } from '../types';

interface PollCardProps {
  poll: Poll;
  onView: (id: string) => void;
  onShare: (poll: Poll) => void;
  onClose?: (id: string) => void;
  onDelete?: (id: string) => void;
  isOwner?: boolean;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  onView,
  onShare,
  onClose,
  onDelete,
  isOwner,
}) => {
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isActive = poll.status === 'active';
  const createdFormatted = new Date(poll.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onClose) return;
    if (confirm('Are you sure you want to close this poll? Audience will no longer be able to cast votes.')) {
      setClosing(true);
      try {
        await onClose(poll.id);
      } finally {
        setClosing(false);
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    if (confirm('Delete this poll and all associated votes permanently?')) {
      setDeleting(true);
      try {
        await onDelete(poll.id);
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div
      onClick={() => onView(poll.id)}
      className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-800/90 bg-slate-900/60 hover:bg-slate-900/90 hover:border-slate-700/80 transition-all duration-200 shadow-sm cursor-pointer"
    >
      <div>
        {/* Status and date header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/60'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              {isActive ? 'Active' : 'Closed'}
            </span>

            {poll.code && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                <KeyRound className="w-3 h-3 text-amber-400" />
                <span>{poll.code}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{createdFormatted}</span>
          </div>
        </div>

        {/* Question */}
        <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 mb-3">
          {poll.question}
        </h4>

        {/* Option Preview badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {poll.options.slice(0, 3).map((opt) => (
            <span
              key={opt.id}
              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/40 truncate max-w-[150px]"
            >
              {opt.text}
            </span>
          ))}
          {poll.options.length > 3 && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/40 text-slate-400">
              +{poll.options.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Footer info & action buttons */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>{poll.totalVotes || 0} votes</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(poll);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Share Poll & QR Code"
            aria-label="Share poll"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {isOwner && isActive && onClose && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-950/30 transition-colors"
              title="Close Poll"
              aria-label="Close poll"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {isOwner && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              title="Delete Poll"
              aria-label="Delete poll"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 pl-1">
            <span>Vote / View</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

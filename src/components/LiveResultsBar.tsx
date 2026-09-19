import React from 'react';
import { motion } from 'motion/react';
import { Check, Trophy } from 'lucide-react';
import { PollOption } from '../types';

interface LiveResultsBarProps {
  option: PollOption;
  count: number;
  totalVotes: number;
  isLeading: boolean;
  isUserSelection?: boolean;
}

export const LiveResultsBar: React.FC<LiveResultsBarProps> = ({
  option,
  count,
  totalVotes,
  isLeading,
  isUserSelection,
}) => {
  const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all duration-300 hover:border-slate-700">
      {/* Animated background bar */}
      <motion.div
        className={`absolute inset-y-0 left-0 transition-colors ${
          isLeading && totalVotes > 0
            ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/40 border-r-2 border-indigo-400'
            : 'bg-slate-800/40'
        }`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ type: 'spring', damping: 20, stiffness: 90 }}
      />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {isLeading && totalVotes > 0 && (
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="font-semibold text-slate-100 truncate text-sm sm:text-base">
            {option.text}
          </span>
          {isUserSelection && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
              <Check className="w-3 h-3" /> Your vote
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 text-right">
          <span className="text-xs text-slate-400 font-mono">
            {count} {count === 1 ? 'vote' : 'votes'}
          </span>
          <span
            className={`font-mono text-base sm:text-lg font-bold min-w-[3.2rem] ${
              isLeading && totalVotes > 0 ? 'text-indigo-300' : 'text-slate-300'
            }`}
          >
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};

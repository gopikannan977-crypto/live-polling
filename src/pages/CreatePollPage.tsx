import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, HelpCircle, ArrowRight, Sparkles, KeyRound, RefreshCw, Wand2, Check } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface CreatePollPageProps {
  onNavigate: (view: string, pollId?: string) => void;
  onPollCreated?: (pollId: string) => void;
}

export const CreatePollPage: React.FC<CreatePollPageProps> = ({ onNavigate, onPollCreated }) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [joinKey, setJoinKey] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize a fresh Join Key upon mount
  useEffect(() => {
    let mounted = true;
    api
      .generatePollKey(false)
      .then((res) => {
        if (mounted && res.key) {
          setJoinKey(res.key);
        }
      })
      .catch(() => {
        if (mounted) {
          setJoinKey('PULSE-' + Math.floor(100 + Math.random() * 900));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <HelpCircle className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Authentication Required</h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-6">
            You must be logged in to create and manage your live polls.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('login')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('signup')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleGenerateAlternateKey = async () => {
    setGeneratingKey(true);
    try {
      const res = await api.generatePollKey(true);
      setJoinKey(res.key);
      showToast(`Generated alternate key: ${res.key}`, 'info');
    } catch {
      const fallbackKey = 'SYNC-' + Math.floor(100 + Math.random() * 900);
      setJoinKey(fallbackKey);
      showToast(`Generated alternate key: ${fallbackKey}`, 'info');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleAIGenerate = async (customTopic?: string) => {
    const topicToUse = customTopic || aiTopic;
    setGeneratingAI(true);
    setError(null);
    try {
      const result = await api.generateAIPoll(topicToUse || undefined);
      if (result.question && Array.isArray(result.options) && result.options.length >= 2) {
        setQuestion(result.question);
        setOptions(result.options);
        showToast(
          result.generatedWithFallback
            ? 'Poll generated using smart templates!'
            : 'Poll generated with Gemini AI!',
          'success'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate poll with AI', 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleAddOption = () => {
    if (options.length >= 10) {
      showToast('Maximum 10 options allowed', 'error');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      showToast('A poll must have at least 2 options', 'error');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 5) {
      setError('Question must be at least 5 characters long.');
      return;
    }
    if (trimmedQuestion.length > 200) {
      setError('Question cannot exceed 200 characters.');
      return;
    }

    const cleanedOptions = options.map((opt) => opt.trim()).filter((opt) => opt.length > 0);

    if (cleanedOptions.length < 2) {
      setError('Please provide at least 2 non-empty options.');
      return;
    }

    const uniqueOptions = new Set(cleanedOptions.map((o) => o.toLowerCase()));
    if (uniqueOptions.size !== cleanedOptions.length) {
      setError('Duplicate options are not allowed. Each choice must be unique.');
      return;
    }

    setLoading(true);
    try {
      const cleanKey = joinKey.trim() || undefined;
      const poll = await api.createPoll(trimmedQuestion, cleanedOptions, cleanKey);
      showToast(`Poll created with Key ${poll.code || poll.id}! Ready for live votes.`, 'success');
      if (onPollCreated) {
        onPollCreated(poll.id);
      }
      onNavigate('poll', poll.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  const promptSuggestions = [
    '⚡ Cloud Architecture',
    '🚀 Product Priorities',
    '👥 Team Retrospective',
    '☕ Team Icebreaker',
    '🛠️ Frontend Tooling',
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Create a New Live Poll</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Define your question and options, or let Gemini AI generate one instantly. Share via URL, QR code, or Poll Join Key.
        </p>
      </div>

      {/* AI Smart Poll Generator Banner */}
      <div className="mb-6 p-5 rounded-2xl border border-indigo-900/60 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-purple-950/30 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Gemini AI Poll Generator</h2>
              <p className="text-[11px] text-slate-400">Enter a topic or click a preset to instantly draft a poll</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            AI Powered
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            placeholder="e.g. Microservices vs Monolith, Weekly Sprint Focus, Meeting Icebreaker..."
            className="flex-1 px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => handleAIGenerate()}
            disabled={generatingAI}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white shadow-md transition-all shrink-0"
          >
            {generatingAI ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            <span>{generatingAI ? 'Generating...' : 'Generate with AI'}</span>
          </button>
        </div>

        {/* Quick topic suggestion chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-slate-500 mr-1">Quick ideas:</span>
          {promptSuggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setAiTopic(item);
                handleAIGenerate(item);
              }}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-200 border border-slate-700/60 hover:border-indigo-600/50 transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-xs sm:text-sm text-rose-300 font-medium animate-in fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-6">
        {/* Poll Join Key field with Alternate Key Generator */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 uppercase tracking-wider">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Poll Join Key (Short Code)</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Audience can join your live poll by simply entering this code on the home screen.
              </p>
            </div>
            <button
              type="button"
              id="btn-alternate-generate-key"
              onClick={handleGenerateAlternateKey}
              disabled={generatingKey}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition-colors self-start sm:self-auto"
              title="Generate alternate code for this poll"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generatingKey ? 'animate-spin' : ''}`} />
              <span>Use Alternate Key</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="create-poll-join-key-input"
              type="text"
              value={joinKey}
              onChange={(e) => setJoinKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
              placeholder="e.g. PULSE-824"
              maxLength={15}
              className="w-full max-w-xs px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono font-bold text-amber-300 tracking-wider placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <span className="text-[11px] text-slate-500">
              Letters, numbers, and hyphens
            </span>
          </div>
        </div>

        {/* Question field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Poll Question
            </label>
            <span className="text-[11px] font-mono text-slate-500">
              {question.length}/200
            </span>
          </div>
          <input
            id="create-poll-question-input"
            type="text"
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Which backend database do you prefer for scalable analytics?"
            maxLength={200}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Options list */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Voting Options ({options.length}/10)
          </label>

          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <span className="w-6 text-center text-xs font-mono font-bold text-slate-500">
                {idx + 1}.
              </span>
              <input
                id={`create-poll-option-input-${idx}`}
                type="text"
                required
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                maxLength={100}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
                  title="Remove option"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {options.length < 10 && (
            <div className="pt-2">
              <button
                type="button"
                id="btn-add-poll-option"
                onClick={handleAddOption}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-950/70 border border-indigo-900/50 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Another Option</span>
              </button>
            </div>
          )}
        </div>

        {/* Submit action */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-create-poll-submit"
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Publish Live Poll</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

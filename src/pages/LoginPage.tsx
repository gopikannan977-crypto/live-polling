import React, { useState } from 'react';
import { LogIn, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (view: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('demo@pulsepoll.io');
    setPassword('demo1234');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Welcome back</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sign in to create, manage, and close your live audience polls.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 font-medium animate-in fade-in duration-150">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login-input-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-input-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:text-slate-400 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign in to PulsePoll</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* 1-click Demo credentials shortcut */}
          <div className="pt-3 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={fillDemoAccount}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors py-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fill Pre-configured Demo Account</span>
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-slate-400">
          Don't have an account yet?{' '}
          <button
            onClick={() => onNavigate('signup')}
            className="font-semibold text-indigo-400 hover:text-indigo-300 underline"
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  );
};

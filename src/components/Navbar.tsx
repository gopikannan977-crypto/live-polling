import React, { useState } from 'react';
import {
  BarChart3,
  PlusCircle,
  LayoutDashboard,
  LogIn,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Layers,
  Activity,
  KeyRound,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, pollId?: string) => void;
  onOpenArchitectureDocs: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenArchitectureDocs }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinKeyInput, setJoinKeyInput] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoinByKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinKeyInput.trim().toUpperCase();
    if (!clean) return;
    setJoining(true);
    try {
      const p = await api.getPoll(clean);
      if (p && p.id) {
        setJoinModalOpen(false);
        setJoinKeyInput('');
        onNavigate('poll', p.id);
      } else {
        showToast('Poll not found for that key', 'error');
      }
    } catch {
      showToast('Poll key not found. Check the code and try again.', 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div
              id="navbar-brand-logo"
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-3 cursor-pointer group select-none"
            >
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                <BarChart3 className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                    PulsePoll
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-normal leading-none hidden sm:block">
                  Redis Pub/Sub &amp; WebSockets
                </p>
              </div>
            </div>

            {/* Desktop Nav Items */}
            <div className="hidden md:flex items-center gap-1">
              <button
                id="nav-btn-explore"
                onClick={() => onNavigate('landing')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentView === 'landing'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                Explore &amp; Demo
              </button>

              {/* Enter Poll Key Quick Action */}
              <button
                id="nav-btn-enter-key"
                onClick={() => setJoinModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all"
                title="Join a poll using a custom Key / PIN"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Join with Key</span>
              </button>

              {isAuthenticated && (
                <button
                  id="nav-btn-dashboard"
                  onClick={() => onNavigate('dashboard')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'dashboard'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  <span>Dashboard</span>
                </button>
              )}

              <button
                id="nav-btn-create-poll"
                onClick={() => onNavigate('create')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  currentView === 'create'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-indigo-400 hover:text-white hover:bg-indigo-950/60 border border-indigo-500/30'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Poll</span>
              </button>

              {/* Architecture Explainer Modal Trigger */}
              <button
                id="nav-btn-architecture-docs"
                onClick={onOpenArchitectureDocs}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-indigo-300 hover:bg-slate-900 transition-colors border border-slate-800"
                title="View Realtime Architecture & Interview Specs"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Architecture Specs</span>
              </button>
            </div>

            {/* User Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-indigo-300">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-200 leading-tight">
                        {user.name || user.email.split('@')[0]}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-none truncate max-w-[120px]">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    id="nav-btn-logout"
                    onClick={logout}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    id="nav-btn-login"
                    onClick={() => onNavigate('login')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <LogIn className="w-4 h-4 text-slate-400" />
                    <span>Log in</span>
                  </button>
                  <button
                    id="nav-btn-signup"
                    onClick={() => onNavigate('signup')}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
                  >
                    Sign up
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setJoinModalOpen(true)}
                className="p-2 text-amber-300 hover:text-amber-200 rounded-lg bg-amber-500/10 border border-amber-500/30"
                title="Join with Key"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                id="nav-mobile-architecture-docs"
                onClick={onOpenArchitectureDocs}
                className="p-2 text-slate-300 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
                aria-label="Architecture Specs"
              >
                <Layers className="w-4 h-4 text-indigo-400" />
              </button>
              <button
                id="nav-mobile-menu-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950/95 px-4 pt-3 pb-6 space-y-2">
            <button
              onClick={() => {
                onNavigate('landing');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900"
            >
              Explore &amp; Demo
            </button>
            <button
              onClick={() => {
                setJoinModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Join Poll with Key</span>
            </button>
            {isAuthenticated && (
              <button
                onClick={() => {
                  onNavigate('dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>Dashboard</span>
              </button>
            )}
            <button
              onClick={() => {
                onNavigate('create');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600/90 text-white"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Poll</span>
            </button>
            <button
              onClick={() => {
                onOpenArchitectureDocs();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-300 bg-indigo-950/40 border border-indigo-900/50"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Architecture &amp; Interview Specs</span>
            </button>

            <div className="pt-3 border-t border-slate-800/80">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between px-2 pt-1">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{user.name || user.email}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      onNavigate('login');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 text-center text-sm font-medium text-slate-200 bg-slate-900 rounded-lg border border-slate-800"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('signup');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 text-center text-sm font-semibold text-white bg-indigo-600 rounded-lg"
                  >
                    Sign up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Join Poll Key Modal */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Join with Poll Key</h3>
                  <p className="text-xs text-slate-400">Enter a 6-character key or custom code</p>
                </div>
              </div>
              <button
                onClick={() => setJoinModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinByKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Poll Key / Code / ID
                </label>
                <input
                  type="text"
                  autoFocus
                  value={joinKeyInput}
                  onChange={(e) => setJoinKeyInput(e.target.value.toUpperCase())}
                  placeholder="e.g. STACK-26, PULSE-XYZ"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl font-mono font-bold text-amber-300 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining || !joinKeyInput.trim()}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-colors"
                >
                  {joining ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Go to Poll</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

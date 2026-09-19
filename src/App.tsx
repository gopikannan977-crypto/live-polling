import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ArchitectureDocsModal } from './components/ArchitectureDocsModal';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreatePollPage } from './pages/CreatePollPage';
import { PublicPollPage } from './pages/PublicPollPage';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [activePollId, setActivePollId] = useState<string | null>(null);
  const [showArchDocs, setShowArchDocs] = useState<boolean>(false);

  // Parse URL query parameter or path on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pollFromQuery = params.get('poll');
    if (pollFromQuery) {
      setActivePollId(pollFromQuery);
      setCurrentView('poll');
      return;
    }

    // Check pathname like /poll/:id
    const path = window.location.pathname;
    const match = path.match(/\/poll\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      setActivePollId(match[1]);
      setCurrentView('poll');
    }
  }, []);

  const handleNavigate = (view: string, pollId?: string) => {
    if (pollId) {
      setActivePollId(pollId);
      // Update URL query state cleanly without full page refresh
      const url = new URL(window.location.href);
      url.searchParams.set('poll', pollId);
      window.history.pushState({}, '', url.toString());
    } else {
      if (view !== 'poll') {
        const url = new URL(window.location.href);
        url.searchParams.delete('poll');
        window.history.pushState({}, '', url.toString());
      }
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ToastProvider>
      <AuthProvider>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
          <Navbar
            currentView={currentView}
            onNavigate={handleNavigate}
            onOpenArchitectureDocs={() => setShowArchDocs(true)}
          />

          <main className="flex-1">
            {currentView === 'landing' && <LandingPage onNavigate={handleNavigate} />}
            {currentView === 'login' && <LoginPage onNavigate={handleNavigate} />}
            {currentView === 'signup' && <SignupPage onNavigate={handleNavigate} />}
            {currentView === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
            {currentView === 'create' && <CreatePollPage onNavigate={handleNavigate} />}
            {currentView === 'poll' && activePollId && (
              <PublicPollPage pollId={activePollId} onNavigate={handleNavigate} />
            )}
          </main>

          <ArchitectureDocsModal
            isOpen={showArchDocs}
            onClose={() => setShowArchDocs(false)}
          />
        </div>
      </AuthProvider>
    </ToastProvider>
  );
}

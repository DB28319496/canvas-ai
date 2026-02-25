import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/dashboard/Dashboard.jsx';
import CanvasWorkspace from './components/CanvasWorkspace.jsx';
import AuthPage from './components/auth/AuthPage.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { loadProject } from './utils/api.js';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading: authLoading } = useAuth();

  // 'dashboard' or 'canvas'
  const [view, setView] = useState('dashboard');
  const [currentProject, setCurrentProject] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [backupBanner, setBackupBanner] = useState(null);

  // Check for unsaved backup on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('canvas-ai-backup');
      if (!raw) return;
      const backup = JSON.parse(raw);
      // Only show if backup is less than 24 hours old and has content
      const age = Date.now() - (backup.timestamp || 0);
      if (age < 86400000 && backup.nodes?.length > 0) {
        setBackupBanner(backup);
      } else {
        localStorage.removeItem('canvas-ai-backup');
      }
    } catch {
      localStorage.removeItem('canvas-ai-backup');
    }
  }, []);

  const handleRestoreBackup = useCallback(() => {
    if (!backupBanner) return;
    setCurrentProject(backupBanner);
    setView('canvas');
    setBackupBanner(null);
    localStorage.removeItem('canvas-ai-backup');
  }, [backupBanner]);

  const handleDismissBackup = useCallback(() => {
    setBackupBanner(null);
    localStorage.removeItem('canvas-ai-backup');
  }, []);

  const handleNewProject = useCallback((template) => {
    setCurrentProject(template || null);
    setView('canvas');
  }, []);

  const handleLoadProject = useCallback(async (projectId) => {
    try {
      setLoadError(null);
      const project = await loadProject(projectId);
      setCurrentProject(project);
      setView('canvas');
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  const handleGoHome = useCallback(() => {
    setView('dashboard');
    setCurrentProject(null);
  }, []);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-canvas-bg flex items-center justify-center">
        <Loader2 size={24} className="text-accent animate-spin" />
      </div>
    );
  }

  // Not logged in — show auth page
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-canvas-bg">
      {view === 'dashboard' ? (
        <>
          <Dashboard
            onNewProject={handleNewProject}
            onLoadProject={handleLoadProject}
          />
          {backupBanner && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-amber-500/10 text-amber-300 px-5 py-3 rounded-xl text-sm border border-amber-500/20 flex items-center gap-4 shadow-lg z-50">
              <span>Unsaved work recovered ({backupBanner.nodes.length} nodes)</span>
              <button
                onClick={handleRestoreBackup}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-semibold transition-colors"
              >
                Restore
              </button>
              <button
                onClick={handleDismissBackup}
                className="text-amber-500/60 hover:text-amber-300 text-xs transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
          {loadError && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500/10 text-red-400 px-4 py-2 rounded-lg text-sm border border-red-500/20">
              {loadError}
            </div>
          )}
        </>
      ) : (
        <CanvasWorkspace
          project={currentProject}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

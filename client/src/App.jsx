import React, { useState, useCallback } from 'react';
import Dashboard from './components/dashboard/Dashboard.jsx';
import CanvasWorkspace from './components/CanvasWorkspace.jsx';
import AuthPage from './components/auth/AuthPage.jsx';
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
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

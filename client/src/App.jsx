import React, { useState, useCallback } from 'react';
import Dashboard from './components/dashboard/Dashboard.jsx';
import CanvasWorkspace from './components/CanvasWorkspace.jsx';
import { loadProject } from './utils/api.js';
import { ThemeProvider } from './context/ThemeContext.jsx';

export default function App() {
  // 'dashboard' or 'canvas'
  const [view, setView] = useState('dashboard');
  const [currentProject, setCurrentProject] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const handleNewProject = useCallback((template) => {
    // template can be null (blank) or an object with pre-filled nodes
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

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

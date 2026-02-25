import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Clear any stale state and go to dashboard
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-canvas-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-canvas-panel border border-canvas-border rounded-2xl p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Something went wrong</h2>
              <p className="text-sm text-gray-400">
                An unexpected error occurred. Your work may have been auto-saved.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw size={14} />
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2.5 bg-canvas-hover hover:bg-canvas-border text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                <Home size={14} />
                Dashboard
              </button>
            </div>
            {this.state.error?.message && (
              <p className="text-xs text-gray-600 bg-canvas-bg rounded-lg p-3 break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

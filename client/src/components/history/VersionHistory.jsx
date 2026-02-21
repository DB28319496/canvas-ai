import React, { useState, useEffect, useCallback } from 'react';
import { X, Clock, RotateCcw, Loader2, FileText, GitBranch } from 'lucide-react';
import { listVersions, loadVersion } from '../../utils/api.js';

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function VersionHistory({ isOpen, onClose, projectId, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);

  const fetchVersions = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await listVersions(projectId);
      setVersions(data);
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchVersions();
    }
  }, [isOpen, projectId, fetchVersions]);

  const handleRestore = useCallback(async (versionId) => {
    if (!projectId || restoring) return;
    setRestoring(versionId);
    try {
      const versionData = await loadVersion(projectId, versionId);
      onRestore?.(versionData);
      onClose?.();
    } catch (err) {
      alert(`Restore failed: ${err.message}`);
    } finally {
      setRestoring(null);
    }
  }, [projectId, restoring, onRestore, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-30 w-[340px] bg-canvas-panel border-l border-canvas-border flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-canvas-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-accent" />
          <span className="text-sm font-semibold text-white">Version History</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!projectId ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <GitBranch size={32} className="text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 mb-1">No project saved yet</p>
            <p className="text-xs text-gray-600">Save your project first to start tracking versions.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-gray-500" />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Clock size={32} className="text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 mb-1">No versions yet</p>
            <p className="text-xs text-gray-600">Versions are created each time you save. Try saving your project.</p>
          </div>
        ) : (
          <div className="py-2">
            {versions.map((version, i) => (
              <div
                key={version.id}
                className="group px-4 py-3 hover:bg-canvas-hover transition-colors border-b border-canvas-border/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">
                        {i === 0 ? 'Latest' : timeAgo(version.timestamp)}
                      </span>
                      {i === 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-accent/15 text-accent rounded-full">
                          current
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {formatTime(version.timestamp)}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-gray-600 flex items-center gap-1">
                        <FileText size={10} />
                        {version.nodeCount} nodes
                      </span>
                      {version.edgeCount > 0 && (
                        <span className="text-[10px] text-gray-600">
                          {version.edgeCount} edges
                        </span>
                      )}
                    </div>
                  </div>
                  {i > 0 && (
                    <button
                      onClick={() => handleRestore(version.id)}
                      disabled={restoring === version.id}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-accent bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/20 transition-all disabled:opacity-50"
                    >
                      {restoring === version.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <RotateCcw size={11} />
                      )}
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 py-2.5 border-t border-canvas-border flex-shrink-0">
        <p className="text-[10px] text-gray-600 text-center">
          Up to 30 versions kept per project
        </p>
      </div>
    </div>
  );
}

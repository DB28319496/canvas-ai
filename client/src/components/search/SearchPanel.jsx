import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Type, Image, FileText, Youtube, Mic } from 'lucide-react';

const typeIcons = {
  text: { icon: Type, color: 'text-indigo-400' },
  image: { icon: Image, color: 'text-green-400' },
  pdf: { icon: FileText, color: 'text-red-400' },
  youtube: { icon: Youtube, color: 'text-red-400' },
  voice: { icon: Mic, color: 'text-purple-400' }
};

function getNodeSearchText(node) {
  const d = node.data || {};
  return [
    d.label, d.content, d.filename, d.parsedText,
    d.title, d.transcript, d.description, d.url
  ].filter(Boolean).join(' ').toLowerCase();
}

export default function SearchPanel({ isOpen, onClose, nodes, onFocusNode }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return nodes.filter(node => getNodeSearchText(node).includes(q));
  }, [query, nodes]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 w-[420px] bg-canvas-panel border border-canvas-border rounded-xl shadow-2xl overflow-hidden animate-in">
      {/* Search input */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-canvas-border">
        <Search size={16} className="text-gray-500 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nodes..."
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && results.length > 0) {
              onFocusNode(results[0].id);
              onClose();
            }
          }}
        />
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Results */}
      {query.trim() && (
        <div className="max-h-[300px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-600">
              No matching nodes found
            </div>
          ) : (
            results.map(node => {
              const { icon: Icon, color } = typeIcons[node.type] || typeIcons.text;
              const label = node.data?.label || 'Untitled';
              const preview = (node.data?.content || node.data?.transcript || node.data?.parsedText || node.data?.title || '').slice(0, 80);
              return (
                <button
                  key={node.id}
                  onClick={() => { onFocusNode(node.id); onClose(); }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-canvas-hover transition-colors text-left border-b border-canvas-border/50 last:border-b-0"
                >
                  <Icon size={14} className={`${color} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{label}</div>
                    {preview && (
                      <div className="text-[11px] text-gray-500 truncate mt-0.5">{preview}</div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-600 flex-shrink-0 mt-0.5">{node.type}</span>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Hint */}
      {!query.trim() && (
        <div className="px-4 py-4 text-center text-[11px] text-gray-600">
          Search across all node labels, content, and transcripts
        </div>
      )}
    </div>
  );
}

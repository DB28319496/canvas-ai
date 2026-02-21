import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { Code, X, GripVertical, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export default function EmbedNode({ id, data }) {
  const [collapsed, setCollapsed] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleLabelChange = useCallback((e) => {
    data.onChange?.(id, { label: e.target.value });
  }, [id, data]);

  const handleSubmit = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    data.onChange?.(id, { url, label: data.label || new URL(url).hostname });
  }, [id, data, urlInput]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSubmit();
  }, [handleSubmit]);

  return (
    <div className="canvas-node bg-white rounded-xl shadow-lg border border-gray-200 w-[420px] overflow-hidden">
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 drag-handle cursor-grab">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-400" />
          <Code size={14} className="text-teal-500" />
          <input
            value={data.label || 'Embed'}
            onChange={handleLabelChange}
            className="text-xs font-medium text-gray-700 bg-transparent border-none outline-none w-[150px]"
            placeholder="Label..."
          />
        </div>
        <div className="flex items-center gap-1">
          {data.url && (
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-teal-500 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={13} />
            </a>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            onClick={() => data.onDelete?.(id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div>
          {data.url ? (
            <div className="relative bg-gray-100" style={{ height: 300 }}>
              <iframe
                src={data.url}
                title={data.label || 'Embed'}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          ) : (
            <div className="p-3">
              <p className="text-[11px] text-gray-500 mb-2">
                Paste a URL to embed (e.g. Google Docs, Figma, CodePen, Maps)
              </p>
              <div className="flex gap-1.5">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://..."
                  className="flex-1 text-xs bg-gray-50 text-gray-800 px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-teal-400"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!urlInput.trim()}
                  className="px-3 py-2 text-xs bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-40 transition-colors"
                >
                  Embed
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}

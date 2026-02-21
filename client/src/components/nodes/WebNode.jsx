import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { Globe, X, GripVertical, ChevronDown, ChevronUp, Loader2, ExternalLink } from 'lucide-react';

export default function WebNode({ id, data }) {
  const [urlInput, setUrlInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const handleSubmit = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    data.onUrlSubmit?.(id, trimmed);
    setUrlInput('');
  }, [id, data, urlInput]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSubmit();
  }, [handleSubmit]);

  const handleLabelChange = useCallback((e) => {
    data.onChange?.(id, { label: e.target.value });
  }, [id, data]);

  return (
    <div className="canvas-node bg-white rounded-xl shadow-lg border border-gray-200 w-full h-full overflow-hidden flex flex-col">
      <NodeResizer minWidth={200} minHeight={150} />
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 drag-handle cursor-grab">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-400" />
          <Globe size={14} className="text-cyan-500" />
          <input
            value={data.label || 'Web Page'}
            onChange={handleLabelChange}
            className="text-xs font-medium text-gray-700 bg-transparent border-none outline-none w-[150px]"
            placeholder="Label..."
          />
        </div>
        <div className="flex items-center gap-1">
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
        <div className="p-3 flex-1 overflow-auto">
          {data.loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-cyan-500" />
              <span className="ml-2 text-xs text-gray-500">Fetching page...</span>
            </div>
          ) : data.title ? (
            <div className="space-y-2">
              {/* Page info */}
              <div className="flex items-start gap-2">
                {data.favicon && (
                  <img
                    src={data.favicon}
                    alt=""
                    className="w-4 h-4 mt-0.5 rounded-sm flex-shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-gray-800 leading-tight truncate">{data.title}</h4>
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-cyan-600 hover:underline flex items-center gap-0.5 mt-0.5"
                  >
                    {new URL(data.url).hostname}
                    <ExternalLink size={8} />
                  </a>
                </div>
              </div>

              {data.description && (
                <p className="text-[11px] text-gray-500 leading-relaxed">{data.description}</p>
              )}

              {/* Content preview */}
              {data.content && (
                <div className="max-h-[150px] overflow-y-auto text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-2 border border-gray-100">
                  {data.content.slice(0, 800)}
                  {data.content.length > 800 && '...'}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Paste a URL to scrape content from any website</p>
              <div className="flex gap-1.5">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://example.com"
                  className="flex-1 text-xs bg-gray-50 text-gray-800 px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!urlInput.trim()}
                  className="px-3 py-2 text-xs bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-40 transition-colors"
                >
                  Fetch
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

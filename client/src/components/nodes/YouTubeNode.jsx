import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { Youtube, X, GripVertical, Link, Loader2, PenLine, ExternalLink, ClipboardPaste, ChevronDown, ChevronUp, Lock, Unlock, Sparkles } from 'lucide-react';

export default function YouTubeNode({ id, data }) {
  const [urlInput, setUrlInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLabelChange = useCallback((e) => {
    data.onChange?.(id, { label: e.target.value });
  }, [id, data]);

  const handleSubmitUrl = useCallback(() => {
    if (urlInput.trim()) {
      data.onYouTubeSubmit?.(id, urlInput.trim());
      setUrlInput('');
    }
  }, [id, data, urlInput]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSubmitUrl();
    }
  }, [handleSubmitUrl]);

  // Strip YouTube timestamp lines (e.g. "0:02", "1:03", "12:45") from pasted text
  const cleanTranscript = useCallback((text) => {
    return text
      .split('\n')
      .filter(line => !/^\d{1,2}:\d{2}$/.test(line.trim()))
      .join('\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }, []);

  const handleManualTranscript = useCallback((e) => {
    data.onChange?.(id, { transcript: e.target.value });
  }, [id, data]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const cleaned = cleanTranscript(pasted);
    // Merge with existing content at cursor position
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = data.transcript || '';
    const newValue = current.slice(0, start) + cleaned + current.slice(end);
    data.onChange?.(id, { transcript: newValue });
  }, [id, data, cleanTranscript]);

  const noTranscript = data.thumbnail && !data.transcript;

  return (
    <div className="canvas-node bg-white rounded-xl shadow-lg border border-gray-200 w-full h-full overflow-hidden flex flex-col">
      <NodeResizer minWidth={200} minHeight={200} />
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />

      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 ${data.locked ? 'cursor-default' : 'drag-handle cursor-grab'}`}>
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-400" />
          <Youtube size={14} className="text-red-500" />
          <input
            value={data.label || 'YouTube Video'}
            onChange={handleLabelChange}
            className="text-xs font-medium text-gray-700 bg-transparent border-none outline-none w-[150px]"
            placeholder="Label..."
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => data.onToggleLock?.(id)}
            className={`transition-colors ${data.locked ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600'}`}
            title={data.locked ? 'Unlock node' : 'Lock node'}
          >
            {data.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
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
      {!collapsed && <div className="p-3 flex-1 overflow-hidden flex flex-col">
        {data.thumbnail ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Thumbnail */}
            <a href={data.url} target="_blank" rel="noopener noreferrer">
              <img
                src={data.thumbnail}
                alt="Video thumbnail"
                className="w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
              />
            </a>
            <div className="text-xs text-gray-700 font-medium mt-2 truncate">
              {data.title || data.url}
            </div>

            {/* Transcript section */}
            {data.transcript ? (
              <div className="mt-2 flex-1 flex flex-col min-h-0">
                {/* Toolbar: Edit + AI Notes */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 font-medium">Transcript:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => data.onGenerateNotes?.(id, data.transcript, data.title, data.url)}
                      disabled={data.generatingNotes}
                      className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-wait"
                      title="Generate AI notes from transcript"
                    >
                      {data.generatingNotes ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      {data.generatingNotes ? 'Generating...' : 'AI Notes'}
                    </button>
                    <button
                      onClick={() => setShowManualInput(!showManualInput)}
                      className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                    >
                      <PenLine size={10} />
                      {showManualInput ? 'Preview' : 'Edit'}
                    </button>
                  </div>
                </div>
                {showManualInput ? (
                  <textarea
                    value={data.transcript}
                    onChange={handleManualTranscript}
                    onPaste={handlePaste}
                    className="w-full flex-1 min-h-[80px] text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-indigo-300 resize-none leading-relaxed"
                    placeholder="Edit transcript..."
                  />
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {data.transcript}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* No transcript available — show helpful steps + manual input */
              <div className="mt-2 flex-1 flex flex-col min-h-0">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg mb-2">
                  <div className="text-xs font-medium text-amber-800 mb-1.5">
                    Auto-transcript unavailable
                  </div>
                  <div className="text-xs text-amber-700 leading-relaxed mb-2">
                    You can grab it manually from YouTube:
                  </div>
                  <ol className="text-xs text-amber-700 leading-relaxed space-y-1 list-decimal list-inside">
                    <li>Open the video on YouTube</li>
                    <li>Click <strong>···</strong> below the video &rarr; <strong>Show transcript</strong></li>
                    <li>Select all the text and paste it below</li>
                  </ol>
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-800 hover:text-amber-900 underline"
                  >
                    Open on YouTube <ExternalLink size={10} />
                  </a>
                </div>
                <div className="relative flex-1 flex flex-col">
                  <textarea
                    value={data.transcript || ''}
                    onChange={handleManualTranscript}
                    onPaste={handlePaste}
                    className="w-full flex-1 min-h-[80px] text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2 pr-8 outline-none focus:border-indigo-300 resize-none leading-relaxed"
                    placeholder="Paste transcript, video notes, or a summary of what the video covers..."
                  />
                  <ClipboardPaste size={12} className="absolute top-2.5 right-2.5 text-gray-300 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        ) : data.loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 size={24} className="text-red-400 animate-spin mb-2" />
            <span className="text-xs text-gray-500">Fetching video data...</span>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <Link size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Paste YouTube URL..."
                  className="flex-1 text-sm text-gray-800 bg-transparent border-none outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleSubmitUrl}
              disabled={!urlInput.trim()}
              className="mt-2 w-full py-2 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Fetch Transcript
            </button>
          </div>
        )}
      </div>}

      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}

import React, { useState, useCallback, useRef } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { FileText, X, GripVertical, Upload, ChevronDown, ChevronUp } from 'lucide-react';

export default function PdfNode({ id, data }) {
  const fileInputRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleLabelChange = useCallback((e) => {
    data.onChange?.(id, { label: e.target.value });
  }, [id, data]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      data.onFileUpload?.(id, file);
    }
  }, [id, data]);

  return (
    <div className="canvas-node bg-white rounded-xl shadow-lg border border-gray-200 w-full h-full overflow-hidden flex flex-col">
      <NodeResizer minWidth={200} minHeight={150} />
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 drag-handle cursor-grab">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-400" />
          <FileText size={14} className="text-red-500" />
          <input
            value={data.label || 'PDF Document'}
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
        <div className="p-3 flex-1 overflow-hidden flex flex-col">
          {data.filename ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg mb-2">
                <FileText size={28} className="text-red-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {data.filename}
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.pageCount ? `${data.pageCount} pages` : 'Processing...'}
                  </div>
                </div>
              </div>
              {data.parsedText && (
                <div className="mt-2 flex-1 overflow-y-auto">
                  <div className="text-xs text-gray-500 mb-1 font-medium">Extracted text:</div>
                  <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {data.parsedText}
                  </div>
                </div>
              )}
            </div>
          ) : data.loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mb-2"></div>
              <span className="text-xs text-gray-500">Uploading & parsing PDF...</span>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-red-300 hover:bg-red-50/30 transition-colors"
            >
              <Upload size={24} className="text-gray-400 mb-2" />
              <span className="text-xs text-gray-500">Click to upload a PDF</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}

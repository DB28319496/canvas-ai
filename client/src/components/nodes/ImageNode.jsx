import React, { useState, useCallback, useRef } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { Image, X, GripVertical, Upload, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { generateImage } from '../../utils/api.js';

export default function ImageNode({ id, data }) {
  const fileInputRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState('upload');
  const [genPrompt, setGenPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  const handleLabelChange = useCallback((e) => {
    data.onChange?.(id, { label: e.target.value });
  }, [id, data]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      data.onFileUpload?.(id, file);
    }
  }, [id, data]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      data.onFileUpload?.(id, file);
    }
  }, [id, data]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!genPrompt.trim() || generating) return;
    setGenerating(true);
    setGenError(null);

    try {
      const result = await generateImage(genPrompt.trim());
      data.onChange?.(id, {
        imageUrl: result.url,
        filename: result.filename,
        description: result.revisedPrompt || genPrompt
      });
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [id, data, genPrompt, generating]);

  return (
    <div className="canvas-node bg-white rounded-xl shadow-lg border border-gray-200 w-full h-full overflow-hidden flex flex-col">
      <NodeResizer minWidth={200} minHeight={150} />
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 drag-handle cursor-grab">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-400" />
          <Image size={14} className="text-green-500" />
          <input
            value={data.label || 'Image'}
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
          {data.imageUrl ? (
            <div className="relative group">
              <img
                src={data.imageUrl}
                alt={data.label || 'Image'}
                className="w-full rounded-lg object-contain max-h-full"
              />
              <div className="text-xs text-gray-500 mt-2 truncate">
                {data.filename || 'image'}
              </div>
              {data.description && (
                <div className="text-[10px] text-gray-400 mt-1 line-clamp-2">{data.description}</div>
              )}
            </div>
          ) : (
            <div>
              {/* Tabs */}
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setTab('upload')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md transition-colors ${
                    tab === 'upload' ? 'bg-green-50 text-green-600 font-medium' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Upload size={11} /> Upload
                </button>
                <button
                  onClick={() => setTab('generate')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md transition-colors ${
                    tab === 'generate' ? 'bg-purple-50 text-purple-600 font-medium' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Sparkles size={11} /> Generate
                </button>
              </div>

              {tab === 'upload' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                >
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <span className="text-xs text-gray-500">Click or drop an image</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder="Describe the image you want to create..."
                    className="w-full text-xs bg-gray-50 text-gray-800 px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:border-purple-400 resize-none min-h-[60px]"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={!genPrompt.trim() || generating}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-40 transition-colors"
                  >
                    {generating ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} />
                        Generate Image
                      </>
                    )}
                  </button>
                  {genError && (
                    <p className="text-[10px] text-red-500">{genError}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}

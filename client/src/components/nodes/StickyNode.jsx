import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { X, GripVertical, Sparkles } from 'lucide-react';

const stickyColors = [
  { id: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-900', header: 'bg-yellow-200' },
  { id: 'pink', bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-900', header: 'bg-pink-200' },
  { id: 'blue', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900', header: 'bg-blue-200' },
  { id: 'green', bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-900', header: 'bg-green-200' },
  { id: 'purple', bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-900', header: 'bg-purple-200' },
  { id: 'orange', bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-900', header: 'bg-orange-200' },
];

export default function StickyNode({ id, data }) {
  const [colorId, setColorId] = useState(data.color || 'yellow');
  const color = stickyColors.find(c => c.id === colorId) || stickyColors[0];

  const handleChange = useCallback((e) => {
    data.onChange?.(id, { content: e.target.value });
  }, [id, data]);

  const handleColorChange = useCallback((newColor) => {
    setColorId(newColor);
    data.onChange?.(id, { color: newColor });
  }, [id, data]);

  return (
    <div className={`canvas-node ${color.bg} rounded-lg shadow-md border ${color.border} w-full h-full overflow-hidden flex flex-col`}>
      <NodeResizer minWidth={140} minHeight={100} />
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />

      {/* Header */}
      <div className={`flex items-center justify-between px-2 py-1.5 ${color.header} drag-handle cursor-grab`}>
        <div className="flex items-center gap-1">
          <GripVertical size={12} className={`${color.text} opacity-40`} />
          {/* Color dots */}
          <div className="flex items-center gap-0.5">
            {stickyColors.map(c => (
              <button
                key={c.id}
                onClick={() => handleColorChange(c.id)}
                className={`w-3 h-3 rounded-full ${c.bg} border ${c.border} ${
                  colorId === c.id ? 'ring-1 ring-gray-500 ring-offset-1' : ''
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => data.onAiAction?.(id, data.content || '', data.label || 'Sticky Note', e)}
            className={`${color.text} opacity-40 hover:opacity-100 transition-opacity`}
            title="AI Actions"
          >
            <Sparkles size={11} />
          </button>
          <button
            onClick={() => data.onDelete?.(id)}
            className={`${color.text} opacity-40 hover:opacity-100 transition-opacity`}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 flex-1 overflow-auto">
        <textarea
          value={data.content || ''}
          onChange={handleChange}
          placeholder="Quick note..."
          className={`w-full h-full text-xs ${color.text} ${color.bg} border-none outline-none resize-none leading-relaxed placeholder:${color.text} placeholder:opacity-40`}
        />
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
    </div>
  );
}

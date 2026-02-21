import React, { useState, useCallback } from 'react';
import { LayoutGrid, X, GripVertical } from 'lucide-react';

export default function GroupNode({ id, data }) {
  const [label, setLabel] = useState(data.label || 'Group');

  const handleLabelChange = useCallback((e) => {
    setLabel(e.target.value);
    data.onChange?.(id, { label: e.target.value });
  }, [id, data]);

  return (
    <div
      className="rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-400/5"
      style={{ width: data.style?.width || 500, height: data.style?.height || 400 }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 drag-handle cursor-grab">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-amber-400/60" />
          <LayoutGrid size={14} className="text-amber-400" />
          <input
            value={label}
            onChange={handleLabelChange}
            className="text-xs font-medium text-amber-300 bg-transparent border-none outline-none w-[200px] placeholder-amber-400/40"
            placeholder="Group name..."
          />
        </div>
        <button
          onClick={() => data.onDelete?.(id)}
          className="text-amber-400/40 hover:text-red-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

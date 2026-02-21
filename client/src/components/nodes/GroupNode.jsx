import React, { useState, useCallback } from 'react';
import { NodeResizer } from 'reactflow';
import { LayoutGrid, X, GripVertical, Lock, Unlock } from 'lucide-react';

export default function GroupNode({ id, data, selected }) {
  const [label, setLabel] = useState(data.label || 'Group');

  const handleLabelChange = useCallback((e) => {
    setLabel(e.target.value);
    data.onChange?.(id, { label: e.target.value });
  }, [id, data]);

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-400/5 w-full h-full">
      <NodeResizer minWidth={300} minHeight={250} isVisible={selected} lineStyle={{ borderColor: '#f59e0b' }} handleStyle={{ backgroundColor: '#f59e0b', border: '1.5px solid #fff' }} />
      {/* Header bar */}
      <div className={`flex items-center justify-between px-3 py-2 ${data.locked ? 'cursor-default' : 'drag-handle cursor-grab'}`}>
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => data.onToggleLock?.(id)}
            className={`transition-colors ${data.locked ? 'text-amber-500' : 'text-amber-400/40 hover:text-amber-400'}`}
            title={data.locked ? 'Unlock node' : 'Lock node'}
          >
            {data.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
          <button
            onClick={() => data.onDelete?.(id)}
            className="text-amber-400/40 hover:text-red-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

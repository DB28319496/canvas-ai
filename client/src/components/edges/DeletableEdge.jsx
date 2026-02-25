import React, { useState } from 'react';
import { getBezierPath, BaseEdge } from 'reactflow';
import { X } from 'lucide-react';

export default function DeletableEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style, markerEnd, data
}) {
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition
  });

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Invisible wider path for easier hover/click targeting */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />

      {/* Visible animated edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: hovered ? 2.5 : 1.5,
          transition: 'stroke-width 0.15s ease'
        }}
      />

      {/* Delete button — appears on hover */}
      {hovered && (
        <foreignObject
          x={labelX - 12}
          y={labelY - 12}
          width={24}
          height={24}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              data?.onDelete?.(id);
            }}
            className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
            style={{ cursor: 'pointer', border: 'none', padding: 0 }}
            title="Disconnect"
          >
            <X size={12} />
          </button>
        </foreignObject>
      )}
    </g>
  );
}

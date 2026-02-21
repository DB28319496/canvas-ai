import React, { useEffect, useState, useRef } from 'react';

// Calculate tooltip position relative to the spotlight target
function getTooltipPosition(targetRect, placement, tooltipSize) {
  const padding = 16;
  const arrowSize = 8;
  const pos = { top: 0, left: 0, arrowSide: 'top' };

  if (!targetRect) return pos;

  switch (placement) {
    case 'bottom':
      pos.top = targetRect.bottom + padding;
      pos.left = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2;
      pos.arrowSide = 'top';
      break;
    case 'top':
      pos.top = targetRect.top - tooltipSize.height - padding;
      pos.left = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2;
      pos.arrowSide = 'bottom';
      break;
    case 'left':
      pos.top = targetRect.top + targetRect.height / 2 - tooltipSize.height / 2;
      pos.left = targetRect.left - tooltipSize.width - padding;
      pos.arrowSide = 'right';
      break;
    case 'right':
      pos.top = targetRect.top + targetRect.height / 2 - tooltipSize.height / 2;
      pos.left = targetRect.right + padding;
      pos.arrowSide = 'left';
      break;
    default:
      break;
  }

  // Clamp to viewport
  pos.left = Math.max(12, Math.min(pos.left, window.innerWidth - tooltipSize.width - 12));
  pos.top = Math.max(12, Math.min(pos.top, window.innerHeight - tooltipSize.height - 12));

  return pos;
}

const arrowStyles = {
  top: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[#1a1a1a]',
  bottom: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[#1a1a1a]',
  left: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#1a1a1a]',
  right: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#1a1a1a]'
};

export default function TourStep({
  title,
  description,
  targetRect,
  placement = 'bottom',
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  isFirst,
  isLast
}) {
  const tooltipRef = useRef(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 180 });
  const [pos, setPos] = useState({ top: 0, left: 0, arrowSide: 'top' });

  // Measure tooltip and position it
  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipSize({ width: rect.width, height: rect.height });
    }
  }, [title, description]);

  useEffect(() => {
    const newPos = getTooltipPosition(targetRect, placement, tooltipSize);
    setPos(newPos);
  }, [targetRect, placement, tooltipSize]);

  // Reposition on resize
  useEffect(() => {
    const handleResize = () => {
      const newPos = getTooltipPosition(targetRect, placement, tooltipSize);
      setPos(newPos);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [targetRect, placement, tooltipSize]);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[10002] w-[320px] bg-canvas-panel border border-canvas-border rounded-2xl shadow-2xl shadow-black/40 tour-tooltip-enter"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* Arrow */}
      <div
        className={`absolute w-0 h-0 border-[8px] ${arrowStyles[pos.arrowSide]}`}
      />

      {/* Content */}
      <div className="p-5">
        <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-canvas-border">
        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentStep ? 'bg-accent' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSkip}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip
          </button>
          {!isFirst && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 text-xs text-gray-300 bg-canvas-bg border border-canvas-border rounded-lg hover:bg-canvas-hover transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={onNext}
            className="px-3 py-1.5 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

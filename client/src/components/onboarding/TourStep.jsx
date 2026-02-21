import React, { useEffect, useState, useRef } from 'react';
import {
  LayoutGrid, Move, Type, Sparkles, MessageSquare, Cpu, Globe,
  Zap, Undo2, Save, MoreHorizontal
} from 'lucide-react';

const iconMap = {
  LayoutGrid, Move, Type, Sparkles, MessageSquare, Cpu, Globe,
  Zap, Undo2, Save, MoreHorizontal
};

const categoryColors = {
  indigo: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20',
  violet: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  emerald: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  rose: 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
};

// Calculate tooltip position relative to the spotlight target
function getTooltipPosition(targetRect, placement, tooltipSize) {
  const padding = 16;
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
  top: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[#1e1e2e]',
  bottom: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[#1e1e2e]',
  left: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#1e1e2e]',
  right: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#1e1e2e]'
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
  isLast,
  category,
  categoryColor,
  icon,
  shortcuts,
}) {
  const tooltipRef = useRef(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 360, height: 200 });
  const [pos, setPos] = useState({ top: 0, left: 0, arrowSide: 'top' });

  const StepIcon = icon ? iconMap[icon] : null;

  // Measure tooltip and position it
  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipSize({ width: rect.width, height: rect.height });
    }
  }, [title, description, shortcuts]);

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

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[10002] w-[360px] bg-[#1e1e2e] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 tour-tooltip-enter overflow-hidden"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* Accent top bar */}
      <div className="h-0.5 bg-gradient-to-r from-accent via-purple-500 to-pink-500" />

      {/* Arrow */}
      <div
        className={`absolute w-0 h-0 border-[8px] ${arrowStyles[pos.arrowSide]}`}
      />

      {/* Content */}
      <div className="p-5 pb-4">
        {/* Category badge */}
        {category && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase mb-3 ${categoryColors[categoryColor] || categoryColors.indigo}`}>
            {category}
          </span>
        )}

        {/* Icon + Title */}
        <div className="flex items-center gap-2 mb-2">
          {StepIcon && (
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <StepIcon size={14} className="text-accent" />
            </div>
          )}
          <h3 className="text-[15px] font-semibold text-white leading-tight">{title}</h3>
        </div>

        {/* Description */}
        <p className="text-[13px] text-gray-400 leading-relaxed">{description}</p>

        {/* Keyboard shortcut pills */}
        {shortcuts && shortcuts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {shortcuts.map(key => (
              <span
                key={key}
                className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-gray-300 bg-canvas-bg border border-white/[0.08] rounded-md shadow-[0_1px_0_0_rgba(255,255,255,0.05),inset_0_-1px_0_0_rgba(0,0,0,0.3)]"
              >
                {key}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
        {/* Progress bar + step counter */}
        <div className="flex items-center gap-2.5 flex-1 mr-4">
          <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 font-medium tabular-nums whitespace-nowrap">
            {currentStep + 1}/{totalSteps}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSkip}
            className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip
          </button>
          {!isFirst && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 text-[11px] text-gray-300 bg-white/[0.05] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={onNext}
            className="px-4 py-1.5 text-[11px] font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

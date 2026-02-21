import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import TourStep from './TourStep.jsx';

const STORAGE_KEY = 'canvasai-onboarding-complete';

// Tour step definitions
const TOUR_STEPS = [
  {
    id: 'welcome',
    type: 'modal',
    title: 'Welcome to Canvas AI',
    description: 'Your AI-powered visual workspace. Add text, images, PDFs, YouTube videos, web pages, voice notes, and more — then chat with an AI that sees everything on your canvas and responds in real-time.',
  },
  {
    id: 'toolbar-nodes',
    type: 'spotlight',
    target: '[data-tour="toolbar-nodes"]',
    placement: 'bottom',
    title: 'Add Content Nodes',
    description: 'Add any type of content to your canvas: rich text notes, images (upload or AI-generated), PDFs, YouTube videos, voice recordings, web pages, and frames to group nodes together.',
  },
  {
    id: 'canvas-area',
    type: 'spotlight',
    target: '[data-tour="canvas-area"]',
    placement: 'bottom',
    title: 'Your Infinite Workspace',
    description: 'Drag to pan, scroll to zoom, and drop files directly here. Connect nodes with edges to show relationships — the AI understands these connections. Use Frames to visually group related nodes.',
  },
  {
    id: 'demo-node',
    type: 'spotlight',
    target: '.react-flow__node',
    placement: 'right',
    title: 'Rich Content Cards',
    description: 'Each node is a card with rich editing. Text nodes have a full toolbar (bold, italic, headings, lists, code). Image nodes can generate AI images. Drag the header to reposition.',
    action: 'createTextNode',
  },
  {
    id: 'chat-sidebar',
    type: 'spotlight',
    target: '[data-tour="chat-sidebar"]',
    placement: 'left',
    title: 'AI Chat — Streaming & Smart',
    description: 'Chat with AI about everything on your canvas. Responses stream in real-time, token by token. Choose between Haiku (fast), Sonnet (balanced), or Opus (most capable). The AI can even create new nodes for you.',
    action: 'openChat',
  },
  {
    id: 'save-button',
    type: 'spotlight',
    target: '[data-tour="save-button"]',
    placement: 'bottom',
    title: 'Save & Export',
    description: 'Save your project (auto-saves every 60s too). Export as Markdown document or plain text chat. Use Cmd+S to save, Cmd+E to export, and number keys 1-7 to quickly add nodes.',
  },
  {
    id: 'done',
    type: 'modal',
    title: 'You\'re All Set!',
    description: 'Start creating! Try adding a Web node to scrape a URL, generate an AI image, or use a Frame to organize your research. Click the ? icon in the toolbar to replay this tour anytime.',
  }
];

export default function OnboardingTour({ onAddNode, onOpenChat, isActive, onComplete }) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef(null);

  const currentStep = TOUR_STEPS[step];
  const totalSteps = TOUR_STEPS.length;

  // Start tour
  useEffect(() => {
    if (isActive) {
      setStep(0);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [isActive]);

  // Track target element position
  const updateTargetRect = useCallback(() => {
    if (!visible || !currentStep || currentStep.type === 'modal') {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(currentStep.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
    } else {
      setTargetRect(null);
    }

    rafRef.current = requestAnimationFrame(updateTargetRect);
  }, [visible, currentStep]);

  useEffect(() => {
    if (visible) {
      // Run step action if needed
      if (currentStep?.action === 'createTextNode' && step === 3) {
        // Only create if no nodes exist yet
        const existingNode = document.querySelector('.react-flow__node');
        if (!existingNode) {
          onAddNode?.('text');
          // Wait for node to render before tracking
          setTimeout(() => {
            rafRef.current = requestAnimationFrame(updateTargetRect);
          }, 300);
          return;
        }
      }
      if (currentStep?.action === 'openChat') {
        onOpenChat?.();
      }

      rafRef.current = requestAnimationFrame(updateTargetRect);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, step, currentStep, updateTargetRect, onAddNode, onOpenChat]);

  const finish = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete?.();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (step >= totalSteps - 1) {
      finish();
    } else {
      setStep(s => s + 1);
    }
  }, [step, totalSteps, finish]);

  const handleBack = useCallback(() => {
    setStep(s => Math.max(0, s - 1));
  }, []);

  const handleSkip = useCallback(() => {
    finish();
  }, [finish]);

  if (!visible) return null;

  // Spotlight clip-path: cut a rounded rectangle out of the overlay
  const spotlightPad = 8;
  const clipPath = targetRect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${targetRect.left - spotlightPad}px ${targetRect.top - spotlightPad}px,
        ${targetRect.left - spotlightPad}px ${targetRect.bottom + spotlightPad}px,
        ${targetRect.right + spotlightPad}px ${targetRect.bottom + spotlightPad}px,
        ${targetRect.right + spotlightPad}px ${targetRect.top - spotlightPad}px,
        ${targetRect.left - spotlightPad}px ${targetRect.top - spotlightPad}px
      )`
    : 'none';

  // Modal steps (welcome & done)
  if (currentStep.type === 'modal') {
    const isWelcome = currentStep.id === 'welcome';
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center tour-overlay-enter">
        {/* Dimmed background */}
        <div className="absolute inset-0 bg-black/70" onClick={handleSkip} />

        {/* Modal card */}
        <div className="relative z-10 w-[420px] bg-canvas-panel border border-canvas-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden tour-tooltip-enter">
          {/* Accent top bar */}
          <div className="h-1 bg-gradient-to-r from-accent via-purple-500 to-pink-500" />

          <div className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Sparkles size={24} className="text-accent" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{currentStep.title}</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-8">{currentStep.description}</p>

            <div className="flex items-center justify-center gap-3">
              {isWelcome ? (
                <>
                  <button
                    onClick={handleSkip}
                    className="px-5 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Skip Tour
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-accent rounded-xl hover:bg-accent-hover transition-colors"
                  >
                    Start Tour
                    <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleBack}
                    className="px-5 py-2.5 text-sm text-gray-400 bg-canvas-bg border border-canvas-border rounded-xl hover:bg-canvas-hover transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={finish}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-accent rounded-xl hover:bg-accent-hover transition-colors"
                  >
                    Start Creating
                    <Sparkles size={14} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 pb-5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === step ? 'bg-accent' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Spotlight steps
  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Overlay with spotlight cutout */}
      <div
        className="absolute inset-0 bg-black/60 pointer-events-auto transition-all duration-300"
        style={{ clipPath }}
        onClick={handleSkip}
      />

      {/* Spotlight ring glow */}
      {targetRect && (
        <div
          className="absolute border-2 border-accent/40 rounded-xl pointer-events-none tour-spotlight-pulse"
          style={{
            top: targetRect.top - spotlightPad,
            left: targetRect.left - spotlightPad,
            width: targetRect.width + spotlightPad * 2,
            height: targetRect.height + spotlightPad * 2
          }}
        />
      )}

      {/* Tooltip */}
      <div className="pointer-events-auto">
        <TourStep
          title={currentStep.title}
          description={currentStep.description}
          targetRect={targetRect}
          placement={currentStep.placement || 'bottom'}
          currentStep={step}
          totalSteps={totalSteps}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={handleSkip}
          isFirst={step === 0}
          isLast={step === totalSteps - 1}
        />
      </div>
    </div>
  );
}

// Helper to check if onboarding has been completed
export function shouldShowOnboarding() {
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}

// Helper to reset onboarding
export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}

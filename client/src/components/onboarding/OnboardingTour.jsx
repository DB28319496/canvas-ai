import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, ArrowRight, LayoutGrid, Move, Wand2, Globe, Image,
  Keyboard
} from 'lucide-react';
import TourStep from './TourStep.jsx';

const STORAGE_KEY = 'canvasai-onboarding-complete';

// 14-step tour organized by category
const TOUR_STEPS = [
  // Step 0: Welcome modal
  {
    id: 'welcome',
    type: 'modal',
    title: 'Welcome to Canvas AI',
    description: 'Your AI-powered visual workspace for research, writing, and creative projects.',
  },
  // Step 1: Node types
  {
    id: 'toolbar-nodes',
    type: 'spotlight',
    target: '[data-tour="toolbar-nodes"]',
    placement: 'bottom',
    category: 'Content',
    categoryColor: 'indigo',
    icon: 'LayoutGrid',
    title: '10 Content Types',
    description: 'Add text notes, images, PDFs, YouTube videos, voice recordings, web pages, code snippets, sticky notes, embeds, and frames to organize groups.',
    shortcuts: ['1-9, 0'],
  },
  // Step 2: Canvas workspace
  {
    id: 'canvas-area',
    type: 'spotlight',
    target: '[data-tour="canvas-area"]',
    placement: 'bottom',
    category: 'Workspace',
    categoryColor: 'emerald',
    icon: 'Move',
    title: 'Infinite Canvas',
    description: 'Drag to pan, scroll to zoom, and drop files directly onto the canvas. Connect nodes with edges to build visual relationships — the AI understands these connections.',
    shortcuts: ['Scroll to zoom', 'Drag to pan'],
  },
  // Step 3: Demo node (auto-creates text node)
  {
    id: 'demo-node',
    type: 'spotlight',
    target: '.react-flow__node',
    placement: 'right',
    category: 'Content',
    categoryColor: 'indigo',
    icon: 'Type',
    title: 'Rich Content Cards',
    description: 'Each node is a card with rich editing. Text nodes include bold, italic, headings, lists, and code blocks. Drag the header to reposition and resize with corner handles.',
    action: 'createTextNode',
  },
  // Step 4: AI Quick Actions
  {
    id: 'ai-quick-actions',
    type: 'spotlight',
    target: '[data-tour="ai-sparkles"]',
    placement: 'right',
    category: 'AI',
    categoryColor: 'violet',
    icon: 'Sparkles',
    title: 'AI Quick Actions',
    description: 'Click the sparkles icon on any node to summarize, expand, convert to bullets, fix grammar, translate to 10+ languages, or get a plain-language explanation.',
  },
  // Step 5: Chat sidebar
  {
    id: 'chat-sidebar',
    type: 'spotlight',
    target: '[data-tour="chat-sidebar"]',
    placement: 'left',
    category: 'AI',
    categoryColor: 'violet',
    icon: 'MessageSquare',
    title: 'AI Chat',
    description: 'Chat with AI about everything on your canvas. Responses stream in real-time. The AI sees all your nodes, edges, and connections to give context-aware answers.',
    action: 'openChat',
  },
  // Step 6: Model selector
  {
    id: 'model-selector',
    type: 'spotlight',
    target: '[data-tour="model-selector"]',
    placement: 'left',
    category: 'AI',
    categoryColor: 'violet',
    icon: 'Cpu',
    title: 'Choose Your AI Model',
    description: 'Switch between Haiku (fast and light), Sonnet (balanced), or Opus (most capable) depending on your task. Each model has different speed and capability tradeoffs.',
  },
  // Step 7: Web search toggle
  {
    id: 'web-search',
    type: 'spotlight',
    target: '[data-tour="web-search"]',
    placement: 'top',
    category: 'AI',
    categoryColor: 'violet',
    icon: 'Globe',
    title: 'Web-Enhanced AI',
    description: 'Toggle the globe icon to enable web search. The AI will search the internet first, then combine web results with your canvas context for richer answers.',
  },
  // Step 8: Quick prompts
  {
    id: 'quick-prompts',
    type: 'spotlight',
    target: '[data-tour="quick-prompts"]',
    placement: 'left',
    category: 'AI',
    categoryColor: 'violet',
    icon: 'Zap',
    title: 'Quick Prompt Templates',
    description: 'Six ready-made prompts for common tasks: Summarize All, Write Blog Post, Create Script, Study Guide, Compare & Analyze, and Social Posts.',
    action: 'expandPrompts',
  },
  // Step 9: Toolbar actions
  {
    id: 'toolbar-actions',
    type: 'spotlight',
    target: '[data-tour="toolbar-actions"]',
    placement: 'bottom',
    category: 'Tools',
    categoryColor: 'amber',
    icon: 'Undo2',
    title: 'Undo, Search & Zoom',
    description: 'Undo and redo changes, search across all nodes by content or label, and zoom in or out to navigate your workspace.',
    shortcuts: ['Cmd+Z', 'Cmd+Shift+Z', 'Cmd+F'],
  },
  // Step 10: Save
  {
    id: 'save-button',
    type: 'spotlight',
    target: '[data-tour="save-button"]',
    placement: 'bottom',
    category: 'Tools',
    categoryColor: 'amber',
    icon: 'Save',
    title: 'Save Your Work',
    description: 'Save your project manually or let auto-save handle it every 60 seconds. Each save creates a version snapshot you can restore later from the More menu.',
    shortcuts: ['Cmd+S'],
  },
  // Step 11: More menu
  {
    id: 'more-menu',
    type: 'spotlight',
    target: '[data-tour="more-menu"]',
    placement: 'bottom',
    category: 'Advanced',
    categoryColor: 'rose',
    icon: 'MoreHorizontal',
    title: 'Advanced Features',
    description: 'Auto Layout (grid, tree, mind map), Voice & Tone customization, Version History, Presentation Mode, export to Document/PDF/Chat, and theme toggle.',
    shortcuts: ['Cmd+E'],
  },
  // Step 12: Keyboard shortcuts reference
  {
    id: 'shortcuts-reference',
    type: 'modal',
    title: 'Keyboard Shortcuts',
    description: 'Canvas AI is built for speed. Here are the key shortcuts:',
    shortcutsList: [
      { keys: '1 – 9, 0', action: 'Add node by type' },
      { keys: 'Cmd + S', action: 'Save project' },
      { keys: 'Cmd + E', action: 'Export document' },
      { keys: 'Cmd + Z', action: 'Undo' },
      { keys: 'Cmd + Shift + Z', action: 'Redo' },
      { keys: 'Cmd + F', action: 'Search nodes' },
      { keys: 'Delete', action: 'Delete selected' },
      { keys: 'Scroll', action: 'Zoom in / out' },
    ],
  },
  // Step 13: Done
  {
    id: 'done',
    type: 'modal',
    title: "You're Ready to Create",
    description: 'Here are a few ideas to get started:',
  },
];

// Feature preview cards for welcome modal
const featureCards = [
  { icon: LayoutGrid, label: '10 Node Types', desc: 'Text, images, PDFs, video & more', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  { icon: Sparkles, label: 'AI Powered', desc: 'Chat, quick actions, web search', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  { icon: Move, label: 'Infinite Canvas', desc: 'Pan, zoom, connect, organize', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { icon: Wand2, label: 'Smart Tools', desc: 'Auto layout, export, present', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
];

// Quick-start cards for done modal
const quickStartCards = [
  { icon: Globe, label: 'Scrape a web page', desc: 'Add a Web node and paste any URL', color: 'text-cyan-400' },
  { icon: Image, label: 'Generate an AI image', desc: 'Add an Image node and describe what you want', color: 'text-green-400' },
  { icon: LayoutGrid, label: 'Use a template', desc: 'Go to Dashboard and pick a project template', color: 'text-amber-400' },
];

export default function OnboardingTour({ onAddNode, onOpenChat, onExpandPrompts, isActive, onComplete }) {
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
      // Run step actions
      if (currentStep?.action === 'createTextNode') {
        const existingNode = document.querySelector('.react-flow__node');
        if (!existingNode) {
          onAddNode?.('text');
          setTimeout(() => {
            rafRef.current = requestAnimationFrame(updateTargetRect);
          }, 300);
          return;
        }
      }
      if (currentStep?.action === 'openChat') {
        onOpenChat?.();
      }
      if (currentStep?.action === 'expandPrompts') {
        onExpandPrompts?.();
        // Wait for expand animation
        setTimeout(() => {
          rafRef.current = requestAnimationFrame(updateTargetRect);
        }, 200);
        return;
      }

      rafRef.current = requestAnimationFrame(updateTargetRect);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, step, currentStep, updateTargetRect, onAddNode, onOpenChat, onExpandPrompts]);

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

  // Spotlight clip-path
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

  const progress = ((step + 1) / totalSteps) * 100;

  // ── Modal Steps ──
  if (currentStep.type === 'modal') {
    const isWelcome = currentStep.id === 'welcome';
    const isShortcuts = currentStep.id === 'shortcuts-reference';
    const isDone = currentStep.id === 'done';

    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center tour-overlay-enter">
        <div className="absolute inset-0 bg-black/70" onClick={handleSkip} />

        <div className="relative z-10 w-[440px] bg-[#1e1e2e] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden tour-tooltip-enter">
          {/* Gradient accent bar */}
          <div className="h-1 bg-gradient-to-r from-accent via-purple-500 to-pink-500" />

          <div className="p-8">
            {/* Icon badge */}
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              {isShortcuts
                ? <Keyboard size={24} className="text-accent" />
                : <Sparkles size={24} className="text-accent" />
              }
            </div>

            <h2 className="text-lg font-bold text-white text-center mb-2">{currentStep.title}</h2>
            <p className="text-sm text-gray-400 leading-relaxed text-center mb-6">{currentStep.description}</p>

            {/* Welcome: Feature preview cards */}
            {isWelcome && (
              <div className="grid grid-cols-2 gap-2 mb-6">
                {featureCards.map(card => (
                  <div
                    key={card.label}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left ${card.bg}`}
                  >
                    <card.icon size={16} className={`${card.color} mt-0.5 flex-shrink-0`} />
                    <div>
                      <div className="text-[11px] font-medium text-white">{card.label}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{card.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Shortcuts: Cheat sheet grid */}
            {isShortcuts && currentStep.shortcutsList && (
              <div className="grid grid-cols-2 gap-2 mb-6">
                {currentStep.shortcutsList.map(({ keys, action }) => (
                  <div
                    key={keys}
                    className="flex items-center gap-3 p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl"
                  >
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-gray-300 bg-canvas-bg border border-white/[0.08] rounded-md shadow-[0_1px_0_0_rgba(255,255,255,0.05),inset_0_-1px_0_0_rgba(0,0,0,0.3)] whitespace-nowrap">
                      {keys}
                    </span>
                    <span className="text-[11px] text-gray-400">{action}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Done: Quick-start cards */}
            {isDone && (
              <div className="space-y-2 mb-6">
                {quickStartCards.map(card => (
                  <div
                    key={card.label}
                    className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                      <card.icon size={16} className={card.color} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">{card.label}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{card.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Buttons */}
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
                    className="px-5 py-2.5 text-sm text-gray-300 bg-white/[0.05] border border-white/[0.08] rounded-xl hover:bg-white/[0.08] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={isDone ? finish : handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-accent rounded-xl hover:bg-accent-hover transition-colors"
                  >
                    {isDone ? 'Start Creating' : 'Next'}
                    {isDone ? <Sparkles size={14} /> : <ArrowRight size={14} />}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2.5 px-8 pb-5">
            <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-purple-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 font-medium tabular-nums">
              {step + 1}/{totalSteps}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Spotlight Steps ──
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
          key={currentStep.id}
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
          category={currentStep.category}
          categoryColor={currentStep.categoryColor}
          icon={currentStep.icon}
          shortcuts={currentStep.shortcuts}
        />
      </div>
    </div>
  );
}

export function shouldShowOnboarding() {
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}

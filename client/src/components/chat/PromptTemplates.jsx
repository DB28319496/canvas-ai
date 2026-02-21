import React, { useState, useEffect } from 'react';
import { Zap, ChevronDown, ChevronUp, FileText, Video, BookOpen, PenLine, BarChart3, MessageSquare } from 'lucide-react';

const templates = [
  {
    icon: FileText,
    label: 'Summarize All',
    prompt: 'Summarize all the content on my canvas into a clear, organized overview. Include key points from each source.',
    color: 'text-blue-400'
  },
  {
    icon: PenLine,
    label: 'Write Blog Post',
    prompt: 'Write a blog post based on everything on my canvas. Use the content as research and sources. Make it engaging and well-structured.',
    color: 'text-green-400'
  },
  {
    icon: Video,
    label: 'Create Script',
    prompt: 'Write a video script based on the content on my canvas. Include a hook, main points, and a strong call-to-action. Format it with scene directions.',
    color: 'text-red-400'
  },
  {
    icon: BookOpen,
    label: 'Study Guide',
    prompt: 'Create a comprehensive study guide from everything on my canvas. Include key concepts, definitions, and review questions.',
    color: 'text-purple-400'
  },
  {
    icon: BarChart3,
    label: 'Compare & Analyze',
    prompt: 'Compare and analyze the different sources on my canvas. What are the key similarities and differences? What insights emerge from combining them?',
    color: 'text-yellow-400'
  },
  {
    icon: MessageSquare,
    label: 'Social Posts',
    prompt: 'Create a series of social media posts based on my canvas content. Include posts for Twitter/X, LinkedIn, and Instagram. Make each platform-appropriate.',
    color: 'text-pink-400'
  }
];

export default function PromptTemplates({ onSelectTemplate }) {
  const [expanded, setExpanded] = useState(false);

  // Allow tour to auto-expand prompts
  useEffect(() => {
    const handler = () => setExpanded(true);
    window.addEventListener('expandPromptTemplates', handler);
    return () => window.removeEventListener('expandPromptTemplates', handler);
  }, []);

  return (
    <div data-tour="quick-prompts" className="px-4 pb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full"
      >
        <Zap size={12} className="text-accent" />
        <span>Quick Prompts</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {templates.map((t) => (
            <button
              key={t.label}
              onClick={() => {
                onSelectTemplate(t.prompt);
                setExpanded(false);
              }}
              className="flex items-center gap-2 px-2.5 py-2 bg-canvas-bg/50 border border-canvas-border rounded-lg text-left hover:border-accent/30 hover:bg-canvas-bg transition-all group"
            >
              <t.icon size={12} className={t.color} />
              <span className="text-[11px] text-gray-400 group-hover:text-gray-200 truncate">{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

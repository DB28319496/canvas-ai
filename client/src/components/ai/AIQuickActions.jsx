import React, { useState, useCallback } from 'react';
import {
  Sparkles, FileText, Expand, Languages, CheckCheck,
  ListTree, MessageSquare, Loader2, X
} from 'lucide-react';
import { streamChatMessage } from '../../utils/api.js';

const ACTIONS = [
  { id: 'summarize', icon: FileText, label: 'Summarize', prompt: 'Summarize the following content concisely. Keep key points and main ideas. Output only the summary, no preamble.' },
  { id: 'expand', icon: Expand, label: 'Expand', prompt: 'Expand on the following content with more detail, examples, and depth. Maintain the same tone and style. Output only the expanded content.' },
  { id: 'bullets', icon: ListTree, label: 'To Bullets', prompt: 'Convert the following content into clear, organized bullet points. Output only the bullet points, no preamble.' },
  { id: 'grammar', icon: CheckCheck, label: 'Fix Grammar', prompt: 'Fix any grammar, spelling, and punctuation errors in the following content. Maintain the original meaning and style. Output only the corrected text.' },
  { id: 'translate', icon: Languages, label: 'Translate', prompt: null }, // handled specially
  { id: 'explain', icon: MessageSquare, label: 'Explain', prompt: 'Explain the following content in simple, easy-to-understand terms as if explaining to someone unfamiliar with the topic. Output only the explanation.' }
];

const LANGUAGES = ['Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Italian', 'Arabic', 'Hindi'];

export default function AIQuickActions({ nodeContent, nodeLabel, onCreateNode, model, voiceToneSettings, position, onClose }) {
  const [running, setRunning] = useState(null);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const runAction = useCallback(async (action, extraPrompt = '') => {
    if (running) return;
    setRunning(action.id);

    const prompt = action.id === 'translate'
      ? `Translate the following content into ${extraPrompt}. Output only the translation, no preamble.`
      : action.prompt;

    const userMessage = `${prompt}\n\n---\n\n${nodeContent}`;
    let result = '';

    try {
      await streamChatMessage(
        [{ role: 'user', content: userMessage }],
        [],
        voiceToneSettings,
        model || 'sonnet',
        [],
        null,
        {
          onChunk: (text) => { result += text; },
          onDone: (finalMessage) => {
            result = finalMessage || result;
            onCreateNode?.({
              type: 'text',
              label: `${action.label}: ${nodeLabel}`,
              content: result
            });
            setRunning(null);
            onClose?.();
          },
          onError: (err) => {
            alert(`AI action failed: ${err}`);
            setRunning(null);
          }
        }
      );
    } catch (err) {
      alert(`AI action failed: ${err.message}`);
      setRunning(null);
    }
  }, [running, nodeContent, nodeLabel, onCreateNode, model, voiceToneSettings, onClose]);

  return (
    <div
      className="fixed z-[9999] bg-canvas-panel border border-canvas-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden min-w-[180px]"
      style={{ top: position?.y || 100, left: position?.x || 100 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-canvas-border">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-accent" />
          <span className="text-[11px] font-medium text-white">AI Actions</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Actions */}
      <div className="py-1">
        {ACTIONS.map(action => {
          const Icon = action.icon;
          if (action.id === 'translate') {
            return (
              <div key={action.id}>
                <button
                  onClick={() => setShowLangPicker(!showLangPicker)}
                  disabled={!!running}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-canvas-hover transition-colors disabled:opacity-40"
                >
                  {running === action.id ? (
                    <Loader2 size={13} className="animate-spin text-accent" />
                  ) : (
                    <Icon size={13} />
                  )}
                  {action.label}
                </button>
                {showLangPicker && (
                  <div className="px-2 pb-1 grid grid-cols-2 gap-0.5">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang}
                        onClick={() => { setShowLangPicker(false); runAction(action, lang); }}
                        disabled={!!running}
                        className="text-[10px] text-gray-500 hover:text-white hover:bg-canvas-hover px-2 py-1 rounded transition-colors disabled:opacity-40"
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={action.id}
              onClick={() => runAction(action)}
              disabled={!!running}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-canvas-hover transition-colors disabled:opacity-40"
            >
              {running === action.id ? (
                <Loader2 size={13} className="animate-spin text-accent" />
              ) : (
                <Icon size={13} />
              )}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

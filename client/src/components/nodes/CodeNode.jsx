import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { Code2, X, GripVertical, ChevronDown, ChevronUp, Copy, Check, Sparkles } from 'lucide-react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const languages = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
  'sql', 'bash', 'json', 'yaml', 'markdown'
];

export default function CodeNode({ id, data }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(!data.content);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState(data.language || 'javascript');

  const handleChange = useCallback((e) => {
    data.onChange?.(id, { content: e.target.value });
  }, [id, data]);

  const handleLabelChange = useCallback((e) => {
    data.onChange?.(id, { label: e.target.value });
  }, [id, data]);

  const handleLanguageChange = useCallback((e) => {
    const lang = e.target.value;
    setLanguage(lang);
    data.onChange?.(id, { language: lang });
  }, [id, data]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(data.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [data.content]);

  return (
    <div className="canvas-node bg-white rounded-xl shadow-lg border border-gray-200 w-[380px] overflow-hidden">
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 drag-handle cursor-grab">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-400" />
          <Code2 size={14} className="text-orange-500" />
          <input
            value={data.label || 'Code'}
            onChange={handleLabelChange}
            className="text-xs font-medium text-gray-700 bg-transparent border-none outline-none w-[120px]"
            placeholder="Label..."
          />
        </div>
        <div className="flex items-center gap-1">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 outline-none"
          >
            {languages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <button
            onClick={(e) => data.onAiAction?.(id, data.content || '', data.label || 'Code', e)}
            className="text-gray-400 hover:text-accent transition-colors p-0.5"
            title="AI Actions"
          >
            <Sparkles size={12} />
          </button>
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
            title="Copy code"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            onClick={() => data.onDelete?.(id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div
          className="relative"
          onDoubleClick={() => setIsEditing(true)}
        >
          {isEditing ? (
            <textarea
              value={data.content || ''}
              onChange={handleChange}
              onBlur={() => { if (data.content?.trim()) setIsEditing(false); }}
              placeholder="// Write your code here..."
              className="w-full min-h-[140px] text-xs text-gray-100 bg-[#1e1e2e] px-3 py-3 outline-none resize-none font-mono leading-relaxed"
              autoFocus
              spellCheck={false}
            />
          ) : (
            <div className="max-h-[300px] overflow-auto">
              <SyntaxHighlighter
                language={language}
                style={atomOneDark}
                customStyle={{
                  margin: 0,
                  padding: '12px',
                  fontSize: '11px',
                  lineHeight: '1.6',
                  minHeight: '140px',
                  background: '#1e1e2e'
                }}
                showLineNumbers
                lineNumberStyle={{ color: '#4a4a6a', fontSize: '10px', minWidth: '2em' }}
              >
                {data.content || '// Double-click to edit'}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}

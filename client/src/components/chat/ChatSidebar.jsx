import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Loader2, MessageSquare, ChevronLeft, ChevronRight, Sparkles, Cpu, Square, Globe, Layers, X } from 'lucide-react';
import { streamChatMessage, webSearch } from '../../utils/api.js';
import MarkdownMessage from './MarkdownMessage.jsx';
import PromptTemplates from './PromptTemplates.jsx';

const models = [
  { id: 'haiku', label: 'Haiku', desc: 'Fast & light' },
  { id: 'sonnet', label: 'Sonnet', desc: 'Balanced' },
  { id: 'opus', label: 'Opus', desc: 'Most capable' }
];

export default function ChatSidebar({ nodes, edges, isOpen, onToggle, voiceToneSettings, onCreateNode, onWidthChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(380);

  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const delta = startXRef.current - moveEvent.clientX;
      const newWidth = Math.min(700, Math.max(380, startWidthRef.current + delta));
      setSidebarWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth, onWidthChange]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState('sonnet');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const streamingContentRef = useRef('');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Available groups on canvas
  const availableGroups = useMemo(() =>
    nodes.filter(n => n.type === 'group').map(n => ({ id: n.id, label: n.data?.label || 'Untitled Group' })),
    [nodes]
  );

  // Remove stale group IDs when groups are deleted
  useEffect(() => {
    const groupIds = new Set(availableGroups.map(g => g.id));
    setSelectedGroupIds(prev => {
      const filtered = prev.filter(id => groupIds.has(id));
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [availableGroups]);

  // Build canvas context from current nodes, including edge connections and group membership
  const buildCanvasContext = useCallback(() => {
    // Build group label map
    const groupLabelMap = {};
    nodes.forEach(node => {
      if (node.type === 'group') {
        groupLabelMap[node.id] = node.data?.label || 'Untitled Group';
      }
    });

    // Exclude group nodes (they have no content), add group membership
    const nodeContext = nodes
      .filter(node => node.type !== 'group')
      .map(node => ({
        id: node.id,
        type: node.type,
        label: node.data?.label || '',
        content: node.data?.content || '',
        filename: node.data?.filename || '',
        pageCount: node.data?.pageCount || 0,
        parsedText: node.data?.parsedText || '',
        url: node.data?.url || '',
        title: node.data?.title || '',
        transcript: node.data?.transcript || '',
        imageUrl: node.data?.imageUrl || '',
        description: node.data?.description || '',
        language: node.data?.language || '',
        groupId: node.parentNode || null,
        groupLabel: node.parentNode ? (groupLabelMap[node.parentNode] || null) : null
      }));

    // Edge connections
    const edgeContext = (edges || []).map(edge => ({
      from: edge.source,
      to: edge.target
    }));

    // Groups array for AI awareness
    const groups = Object.entries(groupLabelMap).map(([id, label]) => ({ id, label }));

    return { nodes: nodeContext, edges: edgeContext, groups };
  }, [nodes, edges]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setError(null);
    setIsLoading(true);
    setIsStreaming(true);
    streamingContentRef.current = '';

    try {
      const { nodes: allNodes, edges: edgeContext, groups: groupContext } = buildCanvasContext();

      // Filter nodes by selected groups (ungrouped nodes always included)
      const nodeContext = selectedGroupIds.length > 0
        ? allNodes.filter(n => selectedGroupIds.includes(n.groupId) || n.groupId === null)
        : allNodes;

      // If web search enabled, search before sending to AI
      let searchContext = null;
      if (webSearchEnabled) {
        try {
          const searchResult = await webSearch(trimmed);
          if (searchResult.results?.length > 0) {
            searchContext = searchResult.results;
          }
        } catch {
          // Search failed silently — continue without it
        }
      }

      await streamChatMessage(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        nodeContext,
        voiceToneSettings,
        selectedModel,
        edgeContext,
        searchContext,
        groupContext,
        selectedGroupIds,
        {
          onChunk: (text) => {
            streamingContentRef.current += text;
            const current = streamingContentRef.current;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: current };
              return updated;
            });
          },
          onDone: (finalMessage, createNode) => {
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: finalMessage };
              return updated;
            });
            setIsStreaming(false);
            setIsLoading(false);
            if (createNode && onCreateNode) {
              onCreateNode(createNode);
            }
          },
          onError: (errorMsg) => {
            setError(errorMsg);
            setIsStreaming(false);
            setIsLoading(false);
          }
        }
      );
    } catch (err) {
      setError(err.message);
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, [input, messages, isLoading, buildCanvasContext, voiceToneSettings, selectedModel, onCreateNode, webSearchEnabled, selectedGroupIds]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle prompt template selection
  const handleTemplateSelect = useCallback((prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
  }, []);

  // Expose messages for project save/load
  useEffect(() => {
    window.__canvasAIChatMessages = messages;
  }, [messages]);

  // Allow loading messages from projects
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.messages) {
        setMessages(e.detail.messages);
      }
    };
    window.addEventListener('loadChatMessages', handler);
    return () => window.removeEventListener('loadChatMessages', handler);
  }, []);

  return (
    <>
      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-canvas-panel border border-canvas-border border-r-0 rounded-l-lg p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Sidebar */}
      <div
        data-tour="chat-sidebar"
        className={`fixed right-0 top-0 h-full z-20 bg-canvas-panel border-l border-canvas-border flex flex-col ${
          isOpen ? '' : 'w-0 overflow-hidden transition-all duration-300'
        }`}
        style={isOpen ? { width: sidebarWidth } : undefined}
      >
        {/* Resize drag handle */}
        {isOpen && (
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-30 group"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-accent/30" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gray-600 group-hover:bg-accent transition-colors ml-px" />
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-canvas-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <span className="text-sm font-semibold text-white">AI Chat</span>
            <span className="text-xs text-gray-500 bg-canvas-bg px-2 py-0.5 rounded-full">
              {nodes.length} nodes
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Model selector */}
            <div className="relative">
              <button
                onClick={() => setShowModelPicker(!showModelPicker)}
                data-tour="model-selector"
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-gray-400 bg-canvas-bg border border-canvas-border rounded-lg hover:text-white hover:border-gray-600 transition-colors"
              >
                <Cpu size={11} />
                {models.find(m => m.id === selectedModel)?.label}
              </button>
              {showModelPicker && (
                <div className="absolute right-0 top-full mt-1 bg-canvas-panel border border-canvas-border rounded-lg shadow-xl overflow-hidden z-50">
                  {models.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                      className={`flex items-center justify-between gap-4 w-full px-3 py-2 text-xs hover:bg-canvas-hover transition-colors ${
                        selectedModel === m.id ? 'text-accent' : 'text-gray-400'
                      }`}
                    >
                      <span className="font-medium">{m.label}</span>
                      <span className="text-[10px] text-gray-600">{m.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onToggle}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Group filter chips */}
        {availableGroups.length > 0 && (
          <div className="px-4 py-2 border-b border-canvas-border flex-shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Layers size={12} className="text-gray-500 flex-shrink-0" />
              <button
                onClick={() => setSelectedGroupIds([])}
                className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
                  selectedGroupIds.length === 0
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-canvas-bg border-canvas-border text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                All
              </button>
              {availableGroups.map(g => {
                const isActive = selectedGroupIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupIds(prev =>
                      isActive ? prev.filter(id => id !== g.id) : [...prev, g.id]
                    )}
                    className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors flex items-center gap-1 ${
                      isActive
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : 'bg-canvas-bg border-canvas-border text-gray-500 hover:text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {g.label}
                    {isActive && <X size={10} className="opacity-60" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={32} className="text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 mb-1">
                Chat with your canvas
              </p>
              <p className="text-xs text-gray-600 max-w-[240px]">
                Add content to your canvas, then ask the AI to analyze, summarize, or create based on everything you've gathered.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-md'
                    : 'bg-canvas-bg text-gray-200 rounded-bl-md border border-canvas-border'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <>
                    {msg.content ? (
                      <MarkdownMessage content={msg.content} />
                    ) : isStreaming && i === messages.length - 1 ? (
                      <span className="streaming-cursor" />
                    ) : null}
                    {isStreaming && i === messages.length - 1 && msg.content && (
                      <span className="streaming-cursor inline" />
                    )}
                  </>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          ))}

          {isLoading && !isStreaming && (
            <div className="flex justify-start">
              <div className="bg-canvas-bg text-gray-400 rounded-2xl rounded-bl-md px-4 py-3 border border-canvas-border">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs">Connecting...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="bg-red-500/10 text-red-400 rounded-lg px-4 py-2 text-xs border border-red-500/20">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt templates */}
        {messages.length === 0 && (
          <PromptTemplates onSelectTemplate={handleTemplateSelect} />
        )}

        {/* Input */}
        <div className="p-4 border-t border-canvas-border flex-shrink-0">
          <div className="flex items-end gap-2">
            <button
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              data-tour="web-search"
              title={webSearchEnabled ? 'Web search enabled' : 'Enable web search'}
              className={`flex-shrink-0 p-3 rounded-xl border transition-colors ${
                webSearchEnabled
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                  : 'bg-canvas-bg border-canvas-border text-gray-500 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              <Globe size={16} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                webSearchEnabled ? "Search the web & ask AI..."
                : selectedGroupIds.length === 1 ? `Ask about ${availableGroups.find(g => g.id === selectedGroupIds[0])?.label || 'group'}...`
                : selectedGroupIds.length > 1 ? `Ask about ${selectedGroupIds.length} groups...`
                : "Ask about your canvas..."
              }
              rows={1}
              className="flex-1 bg-canvas-bg text-white text-sm px-4 py-3 rounded-xl border border-canvas-border outline-none focus:border-accent resize-none max-h-[120px] placeholder-gray-600"
              style={{ minHeight: '44px' }}
              onInput={(e) => {
                e.target.style.height = '44px';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 p-3 bg-accent text-white rounded-xl hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isStreaming ? <Square size={16} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

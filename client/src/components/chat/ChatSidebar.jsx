import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, MessageSquare, ChevronLeft, ChevronRight, Sparkles, Cpu, Square, Globe } from 'lucide-react';
import { streamChatMessage, webSearch } from '../../utils/api.js';
import MarkdownMessage from './MarkdownMessage.jsx';
import PromptTemplates from './PromptTemplates.jsx';

const models = [
  { id: 'haiku', label: 'Haiku', desc: 'Fast & light' },
  { id: 'sonnet', label: 'Sonnet', desc: 'Balanced' },
  { id: 'opus', label: 'Opus', desc: 'Most capable' }
];

export default function ChatSidebar({ nodes, edges, isOpen, onToggle, voiceToneSettings, onCreateNode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState('sonnet');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const streamingContentRef = useRef('');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build canvas context from current nodes, including edge connections
  const buildCanvasContext = useCallback(() => {
    const nodeContext = nodes.map(node => ({
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
      language: node.data?.language || ''
    }));

    // Include edge connections so AI knows which nodes are linked
    const edgeContext = (edges || []).map(edge => ({
      from: edge.source,
      to: edge.target
    }));

    return { nodes: nodeContext, edges: edgeContext };
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
      const { nodes: nodeContext, edges: edgeContext } = buildCanvasContext();

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
  }, [input, messages, isLoading, buildCanvasContext, voiceToneSettings, selectedModel, onCreateNode, webSearchEnabled]);

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
        className={`fixed right-0 top-0 h-full z-20 bg-canvas-panel border-l border-canvas-border flex flex-col transition-all duration-300 ${
          isOpen ? 'w-[380px]' : 'w-0 overflow-hidden'
        }`}
      >
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
              placeholder={webSearchEnabled ? "Search the web & ask AI..." : "Ask about your canvas..."}
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

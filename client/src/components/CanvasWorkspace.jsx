import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import '@reactflow/node-resizer/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { nodeTypes } from './nodes/index.js';
import Toolbar from './toolbar/Toolbar.jsx';
import ChatSidebar from './chat/ChatSidebar.jsx';
import { uploadFile, fetchYouTubeData, scrapeUrl, saveProject, streamChatMessage } from '../utils/api.js';
import OnboardingTour, { shouldShowOnboarding, resetOnboarding } from './onboarding/OnboardingTour.jsx';
import VoiceTonePanel from './voicetone/VoiceTonePanel.jsx';
import SearchPanel from './search/SearchPanel.jsx';
import VersionHistory from './history/VersionHistory.jsx';
import { gridLayout, treeLayout, radialLayout } from '../utils/autoLayout.js';
import { exportAsPdf } from '../utils/exportPdf.js';
import AIQuickActions from './ai/AIQuickActions.jsx';
import PresentationMode from './presentation/PresentationMode.jsx';
import DeletableEdge from './edges/DeletableEdge.jsx';

const edgeTypes = { deletable: DeletableEdge };

const defaultDimensions = {
  text:    { width: 320, height: 280 },
  image:   { width: 320, height: 320 },
  pdf:     { width: 320, height: 300 },
  youtube: { width: 320, height: 360 },
  voice:   { width: 320, height: 260 },
  web:     { width: 320, height: 300 },
  code:    { width: 380, height: 320 },
  sticky:  { width: 200, height: 180 },
  embed:   { width: 420, height: 380 },
  group:   { width: 500, height: 400 }
};

export default function CanvasWorkspace({ project, onGoHome }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(project?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(project?.edges || []);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatSidebarWidth, setChatSidebarWidth] = useState(380);
  const [projectName, setProjectName] = useState(project?.name || 'Untitled Project');
  const [projectId, setProjectId] = useState(project?.id || null);
  const [tourActive, setTourActive] = useState(false);
  const [voiceToneOpen, setVoiceToneOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aiQuickAction, setAiQuickAction] = useState(null); // { nodeId, content, label, position }
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [saveToast, setSaveToast] = useState(null); // 'saved' | 'error' | null
  const [groupToast, setGroupToast] = useState(null); // { text, type: 'added' | 'removed' } | null
  const [hoveredGroupId, setHoveredGroupId] = useState(null);
  const [voiceToneSettings, setVoiceToneSettings] = useState(
    project?.voiceToneSettings || { preset: [], customDescription: '', writingSamples: '' }
  );
  const reactFlowWrapper = useRef(null);
  const reactFlowInstance = useRef(null);

  // Ensure loaded nodes have style dimensions for resizability
  useEffect(() => {
    setNodes(nds => {
      let changed = false;
      const updated = nds.map(node => {
        if (!node.style?.width || !node.style?.height) {
          changed = true;
          const dims = defaultDimensions[node.type] || { width: 320, height: 280 };
          return { ...node, style: { ...node.style, width: node.style?.width || dims.width, height: node.style?.height || dims.height } };
        }
        return node;
      });
      return changed ? updated : nds;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Undo/Redo history
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  const pushHistory = useCallback(() => {
    if (isUndoRedoRef.current) return;
    const snapshot = { nodes: JSON.parse(JSON.stringify(nodes.map(n => ({ ...n, data: Object.fromEntries(Object.entries(n.data).filter(([k]) => !['onChange', 'onDelete', 'onFileUpload', 'onYouTubeSubmit', 'onUrlSubmit', 'onAiAction', 'onToggleLock', 'onGenerateNotes', 'generatingNotes', 'isDropTarget'].includes(k))) })))), edges: JSON.parse(JSON.stringify(edges)) };
    const history = historyRef.current.slice(0, historyIndexRef.current + 1);
    history.push(snapshot);
    if (history.length > 50) history.shift();
    historyRef.current = history;
    historyIndexRef.current = history.length - 1;
  }, [nodes, edges]);

  // Save snapshot periodically when nodes/edges change
  const pushTimerRef = useRef(null);
  useEffect(() => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(pushHistory, 1000);
    return () => clearTimeout(pushTimerRef.current);
  }, [nodes, edges, pushHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    isUndoRedoRef.current = true;
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setTimeout(() => { isUndoRedoRef.current = false; }, 100);
  }, [setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    isUndoRedoRef.current = true;
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setTimeout(() => { isUndoRedoRef.current = false; }, 100);
  }, [setNodes, setEdges]);

  // Auto-start onboarding tour on first visit
  useEffect(() => {
    if (shouldShowOnboarding()) {
      const timer = setTimeout(() => setTourActive(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Load chat messages if project has them
  useEffect(() => {
    if (project?.chatMessages?.length > 0) {
      window.dispatchEvent(new CustomEvent('loadChatMessages', {
        detail: { messages: project.chatMessages }
      }));
    }
  }, [project]);

  // Auto-save every 15 seconds
  const autoSaveRef = useRef(null);
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (nodes.length > 0 || projectId) {
        handleSaveProjectSilent();
      }
    }, 15000);
    return () => clearInterval(autoSaveRef.current);
  }, [nodes, edges, projectId, projectName]);

  // Save on page unload (refresh, close tab, navigate away)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (nodes.length === 0 && !projectId) return;
      // Save to localStorage as emergency backup
      try {
        const cleanNodes = nodes.map(node => ({
          ...node,
          data: Object.fromEntries(
            Object.entries(node.data).filter(([key]) =>
              !['onChange', 'onDelete', 'onFileUpload', 'onYouTubeSubmit', 'onUrlSubmit', 'onAiAction', 'onToggleLock', 'onGenerateNotes', 'generatingNotes', 'isDropTarget'].includes(key)
            )
          )
        }));
        const chatMessages = window.__canvasAIChatMessages || [];
        const backup = {
          id: projectId,
          name: projectName || 'Untitled Project',
          nodes: cleanNodes,
          edges,
          chatMessages,
          timestamp: Date.now()
        };
        localStorage.setItem('canvas-ai-backup', JSON.stringify(backup));
      } catch { /* localStorage full or unavailable */ }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [nodes, edges, projectId, projectName]);

  // Handle node data changes
  const handleNodeChange = useCallback((nodeId, updates) => {
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, ...updates } };
      }
      return node;
    }));
  }, [setNodes]);

  // Handle node deletion
  const handleNodeDelete = useCallback((nodeId) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  // Handle file uploads
  const handleFileUpload = useCallback(async (nodeId, file) => {
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, loading: true } };
      }
      return node;
    }));

    try {
      const result = await uploadFile(file);
      setNodes(nds => nds.map(node => {
        if (node.id === nodeId) {
          const isImage = file.type.startsWith('image/');
          const updates = {
            loading: false,
            filename: result.filename,
            ...(isImage
              ? { imageUrl: result.url }
              : { parsedText: result.parsedText, pageCount: result.pageCount }
            )
          };
          return { ...node, data: { ...node.data, ...updates } };
        }
        return node;
      }));
    } catch (error) {
      console.error('Upload failed:', error);
      setNodes(nds => nds.map(node => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, loading: false } };
        }
        return node;
      }));
      alert(`Upload failed: ${error.message}`);
    }
  }, [setNodes]);

  // Handle YouTube URL submission
  const handleYouTubeSubmit = useCallback(async (nodeId, url) => {
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, loading: true } };
      }
      return node;
    }));

    try {
      const result = await fetchYouTubeData(url);
      setNodes(nds => nds.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              loading: false,
              url: result.url,
              thumbnail: result.thumbnail,
              title: result.title,
              transcript: result.transcript
            }
          };
        }
        return node;
      }));
    } catch (error) {
      console.error('YouTube fetch failed:', error);
      setNodes(nds => nds.map(node => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, loading: false } };
        }
        return node;
      }));
      alert(`YouTube fetch failed: ${error.message}`);
    }
  }, [setNodes]);

  // Handle URL scraping for web nodes
  const handleUrlSubmit = useCallback(async (nodeId, url) => {
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, loading: true } };
      }
      return node;
    }));

    try {
      const result = await scrapeUrl(url);
      setNodes(nds => nds.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              loading: false,
              url: result.url,
              title: result.title,
              description: result.description,
              content: result.content,
              favicon: result.favicon
            }
          };
        }
        return node;
      }));
    } catch (error) {
      console.error('URL scrape failed:', error);
      setNodes(nds => nds.map(node => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, loading: false } };
        }
        return node;
      }));
      alert(`Scrape failed: ${error.message}`);
    }
  }, [setNodes]);

  // Handle AI quick action trigger from a node
  const handleAiAction = useCallback((nodeId, content, label, event) => {
    const rect = event?.target?.getBoundingClientRect?.();
    setAiQuickAction({
      nodeId,
      content: content || '',
      label: label || 'Node',
      position: rect ? { x: Math.min(rect.left, window.innerWidth - 220), y: Math.min(rect.bottom + 4, window.innerHeight - 400) } : { x: 200, y: 200 }
    });
  }, []);

  // Toggle lock on a node
  const handleToggleLock = useCallback((nodeId) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== nodeId) return n;
      const locked = !n.data?.locked;
      return {
        ...n,
        draggable: !locked,
        data: { ...n.data, locked }
      };
    }));
  }, [setNodes]);

  // Generate AI notes from a YouTube transcript using the chat endpoint (streaming w/ fallback)
  const handleGenerateNotes = useCallback(async (nodeId, transcript, title, url) => {
    if (!transcript || transcript.trim().length < 20) return;

    // Set loading state on the source node
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, generatingNotes: true } } : n
    ));

    // Trim transcript to keep request fast on serverless
    const trimmed = transcript.length > 12000 ? transcript.slice(0, 12000) + '\n\n[Transcript truncated...]' : transcript;

    const notesPrompt = `Generate structured notes from this ${title ? `"${title}" ` : ''}transcript. Format as HTML with: <h2> Overview (2-3 sentences), <h2> Key Takeaways (bulleted), <h2> Detailed Notes (organized by topic with <h3> sub-headings), <h2> Action Items. Use <ul><li> for bullets, <strong> for key terms. Be thorough but concise.\n\nTranscript:\n${trimmed}`;

    // Build minimal canvas context with just this transcript node
    const nodeContext = [{
      id: nodeId,
      type: 'youtube',
      label: title || 'YouTube Video',
      url: url || '',
      title: title || '',
      transcript: trimmed
    }];

    try {
      await streamChatMessage(
        [{ role: 'user', content: notesPrompt }],
        nodeContext,
        null, // no voice tone
        'haiku', // fast model
        [],
        null,
        [], // no group context
        [], // no focused groups
        {
          onChunk: () => {}, // don't need incremental updates
          onDone: (finalMessage) => {
            const sourceNode = nodes.find(n => n.id === nodeId);
            const offsetX = (sourceNode?.width || 320) + 40;
            const newId = uuidv4();
            const notesLabel = title ? `Notes: ${title}` : 'AI Notes';

            setNodes(nds => [
              ...nds.map(n =>
                n.id === nodeId ? { ...n, data: { ...n.data, generatingNotes: false } } : n
              ),
              {
                id: newId,
                type: 'text',
                position: {
                  x: (sourceNode?.position?.x || 0) + offsetX,
                  y: sourceNode?.position?.y || 0
                },
                data: {
                  label: notesLabel,
                  content: finalMessage,
                  onChange: handleNodeChange,
                  onDelete: handleNodeDelete,
                  onFileUpload: handleFileUpload,
                  onYouTubeSubmit: handleYouTubeSubmit,
                  onUrlSubmit: handleUrlSubmit,
                  onAiAction: handleAiAction,
                  onToggleLock: handleToggleLock,
                  onGenerateNotes: handleGenerateNotes
                },
                dragHandle: '.drag-handle',
                style: { width: 400, height: 500 }
              }
            ]);

            setEdges(eds => [...eds, {
              id: `e-${nodeId}-${newId}`,
              source: nodeId,
              target: newId,
              animated: true,
              style: { stroke: '#6366f1' }
            }]);
          },
          onError: (errorMsg) => {
            setNodes(nds => nds.map(n =>
              n.id === nodeId ? { ...n, data: { ...n.data, generatingNotes: false } } : n
            ));
            alert(`Failed to generate notes: ${errorMsg}`);
          }
        }
      );
    } catch (err) {
      setNodes(nds => nds.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, generatingNotes: false } } : n
      ));
      alert(`Failed to generate notes: ${err.message}`);
    }
  }, [nodes, setNodes, setEdges, handleNodeChange, handleNodeDelete, handleFileUpload, handleYouTubeSubmit, handleUrlSubmit, handleAiAction, handleToggleLock]);

  // Common data passed to all nodes
  const getNodeData = useCallback((type, label) => ({
    label,
    onChange: handleNodeChange,
    onDelete: handleNodeDelete,
    onFileUpload: handleFileUpload,
    onYouTubeSubmit: handleYouTubeSubmit,
    onUrlSubmit: handleUrlSubmit,
    onAiAction: handleAiAction,
    onToggleLock: handleToggleLock,
    onGenerateNotes: handleGenerateNotes
  }), [handleNodeChange, handleNodeDelete, handleFileUpload, handleYouTubeSubmit, handleUrlSubmit, handleAiAction, handleToggleLock, handleGenerateNotes]);

  // Add a new node to the canvas
  const addNode = useCallback((type, extraData = {}) => {
    const labels = {
      text: 'Text Note',
      image: 'Image',
      pdf: 'PDF Document',
      youtube: 'YouTube Video',
      voice: 'Voice Note',
      web: 'Web Page',
      code: 'Code',
      sticky: 'Sticky Note',
      embed: 'Embed',
      group: 'Group'
    };

    const rfInstance = reactFlowInstance.current;
    let position = { x: 250 + Math.random() * 100, y: 200 + Math.random() * 100 };
    if (rfInstance) {
      const wrapper = reactFlowWrapper.current;
      if (wrapper) {
        const bounds = wrapper.getBoundingClientRect();
        const centerX = (bounds.width - (chatOpen ? chatSidebarWidth : 0)) / 2;
        const centerY = bounds.height / 2;
        position = rfInstance.screenToFlowPosition({
          x: centerX + (Math.random() - 0.5) * 200,
          y: centerY + (Math.random() - 0.5) * 200
        });
      }
    }

    const dims = defaultDimensions[type] || { width: 320, height: 280 };

    const newNode = {
      id: uuidv4(),
      type,
      position,
      data: {
        ...getNodeData(type, extraData.label || labels[type]),
        ...extraData,
      },
      dragHandle: '.drag-handle',
      style: { width: dims.width, height: dims.height },
      ...(type === 'group' ? { zIndex: -1 } : {})
    };

    setNodes(nds => type === 'group' ? [newNode, ...nds] : [...nds, newNode]);
  }, [setNodes, getNodeData, chatOpen, chatSidebarWidth]);

  // Handle AI-created nodes from chat
  const handleCreateNodeFromChat = useCallback((nodeData) => {
    addNode(nodeData.type || 'text', {
      label: nodeData.label || 'AI Generated',
      content: nodeData.content || ''
    });
  }, [addNode]);

  // Keep node callbacks fresh
  useEffect(() => {
    setNodes(nds => nds.map(node => ({
      ...node,
      data: {
        ...node.data,
        onChange: handleNodeChange,
        onDelete: handleNodeDelete,
        onFileUpload: handleFileUpload,
        onYouTubeSubmit: handleYouTubeSubmit,
        onUrlSubmit: handleUrlSubmit,
        onAiAction: handleAiAction,
        onToggleLock: handleToggleLock,
        onGenerateNotes: handleGenerateNotes,
        ...(node.type === 'group' ? { isDropTarget: hoveredGroupId === node.id } : {})
      }
    })));
  }, [handleNodeChange, handleNodeDelete, handleFileUpload, handleYouTubeSubmit, handleUrlSubmit, handleAiAction, handleToggleLock, handleGenerateNotes, hoveredGroupId, setNodes]);

  // Highlight group frame while dragging a node over it
  const onNodeDrag = useCallback((event, draggedNode) => {
    if (draggedNode.type === 'group') return;

    const groupNodes = nodes.filter(n => n.type === 'group' && n.id !== draggedNode.id);
    const currentParentDrag = draggedNode.parentNode || null;
    let absXD = draggedNode.position.x;
    let absYD = draggedNode.position.y;
    if (currentParentDrag) {
      const parentD = nodes.find(n => n.id === currentParentDrag);
      if (parentD) { absXD += parentD.position.x; absYD += parentD.position.y; }
    }
    const nwD = draggedNode.width || draggedNode.style?.width || 320;
    const nhD = draggedNode.height || draggedNode.style?.height || 280;
    const cxD = absXD + nwD / 2;
    const cyD = absYD + nhD / 2;

    let hovered = null;
    for (const group of groupNodes) {
      const gx = group.position.x;
      const gy = group.position.y;
      const gw = group.style?.width || 500;
      const gh = group.style?.height || 400;
      if (cxD > gx && cxD < gx + gw && cyD > gy && cyD < gy + gh) {
        hovered = group.id;
        break;
      }
    }
    setHoveredGroupId(prev => prev !== hovered ? hovered : prev);
  }, [nodes]);

  // Handle node drop into/out of groups
  const onNodeDragStop = useCallback((event, draggedNode) => {
    if (draggedNode.type === 'group') return;

    const groupNodes = nodes.filter(n => n.type === 'group' && n.id !== draggedNode.id);
    let newParentId = null;

    // For nodes already in a group, position is relative to parent — convert to absolute
    const currentParent = draggedNode.parentNode || null;
    let absX = draggedNode.position.x;
    let absY = draggedNode.position.y;
    if (currentParent) {
      const parent = nodes.find(n => n.id === currentParent);
      if (parent) {
        absX += parent.position.x;
        absY += parent.position.y;
      }
    }

    // Check if the node's center overlaps with any group
    const nw = draggedNode.width || draggedNode.style?.width || 320;
    const nh = draggedNode.height || draggedNode.style?.height || 280;
    const centerX = absX + nw / 2;
    const centerY = absY + nh / 2;

    for (const group of groupNodes) {
      const gx = group.position.x;
      const gy = group.position.y;
      const gw = group.style?.width || 500;
      const gh = group.style?.height || 400;

      if (centerX > gx && centerX < gx + gw && centerY > gy && centerY < gy + gh) {
        newParentId = group.id;
        break;
      }
    }

    setHoveredGroupId(null);
    if (newParentId === currentParent) return;

    // Show toast feedback
    const groupLabel = newParentId
      ? nodes.find(n => n.id === newParentId)?.data?.label || 'Group'
      : null;
    const nodeLabel = draggedNode.data?.label || 'Node';
    if (newParentId) {
      setGroupToast({ text: `"${nodeLabel}" added to "${groupLabel}"`, type: 'added' });
    } else {
      const oldGroupLabel = nodes.find(n => n.id === currentParent)?.data?.label || 'Group';
      setGroupToast({ text: `"${nodeLabel}" removed from "${oldGroupLabel}"`, type: 'removed' });
    }
    setTimeout(() => setGroupToast(null), 2500);

    setNodes(nds => nds.map(n => {
      if (n.id !== draggedNode.id) return n;
      if (newParentId) {
        // Moving into a group — convert absolute position to relative
        const newGroup = nds.find(p => p.id === newParentId);
        return {
          ...n,
          parentNode: newParentId,
          extent: 'parent',
          position: {
            x: absX - (newGroup?.position.x || 0),
            y: absY - (newGroup?.position.y || 0)
          }
        };
      } else {
        // Moving out of a group — convert relative position to absolute
        const { parentNode, extent, ...rest } = n;
        return {
          ...rest,
          position: { x: absX, y: absY }
        };
      }
    }));
  }, [nodes, setNodes]);

  const handleEdgeDelete = useCallback((edgeId) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId));
  }, [setEdges]);

  // Upgrade existing edges to use the custom deletable type
  useEffect(() => {
    setEdges(eds => {
      const needsUpgrade = eds.some(e => e.type !== 'deletable' || !e.data?.onDelete);
      if (!needsUpgrade) return eds;
      return eds.map(e => ({
        ...e,
        type: 'deletable',
        data: { ...e.data, onDelete: handleEdgeDelete }
      }));
    });
  }, [handleEdgeDelete, setEdges]);

  const onConnect = useCallback((params) => {
    setEdges(eds => addEdge({
      ...params,
      type: 'deletable',
      animated: true,
      style: { stroke: '#6366f1' },
      data: { onDelete: handleEdgeDelete }
    }, eds));
  }, [setEdges, handleEdgeDelete]);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.current?.zoomOut();
  }, []);

  const handleFitView = useCallback(() => {
    reactFlowInstance.current?.fitView({ padding: 0.2, duration: 400, maxZoom: 1 });
  }, []);

  const handleClearCanvas = useCallback(() => {
    if (nodes.length === 0 || confirm('Clear all nodes from the canvas?')) {
      setNodes([]);
      setEdges([]);
    }
  }, [nodes.length, setNodes, setEdges]);

  // Export chat as text
  const handleExportChat = useCallback(() => {
    const chatMessages = window.__canvasAIChatMessages || [];
    if (chatMessages.length === 0) {
      alert('No chat messages to export');
      return;
    }

    const text = chatMessages
      .map(m => `[${m.role.toUpperCase()}]\n${m.content}\n`)
      .join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'canvas-ai'}-chat.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectName]);

  // Export canvas as Markdown document
  const handleExportDocument = useCallback(() => {
    if (nodes.length === 0) {
      alert('Canvas is empty — nothing to export');
      return;
    }

    let md = `# ${projectName || 'Canvas AI Export'}\n\n`;

    nodes.forEach(node => {
      const label = node.data?.label || 'Untitled';
      md += `## ${label}\n\n`;

      switch (node.type) {
        case 'text':
          md += `${node.data?.content || '(empty)'}\n\n`;
          break;
        case 'image':
          md += `![${label}](${node.data?.imageUrl || ''})\n`;
          if (node.data?.description) md += `*${node.data.description}*\n`;
          md += '\n';
          break;
        case 'pdf':
          md += `**File:** ${node.data?.filename || 'unknown'} (${node.data?.pageCount || '?'} pages)\n\n`;
          if (node.data?.parsedText) md += `${node.data.parsedText}\n\n`;
          break;
        case 'youtube':
          md += `**Video:** [${node.data?.title || 'YouTube'}](${node.data?.url || ''})\n\n`;
          if (node.data?.transcript) md += `**Transcript:**\n${node.data.transcript}\n\n`;
          break;
        case 'voice':
          if (node.data?.transcript) md += `**Transcript:**\n${node.data.transcript}\n\n`;
          break;
      }
      md += '---\n\n';
    });

    // Include chat if available
    const chatMessages = window.__canvasAIChatMessages || [];
    if (chatMessages.length > 0) {
      md += `## Chat History\n\n`;
      chatMessages.forEach(m => {
        md += `**${m.role === 'user' ? 'You' : 'AI'}:**\n${m.content}\n\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'canvas-ai'}-export.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, projectName]);

  // Export as PDF (opens print dialog)
  const handleExportPdf = useCallback(() => {
    exportAsPdf(nodes, projectName);
  }, [nodes, projectName]);

  // Save project (with UI feedback)
  const handleSaveProject = useCallback(async () => {
    try {
      const cleanNodes = nodes.map(node => ({
        ...node,
        data: Object.fromEntries(
          Object.entries(node.data).filter(([key]) =>
            !['onChange', 'onDelete', 'onFileUpload', 'onYouTubeSubmit', 'onUrlSubmit', 'onAiAction', 'onToggleLock', 'onGenerateNotes', 'generatingNotes', 'isDropTarget'].includes(key)
          )
        )
      }));

      const chatMessages = window.__canvasAIChatMessages || [];
      const viewport = reactFlowInstance.current?.getViewport() || { x: 0, y: 0, zoom: 1 };

      const result = await saveProject({
        id: projectId,
        name: projectName || 'Untitled Project',
        nodes: cleanNodes,
        edges,
        chatMessages,
        viewport,
        voiceToneSettings
      });

      setProjectId(result.id);
      setSaveToast('saved');
      setTimeout(() => setSaveToast(null), 2000);
      try { localStorage.removeItem('canvas-ai-backup'); } catch {}
    } catch (error) {
      setSaveToast('error');
      setTimeout(() => setSaveToast(null), 3000);
    }
  }, [nodes, edges, projectId, projectName, voiceToneSettings]);

  // Silent auto-save (no UI feedback)
  const handleSaveProjectSilent = useCallback(async () => {
    try {
      const cleanNodes = nodes.map(node => ({
        ...node,
        data: Object.fromEntries(
          Object.entries(node.data).filter(([key]) =>
            !['onChange', 'onDelete', 'onFileUpload', 'onYouTubeSubmit', 'onUrlSubmit', 'onAiAction', 'onToggleLock', 'onGenerateNotes', 'generatingNotes', 'isDropTarget'].includes(key)
          )
        )
      }));

      const chatMessages = window.__canvasAIChatMessages || [];
      const viewport = reactFlowInstance.current?.getViewport() || { x: 0, y: 0, zoom: 1 };

      const result = await saveProject({
        id: projectId,
        name: projectName || 'Untitled Project',
        nodes: cleanNodes,
        edges,
        chatMessages,
        viewport,
        voiceToneSettings
      });

      setProjectId(result.id);
      try { localStorage.removeItem('canvas-ai-backup'); } catch {}
    } catch {
      // Silent fail for auto-save
    }
  }, [nodes, edges, projectId, projectName, voiceToneSettings]);

  // Handle drop files onto canvas
  const onDrop = useCallback((event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    const rfInstance = reactFlowInstance.current;
    const position = rfInstance
      ? rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : { x: event.clientX, y: event.clientY };

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const isText = file.type.startsWith('text/') || /\.(txt|md|markdown|json|csv|xml|html|css|js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|h)$/i.test(file.name);

    if (!isImage && !isPdf && !isText) return;

    if (isText) {
      // Read text file and create a text or code node
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const isCode = /\.(js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|h|css|html|xml|json)$/i.test(file.name);
        const type = isCode ? 'code' : 'text';
        const dims = defaultDimensions[type] || { width: 320, height: 280 };
        const newNode = {
          id: uuidv4(),
          type,
          position,
          data: {
            ...getNodeData(type, file.name),
            content,
            ...(isCode ? { language: file.name.split('.').pop().toLowerCase() } : {})
          },
          dragHandle: '.drag-handle',
          style: { width: dims.width, height: dims.height }
        };
        setNodes(nds => [...nds, newNode]);
      };
      reader.readAsText(file);
      return;
    }

    const type = isImage ? 'image' : 'pdf';
    const nodeId = uuidv4();

    const dims = defaultDimensions[type] || { width: 320, height: 300 };
    const newNode = {
      id: nodeId,
      type,
      position,
      data: {
        ...getNodeData(type, isImage ? 'Image' : 'PDF Document'),
        loading: true
      },
      dragHandle: '.drag-handle',
      style: { width: dims.width, height: dims.height }
    };

    setNodes(nds => [...nds, newNode]);
    handleFileUpload(nodeId, file);
  }, [setNodes, getNodeData, handleFileUpload]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Focus on a specific node (for search)
  const handleFocusNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && reactFlowInstance.current) {
      reactFlowInstance.current.setCenter(node.position.x + 160, node.position.y + 100, { zoom: 1.2, duration: 500 });
      // Briefly highlight
      setNodes(nds => nds.map(n => ({
        ...n,
        selected: n.id === nodeId
      })));
    }
  }, [nodes, setNodes]);

  // Auto-layout handler
  const handleAutoLayout = useCallback((layoutType) => {
    if (nodes.length === 0) return;

    // Get the center of the viewport for positioning
    const rfInstance = reactFlowInstance.current;
    let centerX = 600, centerY = 400;
    if (rfInstance) {
      const viewport = rfInstance.getViewport();
      const wrapper = reactFlowWrapper.current;
      if (wrapper) {
        const bounds = wrapper.getBoundingClientRect();
        const screenCenter = rfInstance.screenToFlowPosition({
          x: bounds.width / 2,
          y: bounds.height / 2
        });
        centerX = screenCenter.x;
        centerY = screenCenter.y;
      }
    }

    let layoutedNodes;
    switch (layoutType) {
      case 'grid':
        layoutedNodes = gridLayout(nodes, centerX - 400, centerY - 300);
        break;
      case 'tree':
        layoutedNodes = treeLayout(nodes, edges, centerX, centerY - 200);
        break;
      case 'radial':
        layoutedNodes = radialLayout(nodes, edges, centerX, centerY);
        break;
      default:
        return;
    }

    setNodes(layoutedNodes);
    setTimeout(() => {
      rfInstance?.fitView({ padding: 0.2, duration: 500 });
    }, 50);
  }, [nodes, edges, setNodes]);

  // Restore a version from history
  const handleRestoreVersion = useCallback((versionData) => {
    const restoredNodes = (versionData.nodes || []).map(node => ({
      ...node,
      data: {
        ...node.data,
        onChange: handleNodeChange,
        onDelete: handleNodeDelete,
        onFileUpload: handleFileUpload,
        onYouTubeSubmit: handleYouTubeSubmit,
        onUrlSubmit: handleUrlSubmit,
        onAiAction: handleAiAction,
        onToggleLock: handleToggleLock,
        onGenerateNotes: handleGenerateNotes
      }
    }));
    setNodes(restoredNodes);
    setEdges(versionData.edges || []);
    if (versionData.chatMessages?.length > 0) {
      window.dispatchEvent(new CustomEvent('loadChatMessages', {
        detail: { messages: versionData.chatMessages }
      }));
    }
    if (versionData.viewport && reactFlowInstance.current) {
      reactFlowInstance.current.setViewport(versionData.viewport);
    }
  }, [setNodes, setEdges, handleNodeChange, handleNodeDelete, handleFileUpload, handleYouTubeSubmit, handleUrlSubmit, handleAiAction, handleToggleLock, handleGenerateNotes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+S → Save
      if (isMod && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
      }
      // Cmd/Ctrl+F → Search
      if (isMod && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      // Cmd/Ctrl+Z → Undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Cmd/Ctrl+Shift+Z → Redo
      if (isMod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      // Cmd/Ctrl+E → Export document
      if (isMod && e.key === 'e') {
        e.preventDefault();
        handleExportDocument();
      }
      // Number shortcuts for adding nodes (when not in input)
      if (!isMod && !e.altKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (e.key === '1') addNode('text');
        if (e.key === '2') addNode('image');
        if (e.key === '3') addNode('pdf');
        if (e.key === '4') addNode('youtube');
        if (e.key === '5') addNode('voice');
        if (e.key === '6') addNode('web');
        if (e.key === '7') addNode('code');
        if (e.key === '8') addNode('sticky');
        if (e.key === '9') addNode('embed');
        if (e.key === '0') addNode('group');
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleSaveProject, handleExportDocument, handleUndo, handleRedo, addNode]);

  return (
    <div className="h-full w-full relative" ref={reactFlowWrapper}>
      <Toolbar
        onAddNode={addNode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onClearCanvas={handleClearCanvas}
        onExportChat={handleExportChat}
        onExportDocument={handleExportDocument}
        onExportPdf={handleExportPdf}
        onSaveProject={handleSaveProject}
        onGoHome={onGoHome}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onOpenVoiceTone={() => setVoiceToneOpen(true)}
        voiceToneActive={
          (voiceToneSettings.preset?.length > 0) ||
          !!voiceToneSettings.customDescription?.trim() ||
          !!voiceToneSettings.writingSamples?.trim()
        }
        onReplayTour={() => {
          resetOnboarding();
          setTourActive(true);
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSearch={() => setSearchOpen(prev => !prev)}
        onOpenHistory={() => setHistoryOpen(true)}
        onAutoLayout={handleAutoLayout}
        onPresent={() => setPresentationOpen(true)}
        onFitView={handleFitView}
        chatOpen={chatOpen}
        chatSidebarWidth={chatSidebarWidth}
      />

      <div data-tour="canvas-area" className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
          // Always fit view when project has nodes for a good initial overview
          if (project?.nodes?.length > 0) {
            setTimeout(() => instance.fitView({ padding: 0.3, maxZoom: 0.85, duration: 0 }), 50);
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-canvas-bg"
        proOptions={{ hideAttribution: true }}
        style={{ paddingTop: '48px' }}
      >
        <Background color="#1a1a1a" gap={20} size={1} />
        <Controls position="bottom-left" className="!bottom-4 !left-4" />
        <MiniMap
          position="bottom-left"
          className="!bottom-4 !left-16"
          nodeColor="#6366f1"
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
      </div>

      <ChatSidebar
        nodes={nodes}
        edges={edges}
        isOpen={chatOpen}
        onToggle={() => setChatOpen(prev => !prev)}
        voiceToneSettings={voiceToneSettings}
        onCreateNode={handleCreateNodeFromChat}
        onWidthChange={setChatSidebarWidth}
      />

      {/* Search panel */}
      <SearchPanel
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        nodes={nodes}
        onFocusNode={handleFocusNode}
      />

      {/* Voice & Tone settings panel */}
      <VoiceTonePanel
        isOpen={voiceToneOpen}
        onClose={() => setVoiceToneOpen(false)}
        settings={voiceToneSettings}
        onSettingsChange={setVoiceToneSettings}
      />

      {/* Version History panel */}
      <VersionHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        projectId={projectId}
        onRestore={handleRestoreVersion}
      />

      {/* AI Quick Actions popup */}
      {aiQuickAction && (
        <AIQuickActions
          nodeContent={aiQuickAction.content}
          nodeLabel={aiQuickAction.label}
          position={aiQuickAction.position}
          model="sonnet"
          voiceToneSettings={voiceToneSettings}
          onCreateNode={handleCreateNodeFromChat}
          onClose={() => setAiQuickAction(null)}
        />
      )}

      {/* Presentation Mode */}
      <PresentationMode
        nodes={nodes}
        isOpen={presentationOpen}
        onClose={() => setPresentationOpen(false)}
      />

      {/* Onboarding tour */}
      {/* Save toast notification */}
      {saveToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 ${
          saveToast === 'saved'
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/15 text-red-400 border border-red-500/20'
        }`}>
          {saveToast === 'saved' ? 'Project saved' : 'Save failed — try again'}
        </div>
      )}
      {/* Group assignment toast */}
      {groupToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 ${
          groupToast.type === 'added'
            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
            : 'bg-gray-500/15 text-gray-400 border border-gray-500/20'
        }`}>
          {groupToast.text}
        </div>
      )}

      <OnboardingTour
        isActive={tourActive}
        onAddNode={addNode}
        onOpenChat={() => setChatOpen(true)}
        onExpandPrompts={() => {
          window.dispatchEvent(new CustomEvent('expandPromptTemplates'));
        }}
        onComplete={() => setTourActive(false)}
      />

    </div>
  );
}

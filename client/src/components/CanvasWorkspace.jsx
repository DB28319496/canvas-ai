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
import { v4 as uuidv4 } from 'uuid';
import { nodeTypes } from './nodes/index.js';
import Toolbar from './toolbar/Toolbar.jsx';
import ChatSidebar from './chat/ChatSidebar.jsx';
import { uploadFile, fetchYouTubeData, scrapeUrl, saveProject } from '../utils/api.js';
import OnboardingTour, { shouldShowOnboarding, resetOnboarding } from './onboarding/OnboardingTour.jsx';
import VoiceTonePanel from './voicetone/VoiceTonePanel.jsx';
import SearchPanel from './search/SearchPanel.jsx';
import VersionHistory from './history/VersionHistory.jsx';
import { gridLayout, treeLayout, radialLayout } from '../utils/autoLayout.js';
import { exportAsPdf } from '../utils/exportPdf.js';
import AIQuickActions from './ai/AIQuickActions.jsx';
import PresentationMode from './presentation/PresentationMode.jsx';

export default function CanvasWorkspace({ project, onGoHome }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(project?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(project?.edges || []);
  const [chatOpen, setChatOpen] = useState(true);
  const [projectName, setProjectName] = useState(project?.name || 'Untitled Project');
  const [projectId, setProjectId] = useState(project?.id || null);
  const [tourActive, setTourActive] = useState(false);
  const [voiceToneOpen, setVoiceToneOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aiQuickAction, setAiQuickAction] = useState(null); // { nodeId, content, label, position }
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [voiceToneSettings, setVoiceToneSettings] = useState(
    project?.voiceToneSettings || { preset: [], customDescription: '', writingSamples: '' }
  );
  const reactFlowWrapper = useRef(null);
  const reactFlowInstance = useRef(null);

  // Undo/Redo history
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  const pushHistory = useCallback(() => {
    if (isUndoRedoRef.current) return;
    const snapshot = { nodes: JSON.parse(JSON.stringify(nodes.map(n => ({ ...n, data: Object.fromEntries(Object.entries(n.data).filter(([k]) => !['onChange', 'onDelete', 'onFileUpload', 'onYouTubeSubmit'].includes(k))) })))), edges: JSON.parse(JSON.stringify(edges)) };
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

  // Auto-save every 60 seconds
  const autoSaveRef = useRef(null);
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (nodes.length > 0 || projectId) {
        handleSaveProjectSilent();
      }
    }, 60000);
    return () => clearInterval(autoSaveRef.current);
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

  // Common data passed to all nodes
  const getNodeData = useCallback((type, label) => ({
    label,
    onChange: handleNodeChange,
    onDelete: handleNodeDelete,
    onFileUpload: handleFileUpload,
    onYouTubeSubmit: handleYouTubeSubmit,
    onUrlSubmit: handleUrlSubmit,
    onAiAction: handleAiAction
  }), [handleNodeChange, handleNodeDelete, handleFileUpload, handleYouTubeSubmit, handleUrlSubmit, handleAiAction]);

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
        const centerX = (bounds.width - (chatOpen ? 380 : 0)) / 2;
        const centerY = bounds.height / 2;
        position = rfInstance.screenToFlowPosition({
          x: centerX + (Math.random() - 0.5) * 200,
          y: centerY + (Math.random() - 0.5) * 200
        });
      }
    }

    const newNode = {
      id: uuidv4(),
      type,
      position,
      data: {
        ...getNodeData(type, extraData.label || labels[type]),
        ...extraData,
        ...(type === 'group' ? { style: { width: 500, height: 400 } } : {})
      },
      dragHandle: '.drag-handle',
      ...(type === 'group' ? {
        style: { width: 500, height: 400 },
        zIndex: -1
      } : {})
    };

    setNodes(nds => type === 'group' ? [newNode, ...nds] : [...nds, newNode]);
  }, [setNodes, getNodeData, chatOpen]);

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
        onAiAction: handleAiAction
      }
    })));
  }, [handleNodeChange, handleNodeDelete, handleFileUpload, handleYouTubeSubmit, handleUrlSubmit, handleAiAction, setNodes]);

  // Handle node drop into/out of groups
  const onNodeDragStop = useCallback((event, draggedNode) => {
    if (draggedNode.type === 'group') return;

    const groupNodes = nodes.filter(n => n.type === 'group' && n.id !== draggedNode.id);
    let newParentId = null;

    for (const group of groupNodes) {
      const gx = group.position.x;
      const gy = group.position.y;
      const gw = group.style?.width || 500;
      const gh = group.style?.height || 400;
      const nx = draggedNode.position.x;
      const ny = draggedNode.position.y;

      if (nx > gx && nx < gx + gw - 100 && ny > gy && ny < gy + gh - 50) {
        newParentId = group.id;
        break;
      }
    }

    const currentParent = draggedNode.parentNode || null;
    if (newParentId === currentParent) return;

    setNodes(nds => nds.map(n => {
      if (n.id !== draggedNode.id) return n;
      if (newParentId) {
        const parent = nds.find(p => p.id === newParentId);
        return {
          ...n,
          parentNode: newParentId,
          extent: 'parent',
          position: {
            x: n.position.x - (parent?.position.x || 0),
            y: n.position.y - (parent?.position.y || 0)
          }
        };
      } else {
        const parent = nds.find(p => p.id === currentParent);
        const { parentNode, extent, ...rest } = n;
        return {
          ...rest,
          position: {
            x: n.position.x + (parent?.position.x || 0),
            y: n.position.y + (parent?.position.y || 0)
          }
        };
      }
    }));
  }, [nodes, setNodes]);

  const onConnect = useCallback((params) => {
    setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#6366f1' } }, eds));
  }, [setEdges]);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.current?.zoomOut();
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
            !['onChange', 'onDelete', 'onFileUpload', 'onYouTubeSubmit', 'onUrlSubmit', 'onAiAction'].includes(key)
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
      const btn = document.querySelector('[title="Save Project"]');
      if (btn) {
        btn.classList.add('!text-green-400');
        setTimeout(() => btn.classList.remove('!text-green-400'), 1500);
      }
    } catch (error) {
      alert(`Save failed: ${error.message}`);
    }
  }, [nodes, edges, projectId, projectName, voiceToneSettings]);

  // Silent auto-save (no UI feedback)
  const handleSaveProjectSilent = useCallback(async () => {
    try {
      const cleanNodes = nodes.map(node => ({
        ...node,
        data: Object.fromEntries(
          Object.entries(node.data).filter(([key]) =>
            !['onChange', 'onDelete', 'onFileUpload', 'onYouTubeSubmit', 'onUrlSubmit', 'onAiAction'].includes(key)
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
    if (!isImage && !isPdf) return;

    const type = isImage ? 'image' : 'pdf';
    const nodeId = uuidv4();

    const newNode = {
      id: nodeId,
      type,
      position,
      data: {
        ...getNodeData(type, isImage ? 'Image' : 'PDF Document'),
        loading: true
      },
      dragHandle: '.drag-handle'
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
        onUrlSubmit: handleUrlSubmit
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
  }, [setNodes, setEdges, handleNodeChange, handleNodeDelete, handleFileUpload, handleYouTubeSubmit, handleUrlSubmit]);

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
      />

      <div data-tour="canvas-area" className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        onInit={(instance) => { reactFlowInstance.current = instance; }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView={project?.nodes?.length > 0}
        defaultViewport={project?.viewport || { x: 0, y: 0, zoom: 1 }}
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
      <OnboardingTour
        isActive={tourActive}
        onAddNode={addNode}
        onOpenChat={() => setChatOpen(true)}
        onComplete={() => setTourActive(false)}
      />

    </div>
  );
}

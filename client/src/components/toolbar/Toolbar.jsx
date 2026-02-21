import React, { useState } from 'react';
import {
  Type, Image, FileText, Youtube, Mic, Globe, LayoutGrid, Code2, StickyNote,
  ZoomIn, ZoomOut, Trash2, Download, Save, Clock, Wand2, AppWindow,
  Sparkles, Palette, HelpCircle,
  Undo2, Redo2, Search, FileDown, Sun, Moon, Printer, Play
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

const nodeButtons = [
  { type: 'text', icon: Type, label: 'Text', color: 'text-indigo-400' },
  { type: 'image', icon: Image, label: 'Image', color: 'text-green-400' },
  { type: 'pdf', icon: FileText, label: 'PDF', color: 'text-red-400' },
  { type: 'youtube', icon: Youtube, label: 'YouTube', color: 'text-red-400' },
  { type: 'voice', icon: Mic, label: 'Voice', color: 'text-purple-400' },
  { type: 'web', icon: Globe, label: 'Web', color: 'text-cyan-400' },
  { type: 'code', icon: Code2, label: 'Code', color: 'text-orange-400' },
  { type: 'sticky', icon: StickyNote, label: 'Sticky', color: 'text-yellow-400' },
  { type: 'embed', icon: AppWindow, label: 'Embed', color: 'text-teal-400' },
  { type: 'group', icon: LayoutGrid, label: 'Frame', color: 'text-amber-400' }
];

export default function Toolbar({
  onAddNode,
  onZoomIn,
  onZoomOut,
  onClearCanvas,
  onExportChat,
  onExportDocument,
  onSaveProject,
  onGoHome,
  projectName,
  onProjectNameChange,
  onOpenVoiceTone,
  voiceToneActive,
  onReplayTour,
  onUndo,
  onRedo,
  onSearch,
  onOpenHistory,
  onAutoLayout,
  onExportPdf,
  onPresent
}) {
  const { theme, toggleTheme } = useTheme();
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-canvas-panel/90 backdrop-blur-md border-b border-canvas-border">
      {/* Left: Logo and project name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-canvas-hover transition-colors"
          title="Back to Dashboard"
        >
          <Sparkles size={20} className="text-accent" />
          <span className="text-sm font-semibold text-white hidden lg:inline">Canvas AI</span>
        </button>

        <div className="w-px h-6 bg-canvas-border" />

        <input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          className="text-sm text-gray-300 bg-transparent border-none outline-none hover:text-white focus:text-white transition-colors w-[140px]"
          placeholder="Untitled Project"
        />
      </div>

      {/* Center: Node type buttons */}
      <div data-tour="toolbar-nodes" className="flex items-center gap-1 px-2 py-1 bg-canvas-bg/60 rounded-xl border border-canvas-border">
        {nodeButtons.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => onAddNode(type)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-all text-xs"
            title={`Add ${label} Node`}
          >
            <Icon size={14} className={color} />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5">
        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title="Undo (Cmd+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={onRedo}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>

        {/* Search */}
        <button
          onClick={onSearch}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title="Search Nodes (Cmd+F)"
        >
          <Search size={14} />
        </button>

        {/* Auto Layout */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
            title="Auto Layout"
          >
            <Wand2 size={14} />
          </button>
          {showLayoutMenu && (
            <div className="absolute right-0 top-full mt-1 bg-canvas-panel border border-canvas-border rounded-lg shadow-xl overflow-hidden z-50 min-w-[140px]">
              {[
                { id: 'grid', label: 'Grid', desc: 'Even grid' },
                { id: 'tree', label: 'Tree', desc: 'Hierarchy' },
                { id: 'radial', label: 'Mind Map', desc: 'Radial' }
              ].map(layout => (
                <button
                  key={layout.id}
                  onClick={() => { onAutoLayout?.(layout.id); setShowLayoutMenu(false); }}
                  className="flex items-center justify-between gap-4 w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-canvas-hover transition-colors"
                >
                  <span className="font-medium">{layout.label}</span>
                  <span className="text-[10px] text-gray-600">{layout.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-canvas-border mx-0.5" />

        {/* Zoom */}
        <button
          onClick={onZoomIn}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={onZoomOut}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>

        <div className="w-px h-5 bg-canvas-border mx-0.5" />

        {/* Voice & Tone */}
        <button
          onClick={onOpenVoiceTone}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors text-xs ${
            voiceToneActive
              ? 'text-accent bg-accent/10 hover:bg-accent/20'
              : 'text-gray-400 hover:text-white hover:bg-canvas-hover'
          }`}
          title="Voice & Tone Settings"
        >
          <Palette size={13} />
          <span className="hidden xl:inline">Voice</span>
          {voiceToneActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>

        <div className="w-px h-5 bg-canvas-border mx-0.5" />

        {/* Save */}
        <button
          onClick={onSaveProject}
          data-tour="save-button"
          className="flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors text-xs"
          title="Save Project (Cmd+S)"
        >
          <Save size={13} />
          <span className="hidden xl:inline">Save</span>
        </button>

        {/* Version History */}
        <button
          onClick={onOpenHistory}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title="Version History"
        >
          <Clock size={14} />
        </button>

        {/* Present */}
        <button
          onClick={onPresent}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title="Presentation Mode"
        >
          <Play size={14} />
        </button>

        {/* Export Document */}
        <button
          onClick={onExportDocument}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title="Export as Document (Cmd+E)"
        >
          <FileDown size={14} />
        </button>

        {/* Export PDF */}
        <button
          onClick={onExportPdf}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title="Export as PDF"
        >
          <Printer size={14} />
        </button>

        {/* Export Chat */}
        <button
          onClick={onExportChat}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title="Export Chat"
        >
          <Download size={14} />
        </button>

        {/* Clear */}
        <button
          onClick={onClearCanvas}
          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-canvas-hover rounded-lg transition-colors"
          title="Clear Canvas"
        >
          <Trash2 size={14} />
        </button>

        <div className="w-px h-5 bg-canvas-border mx-0.5" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Help */}
        <button
          onClick={onReplayTour}
          className="p-1.5 text-gray-400 hover:text-accent hover:bg-canvas-hover rounded-lg transition-colors"
          title="Replay Tour"
        >
          <HelpCircle size={14} />
        </button>
      </div>
    </div>
  );
}

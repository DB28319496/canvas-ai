import React, { useState, useRef, useEffect } from 'react';
import {
  Type, Image, FileText, Youtube, Mic, Globe, LayoutGrid, Code2, StickyNote,
  ZoomIn, ZoomOut, Trash2, Download, Save, Clock, Wand2, AppWindow,
  Sparkles, Palette, HelpCircle,
  Undo2, Redo2, Search, FileDown, Sun, Moon, Printer, Play, MoreHorizontal, Maximize2
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
  onPresent,
  onFitView,
  chatOpen,
  chatSidebarWidth
}) {
  const { theme, toggleTheme } = useTheme();
  const [showMore, setShowMore] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const moreRef = useRef(null);

  // Close "More" menu on outside click
  useEffect(() => {
    if (!showMore) return;
    const handleClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setShowMore(false);
        setShowLayoutMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMore]);

  const moreItem = (icon, label, onClick, extra) => (
    <button
      onClick={() => { onClick?.(); if (!extra?.keepOpen) { setShowMore(false); setShowLayoutMenu(false); } }}
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors ${
        extra?.active
          ? 'text-accent bg-accent/10 hover:bg-accent/20'
          : extra?.danger
            ? 'text-gray-400 hover:text-red-400 hover:bg-canvas-hover'
            : 'text-gray-400 hover:text-white hover:bg-canvas-hover'
      }`}
    >
      {icon}
      <span>{label}</span>
      {extra?.badge && <span className="w-1.5 h-1.5 rounded-full bg-accent ml-auto" />}
    </button>
  );

  return (
    <div
      className="absolute top-0 left-0 z-30 flex items-center justify-between px-4 py-2 bg-canvas-panel/90 backdrop-blur-md border-b border-canvas-border"
      style={{ right: chatOpen ? `${chatSidebarWidth}px` : '0' }}
    >
      {/* Left: Logo and project name */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-canvas-hover transition-colors"
          title="Back to Dashboard"
        >
          <Sparkles size={20} className="text-accent" />
          <span className="text-sm font-semibold text-white hidden xl:inline">Canvas AI</span>
        </button>

        <div className="w-px h-6 bg-canvas-border" />

        <input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          className="text-sm text-gray-300 bg-transparent border-none outline-none hover:text-white focus:text-white transition-colors w-[120px]"
          placeholder="Untitled Project"
        />
      </div>

      {/* Center: Node type buttons */}
      <div data-tour="toolbar-nodes" className="flex items-center gap-1 px-2 py-1 bg-canvas-bg/60 rounded-xl border border-canvas-border min-w-0 overflow-x-auto scrollbar-hide">
        {nodeButtons.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => onAddNode(type)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-all text-xs flex-shrink-0"
            title={`Add ${label} Node`}
          >
            <Icon size={14} className={color} />
            <span className="hidden xl:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Right: Primary actions + More menu */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* Undo/Redo/Search/Zoom */}
        <div data-tour="toolbar-actions" className="flex items-center gap-0.5">
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
        <button
          onClick={onFitView}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-canvas-hover rounded-lg transition-colors"
          title="Fit All Nodes"
        >
          <Maximize2 size={14} />
        </button>

        </div>

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

        <div className="w-px h-5 bg-canvas-border mx-0.5" />

        {/* More menu */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => { setShowMore(!showMore); setShowLayoutMenu(false); }}
            data-tour="more-menu"
            className={`p-1.5 rounded-lg transition-colors ${
              showMore ? 'text-white bg-canvas-hover' : 'text-gray-400 hover:text-white hover:bg-canvas-hover'
            }`}
            title="More actions"
          >
            <MoreHorizontal size={14} />
          </button>

          {showMore && (
            <div className="absolute right-0 top-full mt-1 bg-canvas-panel border border-canvas-border rounded-lg shadow-xl overflow-hidden z-50 min-w-[180px]">
              {/* Auto Layout with sub-menu */}
              <div className="relative">
                <button
                  onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-canvas-hover transition-colors"
                >
                  <Wand2 size={13} />
                  <span>Auto Layout</span>
                  <span className="ml-auto text-[10px] text-gray-600">&rsaquo;</span>
                </button>
                {showLayoutMenu && (
                  <div className="absolute right-full top-0 mr-1 bg-canvas-panel border border-canvas-border rounded-lg shadow-xl overflow-hidden z-50 min-w-[130px]">
                    {[
                      { id: 'grid', label: 'Grid', desc: 'Even grid' },
                      { id: 'tree', label: 'Tree', desc: 'Hierarchy' },
                      { id: 'radial', label: 'Mind Map', desc: 'Radial' }
                    ].map(layout => (
                      <button
                        key={layout.id}
                        onClick={() => { onAutoLayout?.(layout.id); setShowMore(false); setShowLayoutMenu(false); }}
                        className="flex items-center justify-between gap-3 w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-canvas-hover transition-colors"
                      >
                        <span className="font-medium">{layout.label}</span>
                        <span className="text-[10px] text-gray-600">{layout.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-canvas-border" />

              {/* Voice & Tone */}
              {moreItem(
                <Palette size={13} />,
                voiceToneActive ? 'Voice & Tone (Active)' : 'Voice & Tone',
                onOpenVoiceTone,
                { active: voiceToneActive, badge: voiceToneActive }
              )}

              {/* Version History */}
              {moreItem(<Clock size={13} />, 'Version History', onOpenHistory)}

              {/* Present */}
              {moreItem(<Play size={13} />, 'Presentation Mode', onPresent)}

              <div className="h-px bg-canvas-border" />

              {/* Exports */}
              {moreItem(<FileDown size={13} />, 'Export Document', onExportDocument)}
              {moreItem(<Printer size={13} />, 'Export PDF', onExportPdf)}
              {moreItem(<Download size={13} />, 'Export Chat', onExportChat)}

              <div className="h-px bg-canvas-border" />

              {/* Theme */}
              {moreItem(
                theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />,
                theme === 'dark' ? 'Light Mode' : 'Dark Mode',
                toggleTheme
              )}

              {/* Help */}
              {moreItem(<HelpCircle size={13} />, 'Replay Tour', onReplayTour)}

              <div className="h-px bg-canvas-border" />

              {/* Clear Canvas */}
              {moreItem(<Trash2 size={13} />, 'Clear Canvas', onClearCanvas, { danger: true })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Trash2, FolderOpen, Loader2, Clock, Layers, Sun, Moon, BookOpen, Video, FileText, Mic as MicIcon } from 'lucide-react';
import { listProjects, deleteProject } from '../../utils/api.js';
import { useTheme } from '../../context/ThemeContext.jsx';

const canvasTemplates = [
  {
    id: 'blank',
    label: 'Blank Canvas',
    desc: 'Start from scratch',
    icon: Plus,
    color: 'text-accent',
    template: null
  },
  {
    id: 'research',
    label: 'Research Project',
    desc: 'PDF + Text notes + AI chat',
    icon: BookOpen,
    color: 'text-blue-400',
    template: {
      name: 'Research Project',
      nodes: [
        { id: 'n1', type: 'text', position: { x: 50, y: 100 }, data: { label: 'Research Notes', content: '' }, dragHandle: '.drag-handle' },
        { id: 'n2', type: 'pdf', position: { x: 420, y: 100 }, data: { label: 'Source PDF' }, dragHandle: '.drag-handle' },
        { id: 'n3', type: 'text', position: { x: 230, y: 400 }, data: { label: 'Key Findings', content: '' }, dragHandle: '.drag-handle' }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n3', animated: true, style: { stroke: '#6366f1' } },
        { id: 'e2', source: 'n2', target: 'n3', animated: true, style: { stroke: '#6366f1' } }
      ]
    }
  },
  {
    id: 'content',
    label: 'Content Creation',
    desc: 'YouTube research + Script writing',
    icon: Video,
    color: 'text-red-400',
    template: {
      name: 'Content Creation',
      nodes: [
        { id: 'n1', type: 'youtube', position: { x: 50, y: 100 }, data: { label: 'Reference Video 1' }, dragHandle: '.drag-handle' },
        { id: 'n2', type: 'youtube', position: { x: 420, y: 100 }, data: { label: 'Reference Video 2' }, dragHandle: '.drag-handle' },
        { id: 'n3', type: 'text', position: { x: 230, y: 450 }, data: { label: 'My Script Draft', content: '' }, dragHandle: '.drag-handle' }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n3', animated: true, style: { stroke: '#6366f1' } },
        { id: 'e2', source: 'n2', target: 'n3', animated: true, style: { stroke: '#6366f1' } }
      ]
    }
  },
  {
    id: 'study',
    label: 'Study Session',
    desc: 'Notes + Voice recordings + PDFs',
    icon: FileText,
    color: 'text-green-400',
    template: {
      name: 'Study Session',
      nodes: [
        { id: 'n1', type: 'pdf', position: { x: 50, y: 100 }, data: { label: 'Lecture Slides' }, dragHandle: '.drag-handle' },
        { id: 'n2', type: 'voice', position: { x: 420, y: 100 }, data: { label: 'Lecture Recording' }, dragHandle: '.drag-handle' },
        { id: 'n3', type: 'text', position: { x: 50, y: 400 }, data: { label: 'Study Notes', content: '' }, dragHandle: '.drag-handle' },
        { id: 'n4', type: 'text', position: { x: 420, y: 400 }, data: { label: 'Practice Questions', content: '' }, dragHandle: '.drag-handle' }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n3', animated: true, style: { stroke: '#6366f1' } },
        { id: 'e2', source: 'n2', target: 'n3', animated: true, style: { stroke: '#6366f1' } }
      ]
    }
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    desc: 'Multiple text nodes for ideation',
    icon: MicIcon,
    color: 'text-purple-400',
    template: {
      name: 'Brainstorm',
      nodes: [
        { id: 'n1', type: 'text', position: { x: 230, y: 50 }, data: { label: 'Central Idea', content: '' }, dragHandle: '.drag-handle' },
        { id: 'n2', type: 'text', position: { x: 0, y: 300 }, data: { label: 'Idea 1', content: '' }, dragHandle: '.drag-handle' },
        { id: 'n3', type: 'text', position: { x: 230, y: 350 }, data: { label: 'Idea 2', content: '' }, dragHandle: '.drag-handle' },
        { id: 'n4', type: 'text', position: { x: 460, y: 300 }, data: { label: 'Idea 3', content: '' }, dragHandle: '.drag-handle' }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', animated: true, style: { stroke: '#6366f1' } },
        { id: 'e2', source: 'n1', target: 'n3', animated: true, style: { stroke: '#6366f1' } },
        { id: 'e3', source: 'n1', target: 'n4', animated: true, style: { stroke: '#6366f1' } }
      ]
    }
  }
];

export default function Dashboard({ onNewProject, onLoadProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await listProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  };

  return (
    <div className="h-full bg-canvas-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-canvas-border">
        <div className="flex items-center gap-3">
          <Sparkles size={28} className="text-accent" />
          <div>
            <h1 className="text-xl font-bold text-white">Canvas AI</h1>
            <p className="text-xs text-gray-500">Your AI-powered visual workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-400 hover:text-white bg-canvas-panel border border-canvas-border rounded-lg transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors"
          >
            <Plus size={16} />
            New Canvas
          </button>
        </div>
      </div>

      {/* Template picker */}
      {showTemplates && (
        <div className="px-8 py-4 border-b border-canvas-border bg-canvas-panel/50">
          <div className="text-xs text-gray-500 font-medium mb-3">Choose a template:</div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {canvasTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  onNewProject(t.template);
                  setShowTemplates(false);
                }}
                className="flex-shrink-0 w-[160px] p-3 bg-canvas-bg border border-canvas-border rounded-xl hover:border-accent/50 hover:shadow-lg transition-all text-left group"
              >
                <t.icon size={20} className={`${t.color} mb-2`} />
                <div className="text-xs font-medium text-white group-hover:text-accent-hover">{t.label}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={24} className="text-accent animate-spin mb-3" />
            <span className="text-sm text-gray-500">Loading projects...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm text-red-400 mb-2">{error}</p>
            <button onClick={fetchProjects} className="text-xs text-accent hover:underline">
              Try again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-canvas-panel border border-canvas-border flex items-center justify-center mb-4">
              <FolderOpen size={24} className="text-gray-600" />
            </div>
            <h3 className="text-base font-medium text-gray-400 mb-1">No projects yet</h3>
            <p className="text-xs text-gray-600 mb-6">Create your first canvas to get started</p>
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors"
            >
              <Plus size={16} />
              New Canvas
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-medium text-gray-400 mb-4">Your Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => onLoadProject(project.id)}
                  className="group bg-canvas-panel border border-canvas-border rounded-xl p-4 cursor-pointer hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-medium text-white group-hover:text-accent-hover transition-colors truncate pr-2">
                      {project.name}
                    </h3>
                    <button
                      onClick={(e) => handleDelete(e, project.id)}
                      className="p-1 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Layers size={12} />
                      {project.nodeCount} nodes
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(project.updatedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

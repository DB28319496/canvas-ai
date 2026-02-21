import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Trash2, FolderOpen, Loader2, Clock, Layers, Sun, Moon, BookOpen, Video, FileText, Mic as MicIcon, LogOut, Copy, Tag, Save, X } from 'lucide-react';
import { listProjects, deleteProject, duplicateProject, saveProject, loadProject } from '../../utils/api.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

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

const PROJECT_COLORS = [
  { id: 'none', label: 'None', bg: 'transparent', border: 'border-canvas-border', dot: 'bg-gray-600' },
  { id: 'red', label: 'Red', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  { id: 'yellow', label: 'Yellow', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  { id: 'green', label: 'Green', bg: 'bg-green-500/10', border: 'border-green-500/30', dot: 'bg-green-500' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500/10', border: 'border-purple-500/30', dot: 'bg-purple-500' },
  { id: 'pink', label: 'Pink', bg: 'bg-pink-500/10', border: 'border-pink-500/30', dot: 'bg-pink-500' },
];

function getProjectColors() {
  try { return JSON.parse(localStorage.getItem('canvasai-project-colors') || '{}'); } catch { return {}; }
}
function setProjectColor(projectId, colorId) {
  const colors = getProjectColors();
  if (colorId === 'none') delete colors[projectId]; else colors[projectId] = colorId;
  localStorage.setItem('canvasai-project-colors', JSON.stringify(colors));
}

function getCustomTemplates() {
  try { return JSON.parse(localStorage.getItem('canvasai-custom-templates') || '[]'); } catch { return []; }
}
function saveCustomTemplate(template) {
  const templates = getCustomTemplates();
  templates.push(template);
  localStorage.setItem('canvasai-custom-templates', JSON.stringify(templates));
}
function deleteCustomTemplate(id) {
  const templates = getCustomTemplates().filter(t => t.id !== id);
  localStorage.setItem('canvasai-custom-templates', JSON.stringify(templates));
}

export default function Dashboard({ onNewProject, onLoadProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState(null);
  const [projectColors, setProjectColors] = useState(getProjectColors);
  const [customTemplates, setCustomTemplates] = useState(getCustomTemplates);
  const [saveAsTemplateFor, setSaveAsTemplateFor] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

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

  const handleDuplicate = async (e, id) => {
    e.stopPropagation();
    try {
      const result = await duplicateProject(id);
      await fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleColorChange = (e, projectId, colorId) => {
    e.stopPropagation();
    setProjectColor(projectId, colorId);
    setProjectColors(getProjectColors());
    setColorPickerFor(null);
  };

  const handleSaveAsTemplate = async (e, projectId) => {
    e.stopPropagation();
    setSaveAsTemplateFor(projectId);
    const project = projects.find(p => p.id === projectId);
    setTemplateName(project?.name || 'My Template');
  };

  const confirmSaveAsTemplate = async () => {
    if (!saveAsTemplateFor || !templateName.trim()) return;
    try {
      const project = await loadProject(saveAsTemplateFor);
      const template = {
        id: `custom-${Date.now()}`,
        label: templateName.trim(),
        desc: `${project.nodes?.length || 0} nodes`,
        icon: 'Layers',
        color: 'text-accent',
        custom: true,
        template: {
          name: templateName.trim(),
          nodes: (project.nodes || []).map(n => ({
            ...n,
            data: { ...n.data, content: n.data?.content || '', label: n.data?.label || '' }
          })),
          edges: project.edges || []
        }
      };
      saveCustomTemplate(template);
      setCustomTemplates(getCustomTemplates());
      setSaveAsTemplateFor(null);
      setTemplateName('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTemplate = (e, id) => {
    e.stopPropagation();
    deleteCustomTemplate(id);
    setCustomTemplates(getCustomTemplates());
  };

  const getColorForProject = (projectId) => {
    const colorId = projectColors[projectId];
    return PROJECT_COLORS.find(c => c.id === colorId) || PROJECT_COLORS[0];
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
          {user && (
            <span className="text-xs text-gray-500 hidden sm:inline">{user.email}</span>
          )}
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-400 hover:text-white bg-canvas-panel border border-canvas-border rounded-lg transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={signOut}
            className="p-2 text-gray-400 hover:text-red-400 bg-canvas-panel border border-canvas-border rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
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
            {customTemplates.map(t => (
              <div
                key={t.id}
                className="flex-shrink-0 w-[160px] p-3 bg-canvas-bg border border-canvas-border rounded-xl hover:border-accent/50 hover:shadow-lg transition-all text-left group relative"
              >
                <button
                  onClick={() => {
                    onNewProject(t.template);
                    setShowTemplates(false);
                  }}
                  className="w-full text-left"
                >
                  <Layers size={20} className="text-accent mb-2" />
                  <div className="text-xs font-medium text-white group-hover:text-accent-hover truncate">{t.label}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">{t.desc}</div>
                </button>
                <button
                  onClick={(e) => handleDeleteTemplate(e, t.id)}
                  className="absolute top-2 right-2 p-0.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete template"
                >
                  <X size={12} />
                </button>
              </div>
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
              {projects.map(project => {
                const color = getColorForProject(project.id);
                return (
                <div
                  key={project.id}
                  onClick={() => onLoadProject(project.id)}
                  className={`group bg-canvas-panel border rounded-xl p-4 cursor-pointer hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all ${color.id !== 'none' ? color.border : 'border-canvas-border'}`}
                >
                  {/* Color bar */}
                  {color.id !== 'none' && (
                    <div className={`h-1 ${color.dot} rounded-full mb-3 -mt-1`} />
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-medium text-white group-hover:text-accent-hover transition-colors truncate pr-2">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Color tag */}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setColorPickerFor(colorPickerFor === project.id ? null : project.id); }}
                          className="p-1 text-gray-600 hover:text-gray-300 transition-colors"
                          title="Color tag"
                        >
                          <Tag size={13} />
                        </button>
                        {colorPickerFor === project.id && (
                          <div
                            className="absolute right-0 top-full mt-1 bg-canvas-panel border border-canvas-border rounded-lg shadow-xl p-2 z-50 flex gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {PROJECT_COLORS.map(c => (
                              <button
                                key={c.id}
                                onClick={(e) => handleColorChange(e, project.id, c.id)}
                                className={`w-5 h-5 rounded-full ${c.dot} border-2 transition-transform hover:scale-125 ${
                                  (projectColors[project.id] || 'none') === c.id ? 'border-white scale-125' : 'border-transparent'
                                }`}
                                title={c.label}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Save as template */}
                      <button
                        onClick={(e) => handleSaveAsTemplate(e, project.id)}
                        className="p-1 text-gray-600 hover:text-gray-300 transition-colors"
                        title="Save as template"
                      >
                        <Save size={13} />
                      </button>
                      {/* Duplicate */}
                      <button
                        onClick={(e) => handleDuplicate(e, project.id)}
                        className="p-1 text-gray-600 hover:text-gray-300 transition-colors"
                        title="Duplicate project"
                      >
                        <Copy size={13} />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
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
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Save as Template modal */}
      {saveAsTemplateFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSaveAsTemplateFor(null)}>
          <div className="bg-canvas-panel border border-canvas-border rounded-2xl p-6 w-[360px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-1">Save as Template</h3>
            <p className="text-xs text-gray-500 mb-4">This project will be available as a template when creating new canvases.</p>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 text-sm text-white bg-canvas-bg border border-canvas-border rounded-lg outline-none focus:border-accent transition-colors mb-4"
              placeholder="Template name..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && confirmSaveAsTemplate()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSaveAsTemplateFor(null)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveAsTemplate}
                className="px-4 py-1.5 text-xs text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

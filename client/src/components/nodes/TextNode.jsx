import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { Type, X, GripVertical, ChevronDown, ChevronUp, Bold, Italic, Heading2, List, Code, Sparkles } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

function MiniToolbar({ editor }) {
  if (!editor) return null;

  const btn = (active, onClick, children) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1 rounded transition-colors ${
        active ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-gray-100">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold size={12} />)}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic size={12} />)}
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 size={12} />)}
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List size={12} />)}
      {btn(editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), <Code size={12} />)}
    </div>
  );
}

export default function TextNode({ id, data }) {
  const [collapsed, setCollapsed] = useState(false);
  const suppressUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Type your notes here...' }),
    ],
    content: data.content || '',
    onUpdate: ({ editor }) => {
      if (suppressUpdate.current) return;
      data.onChange?.(id, { content: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor outline-none min-h-[100px] text-sm text-gray-800 leading-relaxed px-3 py-2',
      },
    },
  });

  // Sync external content changes (e.g. undo/redo) without triggering onUpdate
  useEffect(() => {
    if (editor && data.content !== undefined && data.content !== editor.getHTML()) {
      suppressUpdate.current = true;
      editor.commands.setContent(data.content || '', false);
      suppressUpdate.current = false;
    }
  }, [data.content, editor]);

  const handleLabelChange = useCallback((e) => {
    data.onChange?.(id, { label: e.target.value });
  }, [id, data]);

  return (
    <div className="canvas-node bg-white rounded-xl shadow-lg border border-gray-200 w-full h-full overflow-hidden flex flex-col">
      <NodeResizer minWidth={200} minHeight={150} />
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 drag-handle cursor-grab">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-400" />
          <Type size={14} className="text-indigo-500" />
          <input
            value={data.label || 'Text Note'}
            onChange={handleLabelChange}
            className="text-xs font-medium text-gray-700 bg-transparent border-none outline-none w-[150px]"
            placeholder="Label..."
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => data.onAiAction?.(id, editor?.getText() || data.content || '', data.label || 'Text Note', e)}
            data-tour="ai-sparkles"
            className="text-gray-400 hover:text-accent transition-colors"
            title="AI Actions"
          >
            <Sparkles size={13} />
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
        <div className="flex-1 overflow-auto">
          <MiniToolbar editor={editor} />
          <EditorContent editor={editor} />
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}

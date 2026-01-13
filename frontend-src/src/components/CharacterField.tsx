import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useEffect } from 'react';
import { Maximize2, Minimize2, Save, Bold, Italic, List, ListOrdered, Heading1, Heading2 } from 'lucide-react';
import './CharacterField.css';

interface CharacterFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'short' | 'medium' | 'long' | 'editor';
  placeholder?: string;
  rows?: number;
}

export function CharacterField({
  label,
  value,
  onChange,
  type = 'short',
  placeholder = '',
  rows = 3
}: CharacterFieldProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Start typing...'
      })
    ],
    content: tempValue || '<p></p>',
    onUpdate: ({ editor }) => {
      setTempValue(editor.getHTML());
    },
    editable: true,
  });

  useEffect(() => {
    if (editor && isExpanded) {
      // Convert plain text to HTML if needed
      const content = value || '<p></p>';
      if (content !== editor.getHTML()) {
        editor.commands.setContent(content);
      }
      setTempValue(content);
    }
  }, [isExpanded, editor]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleSave = () => {
    onChange(tempValue);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setTempValue(value || '');
    setIsExpanded(false);
  };

  const baseInputStyle = {
    backgroundColor: '#37322E',
    color: 'white',
    border: '1px solid #6C6A68'
  };

  // Strip HTML tags for display in textarea
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  };

  if (type === 'short') {
    return (
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
          {label}
        </label>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 rounded-lg"
          style={baseInputStyle}
          placeholder={placeholder}
        />
      </div>
    );
  }

  // For medium, long, and editor types - show expandable editor
  const displayRows = type === 'long' ? 6 : rows;

  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
        {label}
      </label>
      
      {/* Compact view - textarea */}
      {!isExpanded && (
        <div className="relative">
          <textarea
            value={stripHtml(value)}
            readOnly
            onClick={handleExpand}
            rows={displayRows}
            className="w-full px-4 py-2 rounded-lg cursor-pointer"
            style={baseInputStyle}
            placeholder={placeholder || 'Click to open rich text editor...'}
          />
          <button
            onClick={handleExpand}
            className="absolute top-2 right-2 p-1 rounded hover:bg-opacity-20 hover:bg-white"
            style={{ color: '#B3B2B0' }}
            title="Expand rich text editor"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      )}

      {/* Expanded view - rich text editor */}
      {isExpanded && editor && (
        <div className="space-y-2">
          {/* Toolbar */}
          <div 
            className="flex gap-1 p-2 rounded-lg flex-wrap"
            style={{ 
              backgroundColor: '#2A2724', 
              border: '1px solid #6C6A68'
            }}
          >
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded ${editor.isActive('bold') ? 'bg-opacity-30' : ''}`}
              style={{ 
                backgroundColor: editor.isActive('bold') ? '#D4AF37' : 'transparent',
                color: editor.isActive('bold') ? '#1A1918' : '#D4AF37',
                border: '1px solid #D4AF37'
              }}
              title="Bold (Ctrl+B)"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded ${editor.isActive('italic') ? 'bg-opacity-30' : ''}`}
              style={{ 
                backgroundColor: editor.isActive('italic') ? '#D4AF37' : 'transparent',
                color: editor.isActive('italic') ? '#1A1918' : '#D4AF37',
                border: '1px solid #D4AF37'
              }}
              title="Italic (Ctrl+I)"
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-2 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-opacity-30' : ''}`}
              style={{ 
                backgroundColor: editor.isActive('heading', { level: 1 }) ? '#D4AF37' : 'transparent',
                color: editor.isActive('heading', { level: 1 }) ? '#1A1918' : '#D4AF37',
                border: '1px solid #D4AF37'
              }}
              title="Heading 1"
            >
              <Heading1 size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-2 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-opacity-30' : ''}`}
              style={{ 
                backgroundColor: editor.isActive('heading', { level: 2 }) ? '#D4AF37' : 'transparent',
                color: editor.isActive('heading', { level: 2 }) ? '#1A1918' : '#D4AF37',
                border: '1px solid #D4AF37'
              }}
              title="Heading 2"
            >
              <Heading2 size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded ${editor.isActive('bulletList') ? 'bg-opacity-30' : ''}`}
              style={{ 
                backgroundColor: editor.isActive('bulletList') ? '#D4AF37' : 'transparent',
                color: editor.isActive('bulletList') ? '#1A1918' : '#D4AF37',
                border: '1px solid #D4AF37'
              }}
              title="Bullet List"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded ${editor.isActive('orderedList') ? 'bg-opacity-30' : ''}`}
              style={{ 
                backgroundColor: editor.isActive('orderedList') ? '#D4AF37' : 'transparent',
                color: editor.isActive('orderedList') ? '#1A1918' : '#D4AF37',
                border: '1px solid #D4AF37'
              }}
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </button>
          </div>

          {/* Editor */}
          <div 
            className="character-editor-wrapper rounded-lg"
            style={{ 
              backgroundColor: '#37322E', 
              border: '1px solid #6C6A68',
              minHeight: '200px',
              padding: '12px'
            }}
          >
            <EditorContent editor={editor} />
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg flex items-center gap-2"
              style={{ 
                backgroundColor: '#37322E', 
                color: '#B3B2B0',
                border: '1px solid #6C6A68'
              }}
            >
              <Minimize2 size={16} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg flex items-center gap-2"
              style={{ 
                backgroundColor: '#D4AF37', 
                color: '#1A1918',
                fontWeight: 'bold'
              }}
            >
              <Save size={16} />
              Save
            </button>
          </div>
          
          <p className="text-xs" style={{ color: '#6C6A68' }}>
            Rich text editor - Use toolbar buttons or keyboard shortcuts (Ctrl+B for bold, Ctrl+I for italic)
          </p>
        </div>
      )}
    </div>
  );
}

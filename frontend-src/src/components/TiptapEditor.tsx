import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Focus from '@tiptap/extension-focus';
import Gapcursor from '@tiptap/extension-gapcursor';
import Dropcursor from '@tiptap/extension-dropcursor';
import { useState, useEffect } from 'react';
import './TiptapEditor.css';

interface TiptapEditorProps {
  content?: any; // TipTap JSON content
  onContentChange?: (content: any) => void;
  onSave?: () => Promise<void>;
  autoSave?: boolean;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  showToolbar?: boolean;
  showStats?: boolean;
}

export function TiptapEditor({
  content,
  onContentChange,
  onSave,
  autoSave = true,
  placeholder = 'Start writing...',
  editable = true,
  className = '',
  showToolbar = true,
  showStats = true
}: TiptapEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder
      }),
      CharacterCount,
      Typography,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-700 underline cursor-pointer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Subscript,
      Superscript,
      TextStyle,
      Color,
      FontFamily,
      Focus.configure({
        className: 'has-focus',
        mode: 'all',
      }),
      Gapcursor,
      Dropcursor,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onContentChange?.(json);

      // Auto-save after 2 seconds of inactivity
      if (autoSave && onSave) {
        if (saveTimeout) clearTimeout(saveTimeout);
        setSaveTimeout(setTimeout(async () => {
          setIsSaving(true);
          try {
            await onSave();
            setLastSaved(new Date());
          } catch (error) {
            console.error('Auto-save failed:', error);
          } finally {
            setIsSaving(false);
          }
        }, 2000));
      }
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [saveTimeout]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  const handleManualSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave();
      setLastSaved(new Date());
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`tiptap-editor-container ${className}`}>
      {showToolbar && (
        <div className="tiptap-toolbar">
          <div className="toolbar-group">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'is-active' : ''}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'is-active' : ''}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={editor.isActive('underline') ? 'is-active' : ''}
              title="Underline"
            >
              <u>U</u>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={editor.isActive('strike') ? 'is-active' : ''}
              title="Strikethrough"
            >
              <s>S</s>
            </button>
          </div>

          <div className="toolbar-group">
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
              title="Heading 1"
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
              title="Heading 2"
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
              title="Heading 3"
            >
              H3
            </button>
          </div>

          <div className="toolbar-group">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'is-active' : ''}
              title="Bullet List"
            >
              • List
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'is-active' : ''}
              title="Numbered List"
            >
              1. List
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={editor.isActive('taskList') ? 'is-active' : ''}
              title="Task List"
            >
              ☑ Tasks
            </button>
          </div>

          <div className="toolbar-group">
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={editor.isActive('blockquote') ? 'is-active' : ''}
              title="Quote"
            >
              " Quote
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={editor.isActive('codeBlock') ? 'is-active' : ''}
              title="Code Block"
            >
              {'<> Code'}
            </button>
          </div>

          <div className="toolbar-group">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              ↶ Undo
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              ↷ Redo
            </button>
          </div>

          {onSave && (
            <div className="toolbar-group ml-auto">
              <button
                onClick={handleManualSave}
                disabled={isSaving}
                className="save-button"
                title="Save"
              >
                {isSaving ? '💾 Saving...' : '💾 Save'}
              </button>
            </div>
          )}
        </div>
      )}

      <EditorContent editor={editor} className="tiptap-content" />

      {showStats && (
        <div className="tiptap-stats">
          <span>{editor.storage.characterCount.characters()} characters</span>
          <span>{editor.storage.characterCount.words()} words</span>
          {lastSaved && (
            <span className="text-green-600">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {isSaving && <span className="text-blue-600">Saving...</span>}
        </div>
      )}
    </div>
  );
}

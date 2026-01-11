import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TiptapEditor } from '../components/TiptapEditor';

export function DocumentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('Untitled Document');
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id]);

  const fetchDocument = async () => {
    if (!id) return;
    
    try {
      const response = await fetch(`/api/documents/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch document');
      const data = await response.json();
      setTitle(data.name);
      
      // Try to parse content as JSON (TipTap format)
      try {
        const parsed = JSON.parse(data.content);
        setContent(parsed);
      } catch {
        // If not JSON, use as plain text
        setContent(data.content);
      }
    } catch (err) {
      console.error('Error fetching document:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const contentString = typeof content === 'string' ? content : JSON.stringify(content);
      
      if (id) {
        // Update existing document
        const response = await fetch(`/api/documents/${id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: title,
            content: contentString,
          }),
        });
        
        if (!response.ok) throw new Error('Failed to save document');
      } else {
        // Create new document
        const response = await fetch('/api/documents', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: title,
            content: contentString,
            isFolder: false,
          }),
        });
        
        if (!response.ok) throw new Error('Failed to create document');
        const newDoc = await response.json();
        navigate(`/documents/${newDoc.id}`);
      }
    } catch (err) {
      console.error('Error saving document:', err);
      alert('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading document...</div>;

  return (
    <div className="document-editor-page">
      <div className="editor-header">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="document-title-input"
          placeholder="Document title..."
        />
        <div className="editor-actions">
          <button onClick={() => navigate('/documents')} className="btn-secondary">
            Back to Documents
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="editor-container">
        <TiptapEditor
          content={content}
          onContentChange={setContent}
          onSave={handleSave}
          autoSave={true}
          placeholder="Start writing..."
          showToolbar={true}
          showStats={true}
        />
      </div>
    </div>
  );
}

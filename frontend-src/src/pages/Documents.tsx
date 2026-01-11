import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Document {
  id: number;
  name: string;
  content: string;
  isFolder: boolean;
  createdAt: string;
  updatedAt: string;
}

export function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents', { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      setDocuments(data.filter((d: Document) => !d.isFolder));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading documents...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="documents-page">
      <div className="page-header">
        <h1>My Documents</h1>
        <Link to="/documents/new" className="btn-primary">
          + New Document
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <h2>No documents yet</h2>
          <p>Start writing your first document</p>
          <Link to="/documents/new" className="btn-primary">
            Create Document
          </Link>
        </div>
      ) : (
        <div className="documents-grid">
          {documents.map((doc) => (
            <Link key={doc.id} to={`/documents/${doc.id}`} className="document-card">
              <div className="document-icon">📄</div>
              <h3>{doc.name}</h3>
              <p className="document-preview">
                {doc.content?.substring(0, 100) || 'Empty document'}...
              </p>
              <div className="document-meta">
                <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

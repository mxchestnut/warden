# Studio Feature Implementation Guide

## Overview
The Studio feature is a writing workspace where users can create and organize character stories, notes, and creative writing in a nested folder structure using the TipTap rich text editor.

## Backend Implementation ✅ COMPLETE
- Created `/api/studio` routes in `backend/src/routes/studio.ts`
- Full CRUD operations for documents and folders
- Nested folder support with move/rename operations
- Integrated with existing `documents` table in database

### Available API Endpoints

#### GET `/api/studio`
- Fetches studio documents and folders
- Query params: `?parentId=123` (optional, for nested folders)
- Returns: Array of documents/folders

#### POST `/api/studio/folder`
- Creates a new folder
- Body: `{ name: string, parentId?: number }`
- Returns: Created folder object

#### POST `/api/studio/document`
- Creates a new document
- Body: `{ name: string, content?: string, parentId?: number }`
- Returns: Created document object

#### GET `/api/studio/document/:id`
- Fetches a single document
- Returns: Document object with content

#### PUT `/api/studio/document/:id`
- Updates document content or name
- Body: `{ name?: string, content?: string }`
- Returns: Updated document object

#### PATCH `/api/studio/:id/rename`
- Renames a document or folder
- Body: `{ name: string }`
- Returns: Updated object

#### PATCH `/api/studio/:id/move`
- Moves document/folder to different parent
- Body: `{ parentId: number | null }`
- Returns: Updated object

#### DELETE `/api/studio/:id`
- Deletes document or folder (recursively deletes folder contents)
- Returns: `{ success: true }`

## Frontend Implementation 🚧 REQUIRED

### 1. Create Studio Component

The frontend needs to be rebuilt with a Studio component. Since we only have compiled frontend files, here's what needs to be implemented:

#### Component Structure
```
src/
  components/
    Studio/
      Studio.tsx              # Main component
      StudioSidebar.tsx       # Folder tree navigation
      StudioEditor.tsx        # TipTap document editor
      FolderTree.tsx          # Nested folder display
      DocumentList.tsx        # Documents in current folder
```

#### Key Features

**Sidebar (Folder Tree)**
- Accordion-style collapsible folders
- Show nested folder hierarchy
- Click to navigate into folders
- Right-click context menu for:
  - Create folder
  - Create document
  - Rename
  - Delete
  - Move

**Document Editor**
- Use TipTap editor (already installed based on project structure)
- Auto-save on changes (debounced, every 2-3 seconds)
- Show save status indicator
- Document title edit inline

**UI Layout**
```
┌─────────────────────────────────────────┐
│  Studio                                 │
├──────────┬──────────────────────────────┤
│ Folders  │  [Document Title - editable] │
│          │                              │
│ 📁 Root  │  ┌──────────────────────┐    │
│  📁 Lore │  │ TipTap Editor         │    │
│  📄 Doc1 │  │                       │    │
│  📁 NPCs │  │ Rich text content...  │    │
│   📄 Doc2│  │                       │    │
│          │  └──────────────────────┘    │
│ + New    │  [Save status: Saved ✓]      │
└──────────┴──────────────────────────────┘
```

### 2. Add to Dashboard Navigation

Update the Dashboard component to include Studio in the navigation accordion:

```tsx
// In Dashboard.tsx sidebar
<div style={{ borderBottom: '1px solid var(--border-color)' }}>
  <div
    onClick={() => {
      setStudioExpanded(!studioExpanded);
      if (!studioExpanded) {
        onShowStudio();
      }
    }}
    style={{
      padding: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      background: studioExpanded ? 'var(--accent-1)' : 'transparent'
    }}
  >
    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {studioExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      <PenTool size={18} />
      Studio
    </h3>
  </div>
  {studioExpanded && (
    <div style={{ padding: '0.5rem 1rem' }}>
      <button onClick={() => onShowStudio()} style={linkStyle}>
        📝 My Documents
      </button>
    </div>
  )}
</div>
```

### 3. TipTap Editor Configuration

Use the existing TipTap setup (TiptapField component appears to exist):

```tsx
import { TiptapField } from './TiptapField';

// In StudioEditor.tsx
const [content, setContent] = useState(document.content || '');
const [saving, setSaving] = useState(false);
const [lastSaved, setLastSaved] = useState<Date | null>(null);

// Debounced auto-save
useEffect(() => {
  const timer = setTimeout(async () => {
    if (content !== document.content) {
      setSaving(true);
      try {
        await fetch(`/api/studio/document/${document.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          credentials: 'include',
          body: JSON.stringify({ content })
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error('Save failed:', error);
      } finally {
        setSaving(false);
      }
    }
  }, 2000); // 2 second debounce

  return () => clearTimeout(timer);
}, [content]);

return (
  <div>
    <TiptapField
      value={content}
      onChange={setContent}
      placeholder="Start writing..."
    />
    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
      {saving ? 'Saving...' : lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : ''}
    </div>
  </div>
);
```

### 4. Folder Operations

**Create Folder:**
```tsx
const createFolder = async (name: string, parentId: number | null) => {
  const response = await fetch('/api/studio/folder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({ name, parentId })
  });
  const folder = await response.json();
  // Update UI
};
```

**Navigate Folders:**
```tsx
const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: number | null; name: string }>>([
  { id: null, name: 'Root' }
]);

const navigateToFolder = (folderId: number | null, folderName: string) => {
  setCurrentFolderId(folderId);
  // Update breadcrumbs for navigation
};
```

### 5. File Manager Integration

Add a "Save to File Manager" button that:
1. Exports the TipTap content to PDF or HTML
2. Uploads via the existing `/api/files` endpoint
3. Shows success notification

```tsx
const saveToFileManager = async () => {
  // Convert TipTap HTML to blob
  const blob = new Blob([content], { type: 'text/html' });
  const formData = new FormData();
  formData.append('file', blob, `${documentName}.html`);
  formData.append('category', 'documents');

  await fetch('/api/files/upload', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    credentials: 'include',
    body: formData
  });
};
```

## Deployment Steps

1. **Rebuild Frontend** (source code needed)
   - Implement Studio components
   - Add to Dashboard navigation
   - Test locally

2. **Build & Deploy**
   ```bash
   npm run build
   aws s3 sync dist/ s3://warden.my
   aws cloudfront create-invalidation --distribution-id E2QUYD75WB2AL3 --paths "/*"
   ```

3. **Deploy Backend**
   ```bash
   cd backend
   npm run build
   ssh warden "cd warden-backend && git pull && cd backend && npm run build && pm2 restart warden-backend"
   ```

## Notes

- Backend is complete and deployed ✅
- Frontend source code is needed to implement UI components
- The compiled frontend files can't be edited directly
- All database schema is ready (uses existing `documents` table)
- TipTap editor dependencies appear to be installed

## Next Steps

Since the frontend source is lost, you have two options:

1. **Recover source from backup** (Time Machine, iCloud, etc.)
2. **Rebuild frontend from scratch** using Vite + React + TypeScript

Would you like me to scaffold a new frontend project with the Studio feature included?

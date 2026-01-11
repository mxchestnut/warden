export function Studio() {
  return (
    <div className="studio-page">
      <div className="page-header">
        <h1>📝 Writing Studio</h1>
        <p>Your creative workspace for collaborative writing</p>
      </div>

      <div className="studio-content">
        <div className="studio-welcome">
          <h2>Welcome to the Studio</h2>
          <p>
            The Writing Studio is your dedicated space for crafting stories, developing characters,
            and collaborating with other writers in your groups.
          </p>
        </div>

        <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
          <div className="feature-card">
            <h3>✍️ Rich Text Editor</h3>
            <p>Write with our powerful TipTap editor featuring formatting, tables, and collaborative editing.</p>
            <a href="/documents/new" className="btn-primary">Start Writing</a>
          </div>

          <div className="feature-card">
            <h3>👥 Collaborate</h3>
            <p>Share documents with group members and work together in real-time.</p>
            <a href="/groups" className="btn-primary">Find Groups</a>
          </div>

          <div className="feature-card">
            <h3>📚 Your Library</h3>
            <p>Access all your documents, drafts, and collaborative projects in one place.</p>
            <a href="/documents" className="btn-primary">View Library</a>
          </div>

          <div className="feature-card">
            <h3>🎭 Characters</h3>
            <p>Develop and manage your roleplay characters with detailed profiles and memories.</p>
            <a href="/characters" className="btn-primary">Manage Characters</a>
          </div>
        </div>
      </div>
    </div>
  );
}

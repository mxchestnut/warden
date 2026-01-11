export function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Welcome to Warden</h1>
        <p className="hero-subtitle">Your all-in-one platform for collaborative writing and roleplay</p>
        
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Writing Groups</h3>
            <p>Join or create groups for collaborative storytelling and roleplay</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Rich Text Editor</h3>
            <p>Professional writing tools with auto-save and version history</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎭</div>
            <h3>Character Management</h3>
            <p>Create and manage detailed character sheets with PathCompanion integration</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Comments & Feedback</h3>
            <p>Inline comments, threading, and reactions on documents</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>Discord Bot</h3>
            <p>Dice rolling, character proxying, and AI-powered knowledge base</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3>World Building</h3>
            <p>Lore system, prompts, and collaborative world building tools</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Get Started</h2>
        <p>Join thousands of writers and roleplayers on Warden</p>
        <div className="cta-buttons">
          <a href="/groups" className="btn-primary">Explore Groups</a>
          <a href="/documents/new" className="btn-secondary">Start Writing</a>
        </div>
      </section>
    </div>
  );
}

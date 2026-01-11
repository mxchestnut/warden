import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Home } from './pages/Home';
import { Groups } from './pages/Groups';
import { GroupPage } from './pages/GroupPage';
import { Documents } from './pages/Documents';
import { DocumentEditor } from './pages/DocumentEditor';
import { Characters } from './pages/Characters';
import { Login } from './pages/Login';
import { Studio } from './pages/Studio';
import './App.css';

function Navigation() {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/">
            <h1>⚔️ Warden</h1>
          </Link>
          <p className="tagline">Social Writing & Roleplay Platform</p>
        </div>

        <div className="nav-links">
          <Link to="/" className={isActive('/') && location.pathname === '/' ? 'active' : ''}>
            Home
          </Link>
          <Link to="/groups" className={isActive('/groups') ? 'active' : ''}>
            Groups
          </Link>
          <Link to="/studio" className={isActive('/studio') ? 'active' : ''}>
            Studio
          </Link>
          <Link to="/documents" className={isActive('/documents') ? 'active' : ''}>
            Documents
          </Link>
          <Link to="/characters" className={isActive('/characters') ? 'active' : ''}>
            Characters
          </Link>
        </div>

        <div className="nav-actions">
          {user ? (
            <div className="user-menu">
              <span className="user-name">👤 {user.username}</span>
              <button onClick={() => {
                fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                  .then(() => window.location.reload());
              }} className="btn-secondary">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:slug" element={<GroupPage />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/documents/:id" element={<DocumentEditor />} />
            <Route path="/documents/new" element={<DocumentEditor />} />
            <Route path="/characters" element={<Characters />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
        <footer className="main-footer">
          <p>© 2026 Warden - Social Writing & Roleplay Platform</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;

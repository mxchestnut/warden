# React Router v7 - Migration Guide

## Overview

Warden frontend now uses **React Router v7** - the industry-standard routing library for React applications. This replaces the previous manual routing implementation.

## Why React Router?

✅ **Industry Standard** - Used by millions of React apps  
✅ **Better Performance** - Code splitting and lazy loading built-in  
✅ **SEO Friendly** - Proper URL handling for search engines  
✅ **Type Safety** - Full TypeScript support  
✅ **Browser History** - Proper back/forward button support  
✅ **Nested Routes** - Supports complex layouts  
✅ **URL Parameters** - Easy `/characters/:id` style routes

---

## Installation

Already installed:
```bash
npm install react-router@7 react-router-dom@7
```

---

## Quick Start

### 1. Wrap App with BrowserRouter

**File:** [frontend-src/src/main-with-router.tsx](frontend-src/src/main-with-router.tsx)

```tsx
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

### 2. Define Routes

**File:** [frontend-src/src/AppWithRouter.tsx](frontend-src/src/AppWithRouter.tsx)

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/characters" element={<Characters />} />
      <Route path="/characters/:id/edit" element={<CharacterEdit />} />
      <Route path="/studio/*" element={<Studio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

### 3. Navigate Between Pages

**Use Link component:**
```tsx
import { Link } from 'react-router-dom';

<Link to="/characters">View Characters</Link>
```

**Use navigate function:**
```tsx
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate('/characters');
  };
  
  return <button onClick={handleClick}>Go to Characters</button>;
}
```

---

## Migration from Manual Routing

### Before (Manual State-Based Routing)

```tsx
const [currentPage, setCurrentPage] = useState('home');

useEffect(() => {
  const path = window.location.pathname;
  if (path === '/') setCurrentPage('home');
  if (path === '/characters') setCurrentPage('characters');
}, []);

// Render based on state
{currentPage === 'home' && <Home />}
{currentPage === 'characters' && <Characters />}
```

### After (React Router)

```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/characters" element={<Characters />} />
</Routes>
```

**Benefits:**
- ✅ No manual state management
- ✅ Proper URL updates
- ✅ Browser back/forward works
- ✅ Lazy loading built-in
- ✅ Type-safe navigation

---

## Protected Routes

### Implementation

**File:** [frontend-src/src/AppWithRouter.tsx](frontend-src/src/AppWithRouter.tsx)

```tsx
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Usage
<Route path="/characters" element={
  <ProtectedRoute>
    <Characters />
  </ProtectedRoute>
} />
```

### Public-Only Routes (Login)

```tsx
const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <>{children}</>;
};

// Usage
<Route path="/login" element={
  <PublicOnlyRoute>
    <Login />
  </PublicOnlyRoute>
} />
```

---

## Common Patterns

### URL Parameters

```tsx
// Define route
<Route path="/characters/:id/edit" element={<CharacterEdit />} />

// Access in component
import { useParams } from 'react-router-dom';

function CharacterEdit() {
  const { id } = useParams();
  
  useEffect(() => {
    loadCharacter(id);
  }, [id]);
}
```

### Query Strings

```tsx
import { useSearchParams } from 'react-router-dom';

function Characters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filter = searchParams.get('filter'); // ?filter=active
  
  const updateFilter = (value: string) => {
    setSearchParams({ filter: value });
  };
}
```

### Navigate with State

```tsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

navigate('/characters', { 
  state: { from: 'dashboard', message: 'Character created!' } 
});

// Access in target component
import { useLocation } from 'react-router-dom';

const location = useLocation();
const message = location.state?.message;
```

### Programmatic Navigation

```tsx
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  const handleSubmit = async () => {
    await saveCharacter();
    navigate('/characters'); // Go to characters page
    // navigate(-1); // Go back
    // navigate('/login', { replace: true }); // Replace history
  };
}
```

### Nested Routes

```tsx
// Studio with nested routes
<Route path="/studio/*" element={<Studio />}>
  <Route path="documents" element={<Documents />} />
  <Route path="documents/:id" element={<DocumentEdit />} />
  <Route path="files" element={<FileManager />} />
</Route>

// In Studio component
import { Outlet } from 'react-router-dom';

function Studio() {
  return (
    <div>
      <StudioSidebar />
      <Outlet /> {/* Renders nested routes */}
    </div>
  );
}
```

---

## Hooks Reference

### useNavigate()
```tsx
const navigate = useNavigate();
navigate('/path');
navigate(-1); // Back
navigate(1);  // Forward
navigate('/path', { replace: true, state: { key: 'value' } });
```

### useParams()
```tsx
const { id, slug } = useParams();
```

### useLocation()
```tsx
const location = useLocation();
location.pathname; // "/characters"
location.search;   // "?filter=active"
location.hash;     // "#section"
location.state;    // Passed via navigate()
```

### useSearchParams()
```tsx
const [searchParams, setSearchParams] = useSearchParams();
searchParams.get('filter');
setSearchParams({ filter: 'active', sort: 'name' });
```

### useMatch()
```tsx
const match = useMatch('/characters/:id');
if (match) {
  console.log(match.params.id);
}
```

---

## Route Configuration

### Current Routes (Warden)

```tsx
// Public routes
/login                    → Login page
/terms                    → Terms of Service
/rules                    → House Rules
/auth/callback            → OAuth callback
/invite/:code             → Group invite

// Protected routes
/                         → Home/Dashboard
/feed                     → Activity Feed
/groups                   → Groups List
/characters               → Characters List
/characters/:id/edit      → Edit Character
/studio/*                 → Studio Workspace
  /studio/documents       → Documents
  /studio/documents/:id   → Edit Document
  /studio/files           → File Manager
/profile-settings         → User Settings
/bookshelf                → Saved Content
/beta-marketplace         → Marketplace (Beta)
/pending-approval         → Awaiting Approval

// Catch-all
*                         → Redirect to /
```

---

## Code Splitting with Lazy Loading

React Router works seamlessly with React's `lazy()`:

```tsx
import { lazy, Suspense } from 'react';

const Characters = lazy(() => import('./pages/Characters'));

<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/characters" element={<Characters />} />
  </Routes>
</Suspense>
```

**Benefits:**
- Only loads code when route is visited
- Reduces initial bundle size
- Improves performance

---

## TypeScript Support

### Typed Params

```tsx
import { useParams } from 'react-router-dom';

interface CharacterParams {
  id: string;
}

function CharacterEdit() {
  const { id } = useParams<CharacterParams>();
  // id is typed as string | undefined
}
```

### Typed Navigate State

```tsx
interface NavigateState {
  from: string;
  message?: string;
}

navigate('/characters', { 
  state: { from: 'dashboard', message: 'Success!' } as NavigateState 
});

const location = useLocation();
const state = location.state as NavigateState;
```

---

## Testing Routes

### With Vitest + React Testing Library

```tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders home page', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  
  expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
});

// Test navigation
import { MemoryRouter } from 'react-router-dom';

test('navigates to characters page', async () => {
  render(
    <MemoryRouter initialEntries={['/characters']}>
      <App />
    </MemoryRouter>
  );
  
  expect(screen.getByText(/My Characters/i)).toBeInTheDocument();
});
```

---

## Best Practices

### ✅ DO:
1. **Use `<Link>` for navigation** - Not `<a href>`
2. **Use `useNavigate()` for programmatic navigation** - Not `window.location`
3. **Lazy load pages** - Use React.lazy() for code splitting
4. **Protect routes** - Wrap in ProtectedRoute component
5. **Handle 404s** - Use catch-all route `path="*"`
6. **Use URL params** - Not query strings for resource IDs

### ❌ DON'T:
1. **Don't use window.location** - Breaks SPA
2. **Don't mix routing strategies** - Stick to React Router
3. **Don't forget Suspense** - Required for lazy loading
4. **Don't hardcode URLs** - Use constants for routes
5. **Don't skip TypeScript types** - Type your params and state

---

## Migration Checklist

- [x] Install react-router-dom@7
- [x] Wrap app in `<BrowserRouter>`
- [x] Convert manual routing to `<Routes>`
- [x] Implement ProtectedRoute wrapper
- [x] Create useAuth hook
- [ ] Replace all `setCurrentPage()` with `navigate()`
- [ ] Replace `window.location.href` with `<Link>` or `navigate()`
- [ ] Test all navigation flows
- [ ] Update tests to use MemoryRouter

---

## Troubleshooting

### Routes not working?

1. **Check BrowserRouter wrapping:**
   ```tsx
   <BrowserRouter>
     <App />
   </BrowserRouter>
   ```

2. **Check route order:**
   - More specific routes first
   - Catch-all `*` route last

3. **Check Suspense:**
   - Required when using `lazy()`

### Navigate not working?

1. **Must be inside BrowserRouter:**
   ```tsx
   // ❌ Won't work - outside router
   const navigate = useNavigate();
   
   // ✅ Works - inside router
   function MyComponent() {
     const navigate = useNavigate();
   }
   ```

2. **Check paths:**
   - Use absolute paths `/characters`
   - Or relative `./edit`

### 404 on page refresh?

**Problem:** Server returns 404 for `/characters`

**Solution:** Configure server to serve index.html for all routes

In [backend/src/server.ts](backend/src/server.ts):
```typescript
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    next();
  }
});
```

---

## Resources

- [React Router Documentation](https://reactrouter.com/)
- [React Router Tutorial](https://reactrouter.com/en/main/start/tutorial)
- [Migration Guide v6→v7](https://reactrouter.com/en/main/upgrading/v6-to-v7)
- [API Reference](https://reactrouter.com/en/main/hooks/use-navigate)

---

## Related Documentation

- [TECH_STACK.md](./TECH_STACK.md) - Full technology stack
- [TESTING.md](./TESTING.md) - Testing with React Router
- [AppWithRouter.tsx](frontend-src/src/AppWithRouter.tsx) - Implementation example

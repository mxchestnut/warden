import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ToastContainer } from './components/Toast';
import { ChatManager } from './components/ChatManager';
import { ChatLauncher } from './components/ChatLauncher';
import { ChatBar } from './components/ChatBar';
import { useAuth } from './hooks/useAuth';
import './App.css';

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#37322E' }}>
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#B34B0C' }} />
      <p className="text-white">Loading...</p>
    </div>
  </div>
);

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Feed = lazy(() => import('./pages/Feed'));
const Groups = lazy(() => import('./pages/Groups'));
const Studio = lazy(() => import('./pages/Studio').then(module => ({ default: module.Studio })));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings').then(module => ({ default: module.ProfileSettings })));
const Bookshelf = lazy(() => import('./pages/Bookshelf'));
const Characters = lazy(() => import('./pages/Characters').then(module => ({ default: module.Characters })));
const CharacterEdit = lazy(() => import('./pages/CharacterEdit'));
const BetaMarketplace = lazy(() => import('./pages/BetaMarketplace'));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(module => ({ default: module.AuthCallback })));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const HouseRules = lazy(() => import('./pages/HouseRules'));
const Invite = lazy(() => import('./pages/Invite'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));

// Protected Route Component
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

// Public Only Route (redirect to home if already authenticated)
const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppWithRouter() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          } />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/rules" element={<HouseRules />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/invite/:code" element={<Invite />} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/feed" element={
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          } />
          <Route path="/groups" element={
            <ProtectedRoute>
              <Groups />
            </ProtectedRoute>
          } />
          <Route path="/studio/*" element={
            <ProtectedRoute>
              <Studio />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/profile-settings" element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } />
          <Route path="/bookshelf" element={
            <ProtectedRoute>
              <Bookshelf />
            </ProtectedRoute>
          } />
          <Route path="/characters" element={
            <ProtectedRoute>
              <Characters />
            </ProtectedRoute>
          } />
          <Route path="/characters/:id/edit" element={
            <ProtectedRoute>
              <CharacterEdit />
            </ProtectedRoute>
          } />
          <Route path="/beta-marketplace" element={
            <ProtectedRoute>
              <BetaMarketplace />
            </ProtectedRoute>
          } />
          <Route path="/pending-approval" element={
            <ProtectedRoute>
              <PendingApproval />
            </ProtectedRoute>
          } />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Global components */}
      <ToastContainer />
      <ChatManager />
      <ChatLauncher />
      <ChatBar />
    </>
  );
}

export default AppWithRouter;

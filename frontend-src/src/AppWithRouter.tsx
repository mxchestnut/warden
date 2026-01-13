import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ToastContainer } from './components/ui/Toast';
import { ChatManager } from './features/chat/ChatManager';
import { ChatLauncher } from './features/chat/ChatLauncher';
import { ChatBar } from './features/chat/ChatBar';
import { useAuth } from './features/auth/useAuth';
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
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings').then(module => ({ default: module.ProfileSettings })));
const Characters = lazy(() => import('./features/characters/Characters').then(module => ({ default: module.Characters })));
const CharacterEdit = lazy(() => import('./features/characters/CharacterEdit'));
const BetaMarketplace = lazy(() => import('./pages/BetaMarketplace'));
const AuthCallback = lazy(() => import('./features/auth/AuthCallback').then(module => ({ default: module.AuthCallback })));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const HouseRules = lazy(() => import('./pages/HouseRules'));
const Invite = lazy(() => import('./pages/Invite'));
const PendingApproval = lazy(() => import('./features/auth/PendingApproval'));
const Login = lazy(() => import('./features/auth/Login').then(module => ({ default: module.Login })));

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
          <Route path="/characters" element={
            <ProtectedRoute>
              <Characters />
            </ProtectedRoute>
          } />
          <Route path="/characters/:id" element={
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

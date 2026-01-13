import { useState, useEffect, lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { ToastContainer } from './components/Toast'
import './App.css'
import { ChatManager } from './components/ChatManager'
import { ChatLauncher } from './components/ChatLauncher'
import { ChatBar } from './components/ChatBar'
import { authService } from './services/auth'

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#37322E' }}>
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#B34B0C' }} />
      <p className="text-white">Loading...</p>
    </div>
  </div>
)

// Lazy load pages for optimal code splitting
const Home = lazy(() => import('./pages/Home'))
const Feed = lazy(() => import('./pages/Feed'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ProfileSettings = lazy(() => import('./pages/ProfileSettings').then(module => ({ default: module.ProfileSettings })))
const Characters = lazy(() => import('./pages/Characters').then(module => ({ default: module.Characters })))
const CharacterEdit = lazy(() => import('./pages/CharacterEdit'))
const BetaMarketplace = lazy(() => import('./pages/BetaMarketplace'))
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(module => ({ default: module.AuthCallback })))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const HouseRules = lazy(() => import('./pages/HouseRules'))
const Invite = lazy(() => import('./pages/Invite'))
const PendingApproval = lazy(() => import('./pages/PendingApproval'))
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })))

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'feed' | 'profile-settings' | 'dashboard' | 'characters' | 'character-edit' | 'beta-marketplace' | 'auth-callback' | 'terms' | 'rules' | 'invite' | 'pending-approval' | 'login'>('home')

  useEffect(() => {
    // Check authentication and route
    const checkRoute = async () => {
      const path = window.location.pathname
      
      // Try to load user first
      await authService.getCurrentUser()
      const isAuthenticated = authService.isAuthenticated()

      // Public pages that don't require authentication
      const publicPaths = new Set<string>([
        '/', 
        '', 
        '/legal/terms', 
        '/legal/rules',
        '/pending-approval',
        '/login'
      ])
      
      // Always allowed (even when not authenticated)
      const alwaysAllowed = new Set<string>(['/auth/callback'])

      // Check if current path is public
      const isPublicPath = publicPaths.has(path) || 
                          path.startsWith('/invite/') || 
                          alwaysAllowed.has(path)

      if (!isAuthenticated && !isPublicPath) {
        // Redirect unauthenticated users to login for private routes
        if (path !== '/login') {
          window.location.href = '/login'
          return
        }
      }

      // Route to correct page
      if (path === '/auth/callback') {
        setCurrentPage('auth-callback')
      } else if (path === '/legal/terms') {
        setCurrentPage('terms')
      } else if (path === '/legal/rules') {
        setCurrentPage('rules')
      } else if (path === '/feed') {
        setCurrentPage('feed')
      } else if (path === '/me' || path === '/profile' || path === '/settings') {
        setCurrentPage('profile-settings')
      } else if (path === '/dashboard') {
        setCurrentPage('dashboard')
      } else if (path === '/characters') {
        setCurrentPage('characters')
      } else if (path.startsWith('/characters/') && (path.endsWith('/edit') || path.includes('/new'))) {
        setCurrentPage('character-edit')
      } else if (path === '/beta-marketplace') {
        setCurrentPage('beta-marketplace')
      } else if (path.startsWith('/invite/')) {
        setCurrentPage('invite')
      } else if (path === '/pending-approval') {
        setCurrentPage('pending-approval')
      } else if (path === '/login') {
        setCurrentPage('login')
      } else if (path === '/' || path === '') {
        setCurrentPage('home')
      } else {
        // Unknown route - redirect to home
        window.location.href = '/'
      }
    }
    
    // Run on mount
    checkRoute()
    
    // Listen for navigation events (back/forward buttons)
    window.addEventListener('popstate', checkRoute)
    
    return () => {
      window.removeEventListener('popstate', checkRoute)
    }
  }, [])

  const renderContent = () => {
    // Handle pages
    if (currentPage === 'auth-callback') {
      return <AuthCallback />
    }
    
    if (currentPage === 'terms') {
      return <TermsOfService />
    }
    
    if (currentPage === 'rules') {
      return <HouseRules />
    }
    
    if (currentPage === 'invite') {
      return <Invite />
    }
    
    if (currentPage === 'pending-approval') {
      return <PendingApproval />
    }
    
    if (currentPage === 'login') {
      return <Login />
    }
    
    if (currentPage === 'feed') {
      return <Feed />
    }
    
    if (currentPage === 'profile-settings') {
      return <ProfileSettings />
    }
    
    if (currentPage === 'dashboard') {
      return <Dashboard />
    }

    if (currentPage === 'characters') {
      return <Characters />
    }

    if (currentPage === 'character-edit') {
      return <CharacterEdit />
    }

    if (currentPage === 'beta-marketplace') {
      return <BetaMarketplace />
    }

    // Home page
    return <Home />
  }

  // Wrap everything in Suspense for lazy loading
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        {renderContent()}
      </Suspense>
      {/* Global chat UI */}
      <ChatManager />
      <ChatLauncher />
      <ChatBar />
      <ToastContainer />
    </>
  )
}

export default App

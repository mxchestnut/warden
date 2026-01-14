/**
 * Main Navigation Component
 * Provides consistent navigation across all pages with proper linking
 */
import { 
  BookOpen, 
  LogOut,
  UserCircle,
  Settings
} from 'lucide-react'
import { User, authService } from '../../services/auth'
import NotificationBell from './NotificationBell'

interface NavigationProps {
  user: User | null
  onLogin?: () => void
  onLogout?: () => void
  currentPage?: string
}

export function Navigation({ user, currentPage }: NavigationProps) {
  const navigateTo = (path: string) => {
    window.location.href = path
  }

  const isActive = (path: string) => {
    return window.location.pathname === path || currentPage === path
  }

  const handleLogout = async () => {
    await authService.logout()
    window.location.href = '/login'
  }

  return (
    <header className="border-b sticky top-0 z-50 shadow-sm" style={{ 
      backgroundColor: '#524944',
      borderColor: '#6C6A68'
    }}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button 
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <BookOpen className="w-8 h-8" style={{ color: '#B34B0C' }} />
            <h1 className="text-2xl font-bold text-white">Warden</h1>
          </button>

          {/* Navigation Links */}
          {user && (
            <nav className="flex items-center gap-4">
              <button 
                onClick={() => navigateTo('/characters')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/characters') 
                    ? 'text-white font-medium' 
                    : 'text-white hover:bg-opacity-20'
                }`}
                style={isActive('/characters') ? { backgroundColor: '#B34B0C' } : {}}
              >
                <UserCircle className="w-5 h-5" />
                <span>Characters</span>
              </button>

              <button 
                onClick={() => navigateTo('/profile-settings')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/profile-settings') 
                    ? 'text-white font-medium' 
                    : 'text-white hover:bg-opacity-20'
                }`}
                style={isActive('/profile-settings') ? { backgroundColor: '#B34B0C' } : {}}
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>

              <NotificationBell />

              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-white hover:opacity-80"
                style={{ color: '#B34B0C' }}
              >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}
                    <span>Characters</span>

/**
 * Main Navigation Component
 * Provides consistent navigation across all pages with proper linking
 */
import { 
  BookOpen, 
  FileText, 
  Menu,
  X,
  LogIn,
  LogOut,
  Home,
  PenTool,
  ShoppingBag,
  UserCircle,
  Users,
  BarChart,
  Settings,
  Shield
} from 'lucide-react'
import { useState } from 'react'
import { User, authService } from '../services/auth'
import NotificationBell from './NotificationBell'

interface NavigationProps {
  user: User | null
  onLogin?: () => void
  onLogout?: () => void
  currentPage?: string
}

export function Navigation({ user, currentPage }: NavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const navigateTo = (path: string) => {
    window.location.href = path
    setMenuOpen(false)
  }

  const isActive = (path: string) => {
    return window.location.pathname === path || currentPage === path
  }

  return (
    <>
      {/* Top Header */}
      <header className="border-b sticky top-0 z-50 shadow-sm" style={{ 
        backgroundColor: '#524944',
        borderColor: '#6C6A68'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo & Menu */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-lg transition-colors text-white hover:bg-opacity-20"
                style={{ backgroundColor: menuOpen ? 'rgba(179, 75, 12, 0.2)' : 'transparent' }}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <button 
                onClick={() => navigateTo('/')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <BookOpen className="w-8 h-8" style={{ color: '#B34B0C' }} />
                <h1 className="text-2xl font-bold text-white">Warden</h1>
              </button>
            </div>

            {/* Right: User Actions */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {/* Quick Links */}
                  <button 
                    onClick={() => navigateTo('/feed')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive('/feed') 
                        ? 'text-white font-medium' 
                        : 'text-white hover:bg-opacity-20'
                    }`}
                    style={isActive('/feed') ? { backgroundColor: '#B34B0C' } : {}}
                  >
                    <Home className="w-5 h-5" />
                    <span>Feed</span>
                  </button>

                  <button 
                    onClick={() => navigateTo('/characters')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive('/characters') 
                        ? 'text-white font-medium' 
                        : 'text-white hover:bg-opacity-20'
                    }`}
                    style={isActive('/characters') ? { backgroundColor: '#B34B0C' } : {}}
                  >
                    <UserCircle className="w-5 h-5" />
                    <span>Characters</span>
                  </button>

                  {/* Notifications */}
                  {user && <NotificationBell />}
                </>
              ) : (
                <button 
                  onClick={() => navigateTo('/login')}
                  className="px-6 py-2 rounded-lg flex items-center gap-2 transition-colors text-white hover:opacity-90"
                  style={{ backgroundColor: '#B34B0C' }}
                >
                  <LogIn className="w-5 h-5" />
                  <span>Log In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${
          menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      />
      
      <aside 
        className={`fixed top-0 left-0 h-full w-80 shadow-2xl z-50 transform transition-transform ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#37322E' }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b" style={{ borderColor: '#6C6A68' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-7 h-7" style={{ color: '#B34B0C' }} />
                <h2 className="text-xl font-bold text-white">Warden</h2>
              </div>
              <button 
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg text-white hover:bg-opacity-20"
                style={{ backgroundColor: 'rgba(179, 75, 12, 0.1)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && (
              <div className="rounded-lg p-3" style={{ backgroundColor: '#524944' }}>
                <p className="font-medium text-white">{user.username}</p>
                <p className="text-sm" style={{ color: '#B3B2B0' }}>{user.email || 'No email set'}</p>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-6">
            <div className="space-y-1">
              {/* Main Navigation */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#B3B2B0' }}>
                  Main
                </p>
                
                <button 
                  onClick={() => navigateTo('/feed')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/feed')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/feed') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <Home className="w-5 h-5" />
                  <span>Feed</span>
                </button>
              </div>

              {/* Characters Section */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#B3B2B0' }}>
                  Characters
                </p>
                
                <button 
                  onClick={() => navigateTo('/characters')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/characters')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/characters') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <UserCircle className="w-5 h-5" />
                  <span>My Characters</span>
                </button>

                <button 
                  onClick={() => navigateTo('/store')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/store')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/store') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Books</span>
                </button>
              </div>

              {/* Account */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#B3B2B0' }}>
                  Account
                </p>
                
                <button 
                  onClick={() => navigateTo('/profile-settings')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/profile-settings')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/profile-settings') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <UserCircle className="w-5 h-5" />
                  <span>Profile & Settings</span>
                </button>

                {/* Dashboard - Personal analytics */}
                <button 
                  onClick={() => navigateTo('/dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/dashboard')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/dashboard') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <BarChart className="w-5 h-5" />
                  <span>Dashboard</span>
                </button>

                {/* Admin - For group owners */}
                {user?.isAdmin && (
                  <button 
                    onClick={() => navigateTo('/admin')}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      isActive('/admin')
                        ? 'font-medium text-white'
                        : 'text-white hover:bg-opacity-20'
                    }`}
                    style={isActive('/admin') ? { backgroundColor: '#B34B0C' } : {}}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Admin Panel</span>
                  </button>
                )}

                {/* Staff - Platform administration - Warden has isAdmin instead of is_staff */}
                {user?.isAdmin && (
                  <button 
                    onClick={() => navigateTo('/staff')}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      isActive('/staff')
                        ? 'font-medium text-white'
                        : 'text-white hover:bg-opacity-20'
                    }`}
                    style={isActive('/staff') ? { backgroundColor: '#B34B0C' } : {}}
                  >
                    <Shield className="w-5 h-5" />
                    <span>Staff Panel</span>
                  </button>
                )}
              </div>
            </div>
          </nav>

          {/* Footer Actions */}
          <div className="p-6 border-t space-y-2" style={{ borderColor: '#6C6A68' }}>
            {user && (
              <button 
                onClick={async () => {
                  await authService.logout()
                  window.location.href = '/'
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:opacity-80"
                style={{ color: '#B34B0C' }}
              >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

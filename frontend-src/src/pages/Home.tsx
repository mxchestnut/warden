import { useState, useEffect } from 'react'
import { Users, Scroll, Sparkles, Sword } from 'lucide-react'
import { Navigation } from '../components/Navigation'
import { authService, User } from '../services/auth'

interface PlatformStats {
  totalCharacters: number
  totalPlayers: number
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<PlatformStats>({
    totalCharacters: 0,
    totalPlayers: 0,
  })

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    }
    loadUser()

    // Load stats
    const loadStats = async () => {
      try {
        const response = await fetch('/api/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
    }
    loadStats()
  }, [])

  const handleNavigation = (path: string) => {
    window.location.href = path
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} currentPage="home" />
      
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sword size={48} style={{ color: '#D4AF37' }} />
            <h1 className="text-5xl font-bold text-white">Warden</h1>
          </div>
          <p className="text-xl mb-8" style={{ color: '#B3B2B0' }}>
            Manage your TTRPG characters with PathCompanion integration
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div 
            className="p-6 rounded-lg text-center"
            style={{ backgroundColor: '#2A2520', border: '1px solid #4A4540' }}
          >
            <div className="flex items-center justify-center mb-2">
              <Scroll className="w-8 h-8" style={{ color: '#D4AF37' }} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {stats.totalCharacters.toLocaleString()}
            </div>
            <div className="text-sm" style={{ color: '#B3B2B0' }}>Characters</div>
          </div>

          <div 
            className="p-6 rounded-lg text-center"
            style={{ backgroundColor: '#2A2520', border: '1px solid #4A4540' }}
          >
            <div className="flex items-center justify-center mb-2">
              <Users className="w-8 h-8" style={{ color: '#D4AF37' }} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {stats.totalPlayers.toLocaleString()}
            </div>
            <div className="text-sm" style={{ color: '#B3B2B0' }}>Players</div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Characters */}
          <div 
            onClick={() => handleNavigation('/characters')}
            className="p-6 rounded-lg cursor-pointer transition-all hover:transform hover:scale-105"
            style={{ 
              backgroundColor: '#2A2520', 
              border: '2px solid #D4AF37',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <div className="flex items-center justify-center mb-4">
              <Scroll className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 text-center">Your Characters</h3>
            <p className="text-sm text-center" style={{ color: '#B3B2B0' }}>
              Create and manage your TTRPG characters
            </p>
          </div>

          {/* Studio */}
          <div 
            onClick={() => handleNavigation('/studio')}
            className="p-6 rounded-lg cursor-pointer transition-all hover:transform hover:scale-105"
            style={{ 
              backgroundColor: '#2A2520', 
              border: '1px solid #4A4540'
            }}
          >
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="w-12 h-12" style={{ color: '#D4AF37' }} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 text-center">Studio</h3>
            <p className="text-sm text-center" style={{ color: '#B3B2B0' }}>
              Coming soon
            </p>
          </div>

          {/* Groups */}
          <div 
            onClick={() => handleNavigation('/groups')}
            className="p-6 rounded-lg cursor-pointer transition-all hover:transform hover:scale-105"
            style={{ 
              backgroundColor: '#2A2520', 
              border: '1px solid #4A4540'
            }}
          >
            <div className="flex items-center justify-center mb-4">
              <Users className="w-12 h-12" style={{ color: '#D4AF37' }} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 text-center">Groups</h3>
            <p className="text-sm text-center" style={{ color: '#B3B2B0' }}>
              Coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

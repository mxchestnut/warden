import { useState, useEffect } from 'react'
import { Navigation } from '../components/Navigation'
import { authService, User } from '../services/auth'
import { Rss } from 'lucide-react'

export default function Feed() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    }
    loadUser()
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} currentPage="feed" />
      
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="text-center">
          <Rss size={80} className="mx-auto mb-6" style={{ color: '#D4AF37' }} />
          <h1 className="text-5xl font-bold mb-4" style={{ color: 'white' }}>Coming Soon</h1>
          <p className="text-xl" style={{ color: '#B3B2B0' }}>
            The Feed is currently under development
          </p>
        </div>
      </div>
    </div>
  )
}

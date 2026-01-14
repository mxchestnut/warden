import { useState, useEffect } from 'react'
import { Link as LinkIcon } from 'lucide-react'
import { authService } from '../services/auth'
import { Navigation } from '../components/ui/Navigation'

type ProfileTab = 'profile' | 'pathcompanion'

interface UserData {
  id: number
  username: string
  isAdmin: boolean
  pathCompanionConnected: boolean
  pathCompanionUsername: string | null
}

export function ProfileSettings() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // PathCompanion connection state
  const [pcUsername, setPcUsername] = useState('')
  const [pcPassword, setPcPassword] = useState('')
  const [pcConnecting, setPcConnecting] = useState(false)

  // Removed Discord bot state - no longer needed

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const currentUser = await authService.getCurrentUser()
      if (currentUser) {
        setUser({
          ...currentUser,
          pathCompanionConnected: !!currentUser.pathcompanionUsername,
          pathCompanionUsername: currentUser.pathcompanionUsername || ''
        })
      }
    } catch (err) {
      console.error('Failed to load user:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }


  const connectPathCompanion = async () => {
    if (!pcUsername || !pcPassword) {
      setError('Please enter both username and password')
      return
    }

    try {
      setPcConnecting(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/auth/pathcompanion/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: pcUsername,
          password: pcPassword
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to connect PathCompanion account')
      }

      const data = await response.json()
      setSuccess('PathCompanion account connected successfully!')
      setPcPassword('')
      await loadUserData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect PathCompanion')
    } finally {
      setPcConnecting(false)
    }
  }

  const disconnectPathCompanion = async () => {
    if (!confirm('Are you sure you want to disconnect your PathCompanion account?')) {
      return
    }

    try {
      setPcConnecting(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/auth/pathcompanion/disconnect', {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect PathCompanion account')
      }

      setSuccess('PathCompanion account disconnected successfully')
      setPcUsername('')
      setPcPassword('')
      await loadUserData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect PathCompanion')
    } finally {
      setPcConnecting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#37322E' }}>
        <Navigation user={user} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '4rem' }}>
          <p style={{ color: 'white' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#37322E' }}>
      <Navigation user={user} />
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            Profile & Settings
          </h1>
          <p style={{ color: '#B3B2B0' }}>
            Manage your account settings and integrations
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{
            backgroundColor: '#7F1D1D',
            color: 'white',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: '#065F46',
            color: 'white',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            {success}
          </div>
        )}

        {/* Tabs */}
        <div style={{ borderBottom: '2px solid #4A4540', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <button
              onClick={() => setActiveTab('profile')}
              style={{
                padding: '1rem',
                color: activeTab === 'profile' ? '#D4AF37' : '#B3B2B0',
                borderBottom: activeTab === 'profile' ? '2px solid #D4AF37' : 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'profile' ? 'bold' : 'normal'
              }}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('pathcompanion')}
              style={{
                padding: '1rem',
                color: activeTab === 'pathcompanion' ? '#D4AF37' : '#B3B2B0',
                borderBottom: activeTab === 'pathcompanion' ? '2px solid #D4AF37' : 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'pathcompanion' ? 'bold' : 'normal'
              }}
            >
              PathCompanion
            </button>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && user && (
          <div style={{
            backgroundColor: '#4A4540',
            borderRadius: '0.75rem',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1.5rem' }}>
              Account Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', color: '#B3B2B0', marginBottom: '0.5rem' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={user.username}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #666',
                    backgroundColor: '#333',
                    color: '#888',
                    cursor: 'not-allowed'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#B3B2B0', marginBottom: '0.5rem' }}>
                  Account ID
                </label>
                <input
                  type="text"
                  value={user.id}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #666',
                    backgroundColor: '#333',
                    color: '#888',
                    cursor: 'not-allowed'
                  }}
                />
                <p style={{ color: '#B3B2B0', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Use this ID in Discord to sync your profile with the Warden bot
                </p>
              </div>
              {user.isAdmin && (
                <div style={{
                  backgroundColor: '#B34B0C',
                  color: 'white',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  display: 'inline-block'
                }}>
                  <strong>Admin Account</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PathCompanion Tab */}
        {activeTab === 'pathcompanion' && (
          <div style={{
            backgroundColor: '#4A4540',
            borderRadius: '0.75rem',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
              PathCompanion Integration
            </h2>
            <p style={{ color: '#B3B2B0', marginBottom: '1.5rem' }}>
              Connect your PathCompanion account to sync characters and access game features.
            </p>

            {user?.pathCompanionConnected ? (
              <div>
                <div style={{
                  backgroundColor: '#065F46',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <LinkIcon className="w-5 h-5" />
                  <span>Connected as <strong>{user.pathCompanionUsername}</strong></span>
                </div>
                <button
                  onClick={disconnectPathCompanion}
                  disabled={pcConnecting}
                  style={{
                    backgroundColor: '#7F1D1D',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: pcConnecting ? 'not-allowed' : 'pointer',
                    opacity: pcConnecting ? 0.6 : 1
                  }}
                >
                  {pcConnecting ? 'Disconnecting...' : 'Disconnect PathCompanion'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#B3B2B0', marginBottom: '0.5rem' }}>
                    PathCompanion Username
                  </label>
                  <input
                    type="text"
                    value={pcUsername}
                    onChange={(e) => setPcUsername(e.target.value)}
                    placeholder="Enter your PathCompanion username"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #666',
                      backgroundColor: '#333',
                      color: 'white'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#B3B2B0', marginBottom: '0.5rem' }}>
                    PathCompanion Password
                  </label>
                  <input
                    type="password"
                    value={pcPassword}
                    onChange={(e) => setPcPassword(e.target.value)}
                    placeholder="Enter your PathCompanion password"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #666',
                      backgroundColor: '#333',
                      color: 'white'
                    }}
                  />
                </div>
                <button
                  onClick={connectPathCompanion}
                  disabled={pcConnecting || !pcUsername || !pcPassword}
                  style={{
                    backgroundColor: '#B34B0C',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: (pcConnecting || !pcUsername || !pcPassword) ? 'not-allowed' : 'pointer',
                    opacity: (pcConnecting || !pcUsername || !pcPassword) ? 0.6 : 1
                  }}
                >
                  {pcConnecting ? 'Connecting...' : 'Connect PathCompanion'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

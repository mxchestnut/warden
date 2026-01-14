import { useState, useEffect } from 'react'
import { Link as LinkIcon, Copy, Check, Upload, Download } from 'lucide-react'
import { authService } from '../services/auth'
import { Navigation } from '../components/ui/Navigation'

type ProfileTab = 'profile' | 'pathcompanion' | 'import'

interface UserData {
  id: number
  accountCode: string
  username: string
  isAdmin: boolean
  pathCompanionConnected: boolean
  pathCompanionUsername?: string
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

  // Import state
  const [importingAll, setImportingAll] = useState(false)
  const [importingTupperbox, setImportingTupperbox] = useState(false)
  const [tupperboxData, setTupperboxData] = useState('')
  
  // Conflict resolution state
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [conflicts, setConflicts] = useState<Array<{
    pathCompanionId: string
    pathCompanionName: string
    existingId: number
    existingName: string
    existingIsLinked: boolean
  }>>([])
  const [newCharacters, setNewCharacters] = useState<Array<{
    pathCompanionId: string
    name: string
  }>>([])
  const [conflictDecisions, setConflictDecisions] = useState<{[key: string]: 'merge' | 'keep-both' | 'skip'}>({})

  // Copy state
  const [copied, setCopied] = useState(false)

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
          pathCompanionConnected: currentUser.pathCompanionConnected || !!currentUser.pathCompanionUsername,
          pathCompanionUsername: currentUser.pathCompanionUsername
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

  const copyAccountId = async () => {
    if (user?.accountCode) {
      try {
        await navigator.clipboard.writeText(user.accountCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        console.log('Copied Account Code:', user.accountCode)
      } catch (err) {
        console.error('Failed to copy:', err)
        // Fallback: try to select the text so user can manually copy
        const input = document.querySelector('input[readonly]') as HTMLInputElement
        if (input) {
          input.select()
        }
      }
    } else {
      console.error('No account code available to copy')
    }
  }

  const getCsrfToken = async () => {
    try {
      const response = await fetch('/api/csrf-token', { credentials: 'include' })
      const data = await response.json()
      return data.csrfToken
    } catch (err) {
      console.error('Failed to get CSRF token:', err)
      return null
    }
  }

  const importAllPathCompanion = async () => {
    if (!user?.pathCompanionConnected) {
      setError('Please connect your PathCompanion account first')
      return
    }

    try {
      setImportingAll(true)
      setError(null)
      setSuccess(null)

      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        throw new Error('Failed to get CSRF token')
      }

      // First, check for conflicts
      const previewResponse = await fetch('/api/pathcompanion/import-preview', {
        credentials: 'include',
        headers: {
          'x-csrf-token': csrfToken
        }
      })

      if (!previewResponse.ok) {
        const data = await previewResponse.json()
        throw new Error(data.error || 'Failed to check for conflicts')
      }

      const preview = await previewResponse.json()

      // If there are conflicts, show modal
      if (preview.conflicts && preview.conflicts.length > 0) {
        setConflicts(preview.conflicts)
        setNewCharacters(preview.newCharacters || [])
        setConflictDecisions({})
        setShowConflictModal(true)
        setImportingAll(false)
        return
      }

      // No conflicts, proceed with import
      await performImport(csrfToken, {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import characters')
      setImportingAll(false)
    }
  }

  const performImport = async (csrfToken: string, mergeDecisions: {[key: string]: 'merge' | 'keep-both' | 'skip'}) => {
    try {
      const response = await fetch('/api/pathcompanion/import-all', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ mergeDecisions })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to import characters')
      }

      const data = await response.json()
      const skippedCount = data.skipped?.length || 0
      setSuccess(`Successfully imported ${data.success?.length || 0} characters! ${data.failed?.length ? `(${data.failed.length} failed)` : ''} ${skippedCount ? `(${skippedCount} skipped)` : ''}`)
      setShowConflictModal(false)
    } catch (err) {
      throw err
    } finally {
      setImportingAll(false)
    }
  }

  const handleConflictResolve = async () => {
    // Check if all conflicts have decisions
    const undecided = conflicts.filter(c => !conflictDecisions[c.pathCompanionId])
    if (undecided.length > 0) {
      setError(`Please make a decision for all ${undecided.length} conflict(s)`)
      return
    }

    try {
      setError(null)
      setImportingAll(true)
      
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        throw new Error('Failed to get CSRF token')
      }

      await performImport(csrfToken, conflictDecisions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import characters')
      setImportingAll(false)
    }
  }

  const importTupperbox = async () => {
    if (!tupperboxData.trim()) {
      setError('Please paste your Tupperbox JSON data')
      return
    }

    try {
      setImportingTupperbox(true)
      setError(null)
      setSuccess(null)

      // Parse the JSON to validate it
      let parsedData
      try {
        parsedData = JSON.parse(tupperboxData)
      } catch (parseErr) {
        throw new Error('Invalid JSON format. Please paste the exact JSON export from Tupperbox.')
      }

      if (!parsedData.tuppers || !Array.isArray(parsedData.tuppers)) {
        throw new Error('Invalid Tupperbox format. Expected "tuppers" array.')
      }

      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        throw new Error('Failed to get CSRF token')
      }

      const response = await fetch('/api/characters/import-tupperbox', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ tuppers: parsedData.tuppers })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to import characters')
      }

      const data = await response.json()
      setSuccess(`Successfully imported ${data.imported || 0} characters! ${data.failed ? `(${data.failed} failed)` : ''}`)
      setTupperboxData('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import Tupperbox characters')
    } finally {
      setImportingTupperbox(false)
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
            <button
              onClick={() => setActiveTab('import')}
              style={{
                padding: '1rem',
                color: activeTab === 'import' ? '#D4AF37' : '#B3B2B0',
                borderBottom: activeTab === 'import' ? '2px solid #D4AF37' : 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'import' ? 'bold' : 'normal'
              }}
            >
              Import Characters
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
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={user.accountCode}
                    readOnly
                    onClick={(e) => e.currentTarget.select()}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      paddingRight: '3rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #666',
                      backgroundColor: '#333',
                      color: '#D4AF37',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      cursor: 'text',
                      userSelect: 'all'
                    }}
                  />
                  <button
                    onClick={copyAccountId}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: copied ? '#065F46' : '#B34B0C',
                      color: 'white',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      transition: 'background-color 0.2s'
                    }}
                    title="Copy Account ID"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
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

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* PathCompanion Bulk Import */}
            <div style={{
              backgroundColor: '#4A4540',
              borderRadius: '0.75rem',
              padding: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Download className="w-6 h-6" style={{ color: '#D4AF37' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                  Import from PathCompanion
                </h2>
              </div>
              <p style={{ color: '#B3B2B0', marginBottom: '1.5rem' }}>
                Bulk import all your characters from PathCompanion. This will sync all characters from your connected account.
              </p>

              {!user?.pathCompanionConnected ? (
                <div style={{
                  backgroundColor: '#7F1D1D',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  ⚠️ Please connect your PathCompanion account first in the PathCompanion tab
                </div>
              ) : (
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
              )}

              <button
                onClick={importAllPathCompanion}
                disabled={importingAll || !user?.pathCompanionConnected}
                style={{
                  backgroundColor: user?.pathCompanionConnected ? '#B34B0C' : '#666',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: (importingAll || !user?.pathCompanionConnected) ? 'not-allowed' : 'pointer',
                  opacity: (importingAll || !user?.pathCompanionConnected) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Download className="w-5 h-5" />
                {importingAll ? 'Importing...' : 'Import All Characters'}
              </button>
            </div>

            {/* Tupperbox Import */}
            <div style={{
              backgroundColor: '#4A4540',
              borderRadius: '0.75rem',
              padding: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Upload className="w-6 h-6" style={{ color: '#D4AF37' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                  Import from Tupperbox
                </h2>
              </div>
              <p style={{ color: '#B3B2B0', marginBottom: '1rem' }}>
                Import characters from Tupperbox JSON export. Get your export by using the <code style={{ 
                  backgroundColor: '#333', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '0.25rem',
                  color: '#D4AF37'
                }}>tul!export</code> command in Discord.
              </p>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#B3B2B0', marginBottom: '0.5rem' }}>
                  Tupperbox JSON Data
                </label>
                <textarea
                  value={tupperboxData}
                  onChange={(e) => setTupperboxData(e.target.value)}
                  placeholder='Paste your Tupperbox JSON here (e.g., {"tuppers": [...]})'
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #666',
                    backgroundColor: '#333',
                    color: 'white',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
                <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  💡 Tip: Run <code style={{ 
                    backgroundColor: '#333', 
                    padding: '0.125rem 0.375rem', 
                    borderRadius: '0.25rem'
                  }}>tul!export</code> in Discord, copy the entire JSON response, and paste it here
                </p>
              </div>

              <button
                onClick={importTupperbox}
                disabled={importingTupperbox || !tupperboxData.trim()}
                style={{
                  backgroundColor: tupperboxData.trim() ? '#B34B0C' : '#666',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: (importingTupperbox || !tupperboxData.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (importingTupperbox || !tupperboxData.trim()) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Upload className="w-5 h-5" />
                {importingTupperbox ? 'Importing...' : 'Import Tupperbox Characters'}
              </button>
            </div>
          </div>
        )}

        {/* Conflict Resolution Modal */}
        {showConflictModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}>
            <div style={{
              backgroundColor: '#4A4540',
              borderRadius: '0.75rem',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
                Character Name Conflicts
              </h2>
              <p style={{ color: '#B3B2B0', marginBottom: '1.5rem' }}>
                Found {conflicts.length} character(s) with matching names. Choose what to do for each:
              </p>

              {conflicts.map((conflict) => (
                <div key={conflict.pathCompanionId} style={{
                  backgroundColor: '#37322E',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ color: '#D4AF37', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {conflict.pathCompanionName}
                    </div>
                    <div style={{ color: '#B3B2B0', fontSize: '0.875rem' }}>
                      {conflict.existingIsLinked 
                        ? '⚠️ Existing character is already linked to PathCompanion'
                        : 'Exists in your Warden account'
                      }
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setConflictDecisions({ ...conflictDecisions, [conflict.pathCompanionId]: 'merge' })}
                      disabled={conflict.existingIsLinked}
                      style={{
                        flex: 1,
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: conflictDecisions[conflict.pathCompanionId] === 'merge' ? '2px solid #D4AF37' : '1px solid #666',
                        backgroundColor: conflictDecisions[conflict.pathCompanionId] === 'merge' ? '#B34B0C' : '#524944',
                        color: conflict.existingIsLinked ? '#666' : 'white',
                        cursor: conflict.existingIsLinked ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Merge/Update
                    </button>
                    <button
                      onClick={() => setConflictDecisions({ ...conflictDecisions, [conflict.pathCompanionId]: 'keep-both' })}
                      style={{
                        flex: 1,
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: conflictDecisions[conflict.pathCompanionId] === 'keep-both' ? '2px solid #D4AF37' : '1px solid #666',
                        backgroundColor: conflictDecisions[conflict.pathCompanionId] === 'keep-both' ? '#B34B0C' : '#524944',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Keep Both
                    </button>
                    <button
                      onClick={() => setConflictDecisions({ ...conflictDecisions, [conflict.pathCompanionId]: 'skip' })}
                      style={{
                        flex: 1,
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: conflictDecisions[conflict.pathCompanionId] === 'skip' ? '2px solid #D4AF37' : '1px solid #666',
                        backgroundColor: conflictDecisions[conflict.pathCompanionId] === 'skip' ? '#666' : '#524944',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#37322E', borderRadius: '0.5rem' }}>
                <p style={{ color: '#B3B2B0', fontSize: '0.875rem' }}>
                  <strong>{newCharacters.length}</strong> new character(s) will be imported without conflicts.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setShowConflictModal(false)}
                  disabled={importingAll}
                  style={{
                    flex: 1,
                    backgroundColor: '#666',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: importingAll ? 'not-allowed' : 'pointer',
                    opacity: importingAll ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConflictResolve}
                  disabled={importingAll || conflicts.some(c => !conflictDecisions[c.pathCompanionId])}
                  style={{
                    flex: 1,
                    backgroundColor: '#B34B0C',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: (importingAll || conflicts.some(c => !conflictDecisions[c.pathCompanionId])) ? 'not-allowed' : 'pointer',
                    opacity: (importingAll || conflicts.some(c => !conflictDecisions[c.pathCompanionId])) ? 0.6 : 1
                  }}
                >
                  {importingAll ? 'Importing...' : 'Import Characters'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

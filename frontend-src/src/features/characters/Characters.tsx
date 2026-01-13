import { useState, useEffect } from 'react'
import { Navigation } from '../../components/ui/Navigation'
import { authService, User } from '../../services/auth'
import { Plus, User as UserIcon, Link as LinkIcon, Trash2, Edit, Search, ArrowUpDown } from 'lucide-react'

interface Character {
  id: number
  name: string
  avatarUrl?: string
  bio?: string
  race?: string | any // Can be string or PathCompanion JSON object
  class?: string | any // Can be string or PathCompanion JSON object
  level?: number
  isPublic: boolean
  pathcompanionCharacterId?: string
  pathcompanionUsername?: string
  createdAt: string
  updatedAt: string
}

type SortOption = 'alphabetical' | 'recent' | 'oldest'

// Helper function to parse race/class data from PathCompanion
const parseCharacterField = (field: string | any): string => {
  if (!field) return ''
  
  // If it's a simple string, return it
  if (typeof field === 'string') {
    // Check if it looks like JSON (starts with { or [)
    if (!field.trim().startsWith('{') && !field.trim().startsWith('[')) {
      return field
    }
    // Try to parse JSON string
    try {
      const parsed = JSON.parse(field)
      if (parsed.name) return parsed.name
      if (parsed.race) return parsed.race
      if (parsed.className) return parsed.className
      return ''
    } catch {
      return field // If parsing fails, return as-is
    }
  }
  
  // If it's already an object
  if (typeof field === 'object' && field !== null) {
    if (field.name) return field.name
    if (field.race) return field.race
    if (field.className) return field.className
  }
  
  return ''
}

export function Characters() {
  const [user, setUser] = useState<User | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('recent')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)

      if (currentUser) {
        await loadCharacters()
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCharacters = async () => {
    try {
      const response = await fetch(`${API_URL}/api/characters`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setCharacters(data)
      }
    } catch (error) {
      console.error('Failed to load characters:', error)
    }
  }

  const handleCreateCharacter = () => {
    window.location.href = '/characters/new'
  }

  const handleEditCharacter = (id: number) => {
    window.location.href = `/characters/${id}/edit`
  }

  const handleDeleteCharacter = async (id: number) => {
    if (!confirm('Are you sure you want to delete this character?')) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/characters/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        await loadCharacters()
      }
    } catch (error) {
      console.error('Failed to delete character:', error)
    }
  }

  const filteredAndSortedCharacters = characters
    .filter((character) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        character.name.toLowerCase().includes(query) ||
        parseCharacterField(character.race).toLowerCase().includes(query) ||
        parseCharacterField(character.class).toLowerCase().includes(query) ||
        character.bio?.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name)
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} currentPage="characters" />
        <div className="flex items-center justify-center h-screen">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} currentPage="characters" />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Characters</h1>
            <p className="text-gray-400">
              Manage your characters, sync with PathCompanion, and track your adventures
            </p>
          </div>
          <button
            onClick={handleCreateCharacter}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors text-white"
            style={{ backgroundColor: '#B34B0C' }}
          >
            <Plus className="w-5 h-5" />
            New Character
          </button>
        </div>

        {characters.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#B3B2B0' }} />
              <input
                type="text"
                placeholder="Search characters by name, race, class, or bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{backgroundColor: '#524944', borderColor: '#6C6A68', color: 'white'}}
              />
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5" style={{ color: '#B3B2B0' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all cursor-pointer"
                style={{backgroundColor: '#524944', borderColor: '#6C6A68', color: 'white'}}
              >
                <option value="recent">Recently Added</option>
                <option value="alphabetical">Alphabetical (A-Z)</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        )}

        {characters.length > 0 && searchQuery && (
          <p className="text-gray-400 mb-4">
            Found {filteredAndSortedCharacters.length} of {characters.length} characters
          </p>
        )}

        {characters.length === 0 ? (
          <div className="text-center py-16">
            <UserIcon className="w-16 h-16 mx-auto mb-4" style={{ color: '#B3B2B0' }} />
            <h3 className="text-xl font-medium text-white mb-2">No characters yet</h3>
            <p className="text-gray-400 mb-6">Create your first character to get started</p>
            <button
              onClick={handleCreateCharacter}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors text-white"
              style={{ backgroundColor: '#B34B0C' }}
            >
              <Plus className="w-5 h-5" />
              Create Character
            </button>
          </div>
        ) : filteredAndSortedCharacters.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto mb-4" style={{ color: '#B3B2B0' }} />
            <h3 className="text-xl font-medium text-white mb-2">No characters found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your search query</p>
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors text-white"
              style={{ backgroundColor: '#B34B0C' }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedCharacters.map((character) => (
              <div
                key={character.id}
                className="rounded-lg p-6 border transition-all hover:shadow-lg"
                style={{backgroundColor: '#524944', borderColor: '#6C6A68'}}
              >
                <div className="flex items-start gap-4 mb-4">
                  {character.avatarUrl ? (
                    <img
                      src={character.avatarUrl}
                      alt={character.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#37322E' }}>
                      <UserIcon className="w-8 h-8" style={{ color: '#B3B2B0' }} />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{character.name}</h3>
                    {(character.race || character.class) && (
                      <p className="text-sm" style={{ color: '#B3B2B0' }}>
                        {parseCharacterField(character.race)} {parseCharacterField(character.class)}
                        {character.level && ` • Level ${character.level}`}
                      </p>
                    )}
                  </div>
                </div>

                {character.bio && (
                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">{character.bio}</p>
                )}

                {character.pathcompanionCharacterId && (
                  <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: '#B34B0C' }}>
                    <LinkIcon className="w-4 h-4" />
                    <span>Linked to PathCompanion</span>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t" style={{ borderColor: '#6C6A68' }}>
                  <button
                    onClick={() => handleEditCharacter(character.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#B34B0C', color: 'white' }}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCharacter(character.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: '#37322E', color: '#B3B2B0' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Characters

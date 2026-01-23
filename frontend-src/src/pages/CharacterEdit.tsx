import { useState, useEffect } from 'react'
import { Navigation } from '../components/ui/Navigation'
import { authService, User } from '../services/auth'
import { ArrowLeft, Save, Link as LinkIcon, Upload } from 'lucide-react'
import { CharacterField } from '../components/CharacterField'

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

interface Character {
  id?: number
  name: string
  race?: string
  characterClass?: string
  level?: number
  strength?: number
  dexterity?: number
  constitution?: number
  intelligence?: number
  wisdom?: number
  charisma?: number
  maxHp?: number
  currentHp?: number
  armorClass?: number
  touchAc?: number
  flatFootedAc?: number
  initiative?: number
  baseAttackBonus?: number
  cmb?: number
  cmd?: number
  fortitudeSave?: number
  reflexSave?: number
  willSave?: number
  skills?: string
  avatarUrl?: string
  alignment?: string
  deity?: string
  isPublic?: boolean
  pathcompanionCharacterId?: string
  pathcompanionUsername?: string
  // Bio fields
  fullName?: string
  titles?: string
  species?: string
  ageDescription?: string
  culturalBackground?: string
  pronouns?: string
  genderIdentity?: string
  sexuality?: string
  occupation?: string
  currentLocation?: string
  currentGoal?: string
  longTermDesire?: string
  coreMotivation?: string
  deepestFear?: string
  coreBelief?: string
  coreMisconception?: string
  moralCode?: string
  alignmentTendency?: string
  personalityOneSentence?: string
  keyVirtues?: string
  keyFlaws?: string
  stressBehavior?: string
  habitsOrTells?: string
  speechStyle?: string
  physicalPresence?: string
  identifyingTraits?: string
  clothingAesthetic?: string
  notableEquipment?: string
  skillsReliedOn?: string
  skillsAvoided?: string
  origin?: string
  greatestSuccess?: string
  greatestFailure?: string
  regret?: string
  trauma?: string
  importantRelationships?: string
  protectedRelationship?: string
  avoidedRelationship?: string
  rival?: string
  affiliatedGroups?: string
  beliefsPhilosophy?: string
  publicFacade?: string
  hiddenAspect?: string
  secret?: string
  recentChange?: string
  potentialChange?: string
  breakingPoint?: string
  redemption?: string
  symbolOrMotif?: string
  legacy?: string
  rememberedAs?: string
}

export function CharacterEdit() {
  const [user, setUser] = useState<User | null>(null)
  const [character, setCharacter] = useState<Character>({
    name: '',
    race: '',
    characterClass: '',
    level: 1,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    maxHp: 0,
    currentHp: 0,
    armorClass: 10,
    isPublic: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const pathParts = window.location.pathname.split('/')
  const characterId = pathParts[2] !== 'new' ? parseInt(pathParts[2]) : null
  const isNew = !characterId

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)

      if (characterId) {
        await loadCharacter()
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCharacter = async () => {
    try {
      const response = await fetch(`${API_URL}/api/characters/${characterId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setCharacter(data)
      }
    } catch (error) {
      console.error('Failed to load character:', error)
    }
  }

  const handleSave = async () => {
    if (!character.name) {
      setError('Character name is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const url = isNew 
        ? `${API_URL}/api/characters` 
        : `${API_URL}/api/characters/${characterId}`
      
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(character),
      })

      if (response.ok) {
        window.location.href = '/characters'
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save character')
      }
    } catch (error) {
      setError('Failed to save character')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof Character, value: string | number | boolean | Record<string, any>) => {
    setCharacter(prev => ({ ...prev, [field]: value }))
  }

  const handleDiceRoll = async (stat: string, rollType: string = 'ability', skillName?: string) => {
    if (!characterId) {
      alert('Please save your character first before rolling dice!')
      return
    }

    try {
      // Fetch CSRF token
      const csrfResponse = await fetch(`${API_URL}/api/csrf-token`, {
        credentials: 'include'
      })
      const { csrfToken } = await csrfResponse.json()

      // Make roll request with CSRF token
      const response = await fetch(`${API_URL}/api/characters/${characterId}/roll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ stat, rollType, skillName }),
      })

      if (response.ok) {
        const result = await response.json()
        const message = result.sentToDiscord 
          ? `🎲 ${result.rollDescription}: ${result.diceRoll} + ${result.modifier} = ${result.total}\n✅ Sent to Discord!`
          : `🎲 ${result.rollDescription}: ${result.diceRoll} + ${result.modifier} = ${result.total}\n⚠️ Not linked to Discord channel`
        alert(message)
      } else {
        const error = await response.json()
        alert(`Failed to roll: ${error.error}`)
      }
    } catch (error) {
      console.error('Error rolling dice:', error)
      alert('Failed to roll dice')
    }
  }

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
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => window.location.href = '/characters'}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: '#524944', color: '#B3B2B0' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isNew ? 'Create Character' : 'Edit Character'}
            </h1>
            <p className="text-gray-400">
              {isNew ? 'Add a new character to your roster' : 'Update character details'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#B34B0C' }}>
            <p style={{ color: '#B34B0C' }}>{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="rounded-lg p-6 space-y-6" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
          
          {/* Avatar & PathCompanion Sync */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6">Avatar & PathCompanion</h3>
            
            {/* Avatar Section - Centered at top */}
            <div className="flex flex-col items-center mb-8">
              {character.avatarUrl && (
                <div className="mb-4">
                  <img 
                    src={character.avatarUrl} 
                    alt="Character avatar" 
                    className="w-40 h-40 rounded-lg object-cover"
                    style={{ border: '2px solid #6C6A68' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="w-full max-w-md">
                <label className="block text-sm font-medium mb-2 text-center" style={{ color: '#B3B2B0' }}>
                  Avatar URL
                </label>
                <input
                  type="text"
                  value={character.avatarUrl || ''}
                  onChange={(e) => handleChange('avatarUrl', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg mb-3"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  placeholder="https://example.com/avatar.jpg"
                />
                
                <div className="flex flex-col items-center gap-2">
                  <label 
                    className="px-6 py-3 rounded-lg cursor-pointer flex items-center gap-2"
                    style={{ backgroundColor: '#D4AF37', color: '#1A1918', fontWeight: '500' }}
                  >
                    <Upload size={18} />
                    Upload Avatar
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Check file size (5MB limit)
                        if (file.size > 5 * 1024 * 1024) {
                          alert('File size must be less than 5MB');
                          return;
                        }

                        try {
                          const formData = new FormData();
                          formData.append('avatar', file);

                          const response = await fetch('/api/characters/upload-avatar', {
                            method: 'POST',
                            credentials: 'include',
                            body: formData
                          });

                          if (!response.ok) {
                            throw new Error('Upload failed');
                          }

                          const data = await response.json();
                          
                          // Use the full URL from the backend response
                          handleChange('avatarUrl', data.fullUrl);
                          
                          alert('Avatar uploaded successfully!');
                        } catch (error) {
                          console.error('Upload error:', error);
                          alert('Failed to upload avatar');
                        }
                      }}
                    />
                  </label>
                  <span className="text-xs" style={{ color: '#6C6A68' }}>
                    Max 5MB • JPEG, PNG, GIF, WebP
                  </span>
                </div>
              </div>
            </div>

            {/* PathCompanion Section */}
            <div className="max-w-md mx-auto">
              <label className="block text-sm font-medium mb-2 text-center" style={{ color: '#B3B2B0' }}>
                PathCompanion Character Code
              </label>
              <input
                type="text"
                value={character.pathcompanionCharacterId || ''}
                onChange={(e) => handleChange('pathcompanionCharacterId', e.target.value)}
                className="w-full px-4 py-2 rounded-lg mb-4"
                style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                placeholder="Enter PathCompanion character ID"
              />
              
              {character.id && character.pathcompanionCharacterId && (
                <div className="flex justify-center mb-3">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/pathcompanion/sync/${character.id}`, {
                          method: 'POST',
                          credentials: 'include'
                        });
                        if (!response.ok) {
                          const error = await response.json();
                          alert(`Sync failed: ${error.error || 'Unknown error'}`);
                          return;
                        }
                        const updated = await response.json();
                        setCharacter(updated.character);
                        alert('Character synced successfully with PathCompanion!');
                      } catch (error) {
                        console.error('Sync error:', error);
                        alert('Failed to sync with PathCompanion');
                      }
                    }}
                    className="px-6 py-3 rounded-lg flex items-center gap-2"
                    style={{ 
                      backgroundColor: '#D4AF37', 
                      color: '#1A1918',
                      fontWeight: '600'
                    }}
                  >
                    <LinkIcon size={18} />
                    Sync with PathCompanion
                  </button>
                </div>
              )}
              
              {character.pathcompanionUsername && (
                <p className="text-sm text-center" style={{ color: '#B3B2B0' }}>
                  Connected to: <span style={{ color: '#D4AF37' }}>{character.pathcompanionUsername}</span>
                </p>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Character Name *
                </label>
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  placeholder="Enter character name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Race
                </label>
                <input
                  type="text"
                  value={parseCharacterField(character.race) || ''}
                  onChange={(e) => handleChange('race', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  placeholder="e.g., Human, Elf"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Class
                </label>
                <input
                  type="text"
                  value={parseCharacterField(character.characterClass) || ''}
                  onChange={(e) => handleChange('characterClass', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  placeholder="e.g., Fighter, Wizard"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Level
                </label>
                <input
                  type="number"
                  value={character.level || 1}
                  onChange={(e) => handleChange('level', parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  min="1"
                  max="20"
                />
              </div>
            </div>
          </div>

          {/* Ability Scores */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Ability Scores
              <span className="text-sm font-normal ml-2" style={{ color: '#B3B2B0' }}>
                (Click modifier to roll)
              </span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => {
                const score = (character[ability as keyof Character] as number) || 10
                const modifier = Math.floor((score - 10) / 2)
                const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`
                
                return (
                  <div key={ability}>
                    <label className="block text-sm font-medium mb-2 capitalize" style={{ color: '#B3B2B0' }}>
                      {ability.slice(0, 3).toUpperCase()}
                    </label>
                    <input
                      type="number"
                      value={score}
                      onChange={(e) => handleChange(ability as keyof Character, parseInt(e.target.value) || 10)}
                      className="w-full px-4 py-2 rounded-lg text-center"
                      style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                      min="1"
                      max="30"
                    />
                    <button
                      type="button"
                      onClick={() => handleDiceRoll(ability)}
                      className="w-full mt-2 px-2 py-1 rounded text-sm font-bold transition-colors"
                      style={{ 
                        backgroundColor: '#B34B0C', 
                        color: 'white',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#B34B0C'}
                    >
                      🎲 {modifierStr}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Combat Stats */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Combat Stats
              <span className="text-sm font-normal ml-2" style={{ color: '#B3B2B0' }}>
                (Click values to roll)
              </span>
            </h3>
            
            {/* HP and AC */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Max HP
                </label>
                <input
                  type="number"
                  value={character.maxHp || 0}
                  onChange={(e) => handleChange('maxHp', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Current HP
                </label>
                <input
                  type="number"
                  value={character.currentHp || 0}
                  onChange={(e) => handleChange('currentHp', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Armor Class
                </label>
                <input
                  type="number"
                  value={character.armorClass || 10}
                  onChange={(e) => handleChange('armorClass', parseInt(e.target.value) || 10)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  min="0"
                />
              </div>
            </div>

            {/* Attack and Defense */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Initiative
                </label>
                <input
                  type="number"
                  value={character.initiative || 0}
                  onChange={(e) => handleChange('initiative', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 rounded-lg text-center"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                />
                <button
                  type="button"
                  onClick={() => handleDiceRoll('dexterity', 'ability')}
                  className="w-full mt-2 px-2 py-1 rounded text-sm font-bold transition-colors"
                  style={{ backgroundColor: '#B34B0C', color: 'white', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#B34B0C'}
                  title="Roll initiative (d20 + DEX modifier)"
                >
                  🎲 Initiative
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  BAB
                </label>
                <input
                  type="number"
                  value={character.baseAttackBonus || 0}
                  onChange={(e) => handleChange('baseAttackBonus', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 rounded-lg text-center"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                />
                <button
                  type="button"
                  onClick={() => handleDiceRoll('strength', 'attack')}
                  className="w-full mt-2 px-2 py-1 rounded text-sm font-bold transition-colors"
                  style={{ backgroundColor: '#B34B0C', color: 'white', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#B34B0C'}
                  title="Roll attack (d20 + STR modifier)"
                >
                  🎲 Attack
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  CMB
                </label>
                <input
                  type="number"
                  value={character.cmb || 0}
                  onChange={(e) => handleChange('cmb', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 rounded-lg text-center"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                />
                <button
                  type="button"
                  onClick={() => handleDiceRoll('strength', 'attack')}
                  className="w-full mt-2 px-2 py-1 rounded text-sm font-bold transition-colors"
                  style={{ backgroundColor: '#B34B0C', color: 'white', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#B34B0C'}
                  title="Roll CMB (d20 + STR modifier)"
                >
                  🎲 Maneuver
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  CMD
                </label>
                <input
                  type="number"
                  value={character.cmd || 10}
                  onChange={(e) => handleChange('cmd', parseInt(e.target.value) || 10)}
                  className="w-full px-4 py-2 rounded-lg text-center"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                />
              </div>
            </div>

            {/* Saving Throws */}
            <div>
              <h4 className="text-md font-semibold text-white mb-3">Saving Throws</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Fortitude
                  </label>
                  <input
                    type="number"
                    value={character.fortitudeSave || 0}
                    onChange={(e) => handleChange('fortitudeSave', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg text-center"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDiceRoll('fortitude', 'save')}
                    className="w-full mt-2 px-2 py-1 rounded text-sm font-bold transition-colors"
                    style={{ backgroundColor: '#B34B0C', color: 'white', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#B34B0C'}
                  >
                    🎲 Fort Save
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Reflex
                  </label>
                  <input
                    type="number"
                    value={character.reflexSave || 0}
                    onChange={(e) => handleChange('reflexSave', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg text-center"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDiceRoll('reflex', 'save')}
                    className="w-full mt-2 px-2 py-1 rounded text-sm font-bold transition-colors"
                    style={{ backgroundColor: '#B34B0C', color: 'white', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#B34B0C'}
                  >
                    🎲 Ref Save
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Will
                  </label>
                  <input
                    type="number"
                    value={character.willSave || 0}
                    onChange={(e) => handleChange('willSave', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg text-center"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDiceRoll('will', 'save')}
                    className="w-full mt-2 px-2 py-1 rounded text-sm font-bold transition-colors"
                    style={{ backgroundColor: '#B34B0C', color: 'white', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#B34B0C'}
                  >
                    🎲 Will Save
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Skills
              <span className="text-sm font-normal ml-2" style={{ color: '#B3B2B0' }}>
                (Click to roll)
              </span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                'Acrobatics', 'Appraise', 'Bluff', 'Climb', 'Craft', 'Diplomacy',
                'Disable Device', 'Disguise', 'Escape Artist', 'Fly', 'Handle Animal',
                'Heal', 'Intimidate', 'Knowledge (Arcana)', 'Knowledge (Dungeoneering)',
                'Knowledge (Engineering)', 'Knowledge (Geography)', 'Knowledge (History)',
                'Knowledge (Local)', 'Knowledge (Nature)', 'Knowledge (Nobility)',
                'Knowledge (Planes)', 'Knowledge (Religion)', 'Linguistics', 'Perception',
                'Perform', 'Profession', 'Ride', 'Sense Motive', 'Sleight of Hand',
                'Spellcraft', 'Stealth', 'Survival', 'Swim', 'Use Magic Device'
              ].map((skillName) => {
                let skillBonus = 0
                try {
                  const skills = character.skills ? JSON.parse(character.skills) : {}
                  const skillData = skills[skillName]
                  skillBonus = skillData?.total || 0
                } catch {
                  // If parsing fails, default to 0
                }
                
                const bonusStr = skillBonus >= 0 ? `+${skillBonus}` : `${skillBonus}`
                
                return (
                  <button
                    key={skillName}
                    type="button"
                    onClick={() => handleDiceRoll('', 'skill', skillName)}
                    className="px-3 py-2 rounded text-sm transition-colors text-left flex justify-between items-center"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68', cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#B34B0C'
                      e.currentTarget.style.borderColor = '#D4AF37'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#37322E'
                      e.currentTarget.style.borderColor = '#6C6A68'
                    }}
                  >
                    <span>{skillName}</span>
                    <span className="font-bold ml-2">🎲 {bonusStr}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Identity & Background */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Identity & Background</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={character.fullName || ''}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Titles
                  </label>
                  <input
                    type="text"
                    value={character.titles || ''}
                    onChange={(e) => handleChange('titles', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                    placeholder="e.g., Knight, Champion, The Brave"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Age
                  </label>
                  <input
                    type="text"
                    value={character.ageDescription || ''}
                    onChange={(e) => handleChange('ageDescription', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Pronouns
                  </label>
                  <input
                    type="text"
                    value={character.pronouns || ''}
                    onChange={(e) => handleChange('pronouns', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                    placeholder="e.g., she/her, he/him, they/them"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={character.occupation || ''}
                    onChange={(e) => handleChange('occupation', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Current Location
                  </label>
                  <input
                    type="text"
                    value={character.currentLocation || ''}
                    onChange={(e) => handleChange('currentLocation', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Cultural Background
                </label>
                <textarea
                  value={character.culturalBackground || ''}
                  onChange={(e) => handleChange('culturalBackground', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                />
              </div>
            </div>
          </div>

          {/* Goals & Motivations */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Goals & Motivations</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Current Goal
                </label>
                <textarea
                  value={character.currentGoal || ''}
                  onChange={(e) => handleChange('currentGoal', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Long-term Desire
                </label>
                <textarea
                  value={character.longTermDesire || ''}
                  onChange={(e) => handleChange('longTermDesire', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Core Motivation
                  </label>
                  <textarea
                    value={character.coreMotivation || ''}
                    onChange={(e) => handleChange('coreMotivation', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Deepest Fear
                  </label>
                  <textarea
                    value={character.deepestFear || ''}
                    onChange={(e) => handleChange('deepestFear', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Personality */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Personality</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Personality (One Sentence)
                </label>
                <input
                  type="text"
                  value={character.personalityOneSentence || ''}
                  onChange={(e) => handleChange('personalityOneSentence', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Key Virtues
                  </label>
                  <textarea
                    value={character.keyVirtues || ''}
                    onChange={(e) => handleChange('keyVirtues', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Key Flaws
                  </label>
                  <textarea
                    value={character.keyFlaws || ''}
                    onChange={(e) => handleChange('keyFlaws', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Stress Behavior
                  </label>
                  <input
                    type="text"
                    value={character.stressBehavior || ''}
                    onChange={(e) => handleChange('stressBehavior', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Habits or Tells
                  </label>
                  <input
                    type="text"
                    value={character.habitsOrTells || ''}
                    onChange={(e) => handleChange('habitsOrTells', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Speech Style
                </label>
                <textarea
                  value={character.speechStyle || ''}
                  onChange={(e) => handleChange('speechStyle', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  placeholder="How do they speak? Formal, casual, etc."
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Appearance</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Physical Presence
                </label>
                <textarea
                  value={character.physicalPresence || ''}
                  onChange={(e) => handleChange('physicalPresence', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  placeholder="Height, build, posture, general impression"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Identifying Traits
                  </label>
                  <textarea
                    value={character.identifyingTraits || ''}
                    onChange={(e) => handleChange('identifyingTraits', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                    placeholder="Scars, tattoos, unique features"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                    Clothing Aesthetic
                  </label>
                  <textarea
                    value={character.clothingAesthetic || ''}
                    onChange={(e) => handleChange('clothingAesthetic', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Backstory */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Backstory</h3>
            <div className="space-y-4">
              <CharacterField
                label="Origin"
                value={character.origin || ''}
                onChange={(value) => handleChange('origin', value)}
                type="editor"
                placeholder="Where did they come from? What shaped them?"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CharacterField
                  label="Greatest Success"
                  value={character.greatestSuccess || ''}
                  onChange={(value) => handleChange('greatestSuccess', value)}
                  type="editor"
                />
                <CharacterField
                  label="Greatest Failure"
                  value={character.greatestFailure || ''}
                  onChange={(value) => handleChange('greatestFailure', value)}
                  type="editor"
                />
                <CharacterField
                  label="Deepest Regret"
                  value={character.regret || ''}
                  onChange={(value) => handleChange('regret', value)}
                  type="editor"
                />
                <CharacterField
                  label="Trauma"
                  value={character.trauma || ''}
                  onChange={(value) => handleChange('trauma', value)}
                  type="editor"
                />
              </div>
            </div>
          </div>

          {/* Relationships */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Relationships</h3>
            <div className="space-y-4">
              <CharacterField
                label="Important Relationships"
                value={character.importantRelationships || ''}
                onChange={(value) => handleChange('importantRelationships', value)}
                type="editor"
                placeholder="Family, friends, allies, enemies"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CharacterField
                  label="Most Protected Relationship"
                  value={character.protectedRelationship || ''}
                  onChange={(value) => handleChange('protectedRelationship', value)}
                  type="editor"
                />
                <CharacterField
                  label="Avoided Relationship"
                  value={character.avoidedRelationship || ''}
                  onChange={(value) => handleChange('avoidedRelationship', value)}
                  type="editor"
                />
              </div>
              <CharacterField
                label="Rival"
                value={character.rival || ''}
                onChange={(value) => handleChange('rival', value)}
                type="editor"
              />
              <CharacterField
                label="Affiliated Groups"
                value={character.affiliatedGroups || ''}
                onChange={(value) => handleChange('affiliatedGroups', value)}
                type="medium"
                placeholder="Guilds, organizations, factions"
              />
            </div>
          </div>

          {/* Secrets & Hidden Depths */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Secrets & Hidden Depths</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CharacterField
                  label="Public Facade"
                  value={character.publicFacade || ''}
                  onChange={(value) => handleChange('publicFacade', value)}
                  type="editor"
                />
                <CharacterField
                  label="Hidden Aspect"
                  value={character.hiddenAspect || ''}
                  onChange={(value) => handleChange('hiddenAspect', value)}
                  type="editor"
                />
              </div>
              <CharacterField
                label="Secret"
                value={character.secret || ''}
                onChange={(value) => handleChange('secret', value)}
                type="editor"
              />
            </div>
          </div>

          {/* Growth & Change */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Growth & Change</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CharacterField
                  label="Recent Change"
                  value={character.recentChange || ''}
                  onChange={(value) => handleChange('recentChange', value)}
                  type="editor"
                />
                <CharacterField
                  label="Potential Change"
                  value={character.potentialChange || ''}
                  onChange={(value) => handleChange('potentialChange', value)}
                  type="editor"
                />
                <CharacterField
                  label="Breaking Point"
                  value={character.breakingPoint || ''}
                  onChange={(value) => handleChange('breakingPoint', value)}
                  type="editor"
                />
                <CharacterField
                  label="Path to Redemption"
                  value={character.redemption || ''}
                  onChange={(value) => handleChange('redemption', value)}
                  type="editor"
                />
              </div>
            </div>
          </div>

          {/* Legacy */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Legacy</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Symbol or Motif
                </label>
                <input
                  type="text"
                  value={character.symbolOrMotif || ''}
                  onChange={(e) => handleChange('symbolOrMotif', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  placeholder="e.g., A broken sword, a white rose"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Legacy
                </label>
                <textarea
                  value={character.legacy || ''}
                  onChange={(e) => handleChange('legacy', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                  placeholder="What do they hope to leave behind?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                  Remembered As
                </label>
                <textarea
                  value={character.rememberedAs || ''}
                  onChange={(e) => handleChange('rememberedAs', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#37322E', color: 'white', border: '1px solid #6C6A68' }}
                />
              </div>
            </div>
          </div>


          {/* PathCompanion Link */}
          {character.pathcompanionCharacterId && (
            <div className="p-4 rounded-lg border" style={{ borderColor: '#6C6A68' }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: '#B34B0C' }}>
                <LinkIcon className="w-5 h-5" />
                <span className="font-medium">Linked to PathCompanion</span>
              </div>
              {character.pathcompanionUsername && (
                <p className="text-sm" style={{ color: '#B3B2B0' }}>
                  Username: {character.pathcompanionUsername}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t" style={{ borderColor: '#6C6A68' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors text-white disabled:opacity-50"
              style={{ backgroundColor: '#B34B0C' }}
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Character'}
            </button>
            <button
              onClick={() => window.location.href = '/characters'}
              className="px-6 py-3 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: '#37322E', color: '#B3B2B0' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CharacterEdit

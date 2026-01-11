import { useState, useEffect } from 'react';

interface Character {
  id: number;
  name: string;
  characterClass?: string;
  level?: number;
  race?: string;
  avatarUrl?: string;
}

export function Characters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      const response = await fetch('/api/characters', { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch characters');
      }
      const data = await response.json();
      setCharacters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading characters...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="characters-page">
      <div className="page-header">
        <h1>My Characters</h1>
        <a href="/characters/new" className="btn-primary">
          + Create Character
        </a>
      </div>

      {characters.length === 0 ? (
        <div className="empty-state">
          <h2>No characters yet</h2>
          <p>Create your first character to get started</p>
          <a href="/characters/new" className="btn-primary">
            Create Character
          </a>
        </div>
      ) : (
        <div className="characters-grid">
          {characters.map((char) => (
            <a key={char.id} href={`/characters/${char.id}`} className="character-card">
              {char.avatarUrl && (
                <img src={char.avatarUrl} alt={char.name} className="character-avatar" />
              )}
              <div className="character-info">
                <h3>{char.name}</h3>
                {char.characterClass && char.level && (
                  <p className="character-class">
                    Level {char.level} {char.characterClass}
                  </p>
                )}
                {char.race && <p className="character-race">{char.race}</p>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

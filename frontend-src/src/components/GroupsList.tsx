import { useState, useEffect } from 'react';
import './GroupsList.css';

interface Group {
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  memberCount: number;
  isPublic: boolean;
  tags?: string;
}

export function GroupsList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data = await response.json();
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading groups...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="groups-list">
      <div className="groups-header">
        <h1>Writing & RP Groups</h1>
        <button className="btn-primary" onClick={() => window.location.href = '/groups/create'}>
          Create Group
        </button>
      </div>

      <div className="groups-grid">
        {groups.map((group) => {
          const tags = group.tags ? JSON.parse(group.tags) : [];
          return (
            <div key={group.id} className="group-card">
              {group.avatarUrl && (
                <img src={group.avatarUrl} alt={group.name} className="group-avatar" />
              )}
              <div className="group-info">
                <h3>
                  <a href={`/groups/${group.slug}`}>{group.name}</a>
                </h3>
                {group.description && <p className="group-description">{group.description}</p>}
                <div className="group-meta">
                  <span className="member-count">👥 {group.memberCount} members</span>
                  {group.isPublic && <span className="badge badge-public">Public</span>}
                </div>
                {tags.length > 0 && (
                  <div className="group-tags">
                    {tags.map((tag: string, i: number) => (
                      <span key={i} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {groups.length === 0 && (
        <div className="empty-state">
          <p>No groups found. Create the first one!</p>
        </div>
      )}
    </div>
  );
}

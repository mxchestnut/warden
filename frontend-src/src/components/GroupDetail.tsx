import { useState, useEffect } from 'react';
import { TiptapEditor } from './TiptapEditor';
import './GroupDetail.css';

interface Group {
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  memberCount: number;
  isPublic: boolean;
  tags?: string;
  rules?: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  contentHtml?: string;
  userId: number;
  createdAt: string;
  replyCount: number;
  likeCount: number;
  isPinned: boolean;
}

interface GroupDetailProps {
  slug: string;
}

export function GroupDetail({ slug }: GroupDetailProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState<any>(null);

  useEffect(() => {
    fetchGroupDetails();
    fetchPosts();
  }, [slug]);

  const fetchGroupDetails = async () => {
    try {
      const response = await fetch(`/api/groups/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch group details');
      const data = await response.json();
      setGroup(data.group);
      setIsMember(!!data.userMembership);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const groupResponse = await fetch(`/api/groups/${slug}`);
      const groupData = await groupResponse.json();
      
      const response = await fetch(`/api/groups/${groupData.group.id}/posts`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  const handleJoinGroup = async () => {
    if (!group) return;
    try {
      const response = await fetch(`/api/groups/${group.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to join group');
      setIsMember(true);
      setGroup({ ...group, memberCount: group.memberCount + 1 });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to join group');
    }
  };

  const handleCreatePost = async () => {
    if (!group || !newPostTitle.trim() || !newPostContent) return;
    
    try {
      const response = await fetch(`/api/groups/${group.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPostTitle,
          content: JSON.stringify(newPostContent),
          contentHtml: '' // Would need to render from TipTap
        })
      });
      
      if (!response.ok) throw new Error('Failed to create post');
      
      setNewPostTitle('');
      setNewPostContent(null);
      setShowNewPost(false);
      fetchPosts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create post');
    }
  };

  if (loading) return <div className="loading">Loading group...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!group) return <div className="error">Group not found</div>;

  const tags = group.tags ? JSON.parse(group.tags) : [];

  return (
    <div className="group-detail">
      {group.bannerUrl && (
        <div className="group-banner" style={{ backgroundImage: `url(${group.bannerUrl})` }} />
      )}
      
      <div className="group-header">
        {group.avatarUrl && (
          <img src={group.avatarUrl} alt={group.name} className="group-avatar-large" />
        )}
        <div className="group-header-info">
          <h1>{group.name}</h1>
          {group.description && <p className="group-description">{group.description}</p>}
          <div className="group-meta">
            <span>👥 {group.memberCount} members</span>
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
        <div className="group-actions">
          {!isMember && (
            <button className="btn-primary" onClick={handleJoinGroup}>
              Join Group
            </button>
          )}
          {isMember && (
            <button className="btn-primary" onClick={() => setShowNewPost(true)}>
              New Post
            </button>
          )}
        </div>
      </div>

      {showNewPost && (
        <div className="new-post-form">
          <h2>Create New Post</h2>
          <input
            type="text"
            placeholder="Post title..."
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            className="post-title-input"
          />
          <TiptapEditor
            placeholder="Write your post..."
            onContentChange={setNewPostContent}
            showToolbar={true}
            showStats={false}
          />
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowNewPost(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleCreatePost}>
              Post
            </button>
          </div>
        </div>
      )}

      <div className="group-posts">
        <h2>Discussions</h2>
        {posts.map((post) => (
          <div key={post.id} className="post-card">
            {post.isPinned && <span className="pinned-badge">📌 Pinned</span>}
            <h3>{post.title}</h3>
            <div className="post-meta">
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              <span>💬 {post.replyCount} replies</span>
              <span>❤️ {post.likeCount} likes</span>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="empty-state">No posts yet. Be the first to start a discussion!</p>
        )}
      </div>
    </div>
  );
}

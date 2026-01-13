import express from 'express';
import { db } from '../db';
import { groups, groupMembers, groupPosts } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// Get all public groups
router.get('/', async (req, res) => {
  try {
    const allGroups = await db.select().from(groups).where(eq(groups.isPublic, true)).orderBy(desc(groups.memberCount));
    res.json(allGroups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get user's groups
router.get('/my-groups', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const userGroups = await db
      .select({
        group: groups,
        role: groupMembers.role,
        joinedAt: groupMembers.joinedAt
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId))
      .orderBy(desc(groupMembers.lastActiveAt));
    
    res.json(userGroups);
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ error: 'Failed to fetch user groups' });
  }
});

// Get group by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [group] = await db.select().from(groups).where(eq(groups.slug, slug));
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is member (if authenticated)
    let userMembership = null;
    if (req.user) {
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, (req.user as any).id)));
      userMembership = membership || null;
    }

    res.json({ group, userMembership });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Create a new group
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { name, description, isPublic, tags, rules, avatarUrl, bannerUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Check if slug already exists
    const [existing] = await db.select().from(groups).where(eq(groups.slug, slug));
    if (existing) {
      return res.status(400).json({ error: 'A group with this name already exists' });
    }

    const [newGroup] = await db.insert(groups).values({
      name,
      slug,
      description,
      isPublic: isPublic ?? true,
      tags: tags ? JSON.stringify(tags) : null,
      rules,
      avatarUrl,
      bannerUrl,
      memberCount: 1
    }).returning();

    // Add creator as owner
    await db.insert(groupMembers).values({
      groupId: newGroup.id,
      userId,
      role: 'owner'
    });

    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Update group
router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const groupId = parseInt(req.params.id as string);
    const { name, description, isPublic, tags, rules, avatarUrl, bannerUrl } = req.body;

    // Check if user is owner or moderator
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    if (!membership || (membership.role !== 'owner' && membership.role !== 'moderator')) {
      return res.status(403).json({ error: 'Only group owners and moderators can update group settings' });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isPublic !== undefined) updates.isPublic = isPublic;
    if (tags !== undefined) updates.tags = JSON.stringify(tags);
    if (rules !== undefined) updates.rules = rules;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl;

    const [updatedGroup] = await db.update(groups).set(updates).where(eq(groups.id, groupId)).returning();

    res.json(updatedGroup);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Join a group
router.post('/:id/join', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const groupId = parseInt(req.params.id as string);

    // Check if group exists and is public
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (!group.isPublic) {
      return res.status(403).json({ error: 'This group is private. You need an invitation to join.' });
    }

    // Check if already a member
    const [existing] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    if (existing) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    await db.insert(groupMembers).values({
      groupId,
      userId,
      role: 'member'
    });

    // Update member count
    await db.update(groups).set({
      memberCount: sql`${groups.memberCount} + 1`
    }).where(eq(groups.id, groupId));

    res.json({ message: 'Successfully joined group' });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// Leave a group
router.post('/:id/leave', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const groupId = parseInt(req.params.id as string);

    // Check if user is member
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this group' });
    }

    if (membership.role === 'owner') {
      return res.status(400).json({ error: 'Group owners cannot leave. Transfer ownership first or delete the group.' });
    }

    await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    // Update member count
    await db.update(groups).set({
      memberCount: sql`${groups.memberCount} - 1`
    }).where(eq(groups.id, groupId));

    res.json({ message: 'Successfully left group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// Get group members
router.get('/:id/members', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id as string);

    const members = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        role: groupMembers.role,
        joinedAt: groupMembers.joinedAt,
        lastActiveAt: groupMembers.lastActiveAt
      })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(desc(groupMembers.joinedAt));

    res.json(members);
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
});

// Get group posts
router.get('/:id/posts', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id as string);

    const posts = await db
      .select()
      .from(groupPosts)
      .where(eq(groupPosts.groupId, groupId))
      .orderBy(desc(groupPosts.isPinned), desc(groupPosts.createdAt));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching group posts:', error);
    res.status(500).json({ error: 'Failed to fetch group posts' });
  }
});

// Create a group post
router.post('/:id/posts', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const groupId = parseInt(req.params.id as string);
    const { title, content, contentHtml } = req.body;

    // Check if user is member
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    if (!membership) {
      return res.status(403).json({ error: 'Must be a group member to create posts' });
    }

    const [newPost] = await db.insert(groupPosts).values({
      groupId,
      userId,
      title,
      content,
      contentHtml
    }).returning();

    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

export default router;

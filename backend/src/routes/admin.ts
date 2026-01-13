import { Router } from 'express';
import { db } from '../db';
import { users, characterSheets, documents } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';

const router = Router();

// SECURITY: Admin routes require authentication + admin role
router.use(isAuthenticated);  // First check: Must be logged in
router.use(isAdmin);           // Second check: Must have admin role

// Get all users with stats
router.get('/users', async (req, res) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        isAdmin: users.isAdmin,
        discordUserId: users.discordUserId,
        pathCompanionUsername: users.pathCompanionUsername,
        pathCompanionConnectedAt: users.pathCompanionConnectedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get counts for each user
    const usersWithStats = await Promise.all(
      allUsers.map(async (user) => {
        const [characterCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(characterSheets)
          .where(eq(characterSheets.userId, user.id));

        const [documentCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(documents)
          .where(eq(documents.userId, user.id));

        return {
          ...user,
          characterCount: characterCount?.count || 0,
          documentCount: documentCount?.count || 0,
        };
      })
    );

    res.json({ users: usersWithStats });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get detailed user info
router.get('/users/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's characters
    const characters = await db
      .select()
      .from(characterSheets)
      .where(eq(characterSheets.userId, userId));

    // Get user's documents
    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));

    // Remove sensitive data
    const { password: _password, pathCompanionPassword: _pathCompanionPassword, ...safeUser } = user;
    void _password;
    void _pathCompanionPassword;

    res.json({
      user: safeUser,
      characters,
      documents: userDocuments,
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Toggle admin status for a user
router.post('/users/:userId/toggle-admin', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentUser = req.user as any;

    // Prevent self-demotion
    if (userId === currentUser.id) {
      return res.status(400).json({ error: 'Cannot change your own admin status' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db
      .update(users)
      .set({ isAdmin: !user.isAdmin })
      .where(eq(users.id, userId));

    res.json({ success: true, isAdmin: !user.isAdmin });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ error: 'Failed to toggle admin status' });
  }
});

// Delete a user (careful!)
router.delete('/users/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentUser = req.user as any;

    // Prevent self-deletion
    if (userId === currentUser.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete user's data (cascade should handle this, but being explicit)
    await db.delete(characterSheets).where(eq(characterSheets.userId, userId));
    await db.delete(documents).where(eq(documents.userId, userId));
    await db.delete(users).where(eq(users.id, userId));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get platform stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const [totalCharacters] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(characterSheets);

    const [totalDocuments] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents);

    const [adminCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.isAdmin, true));

    res.json({
      users: totalUsers?.count || 0,
      characters: totalCharacters?.count || 0,
      documents: totalDocuments?.count || 0,
      admins: adminCount?.count || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;

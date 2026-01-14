import { Router } from 'express';
import { getPasswordRotationStatus, recordPasswordRotation } from '../db/passwordRotation';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

/**
 * GET /api/system/password-rotation-status
 * Check if database password needs rotation
 */
router.get('/password-rotation-status', isAuthenticated, async (req, res) => {
  try {
    const status = await getPasswordRotationStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting password rotation status:', error);
    res.status(500).json({ error: 'Failed to check password rotation status' });
  }
});

/**
 * POST /api/system/record-password-rotation
 * Mark that the password was rotated (manual confirmation)
 */
router.post('/record-password-rotation', isAuthenticated, async (req, res) => {
  try {
    await recordPasswordRotation();
    res.json({
      success: true,
      message: 'Password rotation date recorded. Next rotation due in 90 days.'
    });
  } catch (error) {
    console.error('Error recording password rotation:', error);
    res.status(500).json({ error: 'Failed to record password rotation' });
  }
});

export default router;

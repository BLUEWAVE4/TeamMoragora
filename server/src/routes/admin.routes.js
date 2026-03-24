import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { getDashboardStats, getAIStats, getDailyTrends, getAnalytics } from '../controllers/admin.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/ai', getAIStats);
router.get('/trends', getDailyTrends);
router.get('/analytics', getAnalytics);

export default router;

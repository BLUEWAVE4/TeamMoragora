import { Router } from 'express';
import { checkContent, getFilterLogs } from '../controllers/content.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/check', requireAuth, checkContent);
router.get('/logs', requireAuth, getFilterLogs);

export default router;

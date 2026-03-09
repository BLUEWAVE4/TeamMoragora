import { Router } from 'express';
import { getProfile, updateProfile, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Supabase Auth handles OAuth — these are profile endpoints
router.get('/me', requireAuth, getProfile);
router.patch('/me', requireAuth, updateProfile);
router.post('/logout', requireAuth, logout);

export default router;

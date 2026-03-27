import { Router } from 'express';
import { getPublicProfile, getMyVerdicts, getMyXPLogs, getRanking, deleteMyDebate, deleteAccount, getMyProfile, updateMyProfile, getMyDebates, getMyAnalysis } from '../controllers/profile.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateUUID, validateProfileUpdate } from '../middleware/validate.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

router.get('/ranking', getRanking);
router.get('/me', requireAuth, getMyProfile);
router.patch('/me', requireAuth, validateProfileUpdate, updateMyProfile);
router.get('/me/role', requireAuth, async (req, res, next) => {
  try {
    const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', req.user.id).single();
    res.json({ role: data?.role || 'user' });
  } catch (err) { next(err); }
});
router.get('/me/verdicts', requireAuth, getMyVerdicts);
router.get('/me/debates', requireAuth, getMyDebates);
router.get('/me/analysis', requireAuth, getMyAnalysis);
router.delete('/me/verdicts/:debateId', validateUUID('debateId'), requireAuth, deleteMyDebate);
router.delete('/me', requireAuth, deleteAccount);
router.get('/me/xp-logs', requireAuth, getMyXPLogs);
router.get('/:userId', validateUUID('userId'), getPublicProfile);

export default router;

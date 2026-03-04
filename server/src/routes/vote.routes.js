import { Router } from 'express';
import { castVote, getVoteTally } from '../controllers/vote.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:debateId', getVoteTally);
router.post('/:debateId', requireAuth, castVote);

export default router;

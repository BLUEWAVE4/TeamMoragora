import { Router } from 'express';
import { castVote, getVoteTally, cancelVote, finalizeExpiredVotes } from '../controllers/vote.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/finalize', finalizeExpiredVotes);
router.get('/:debateId', getVoteTally);
router.post('/:debateId', requireAuth, castVote);
router.delete('/:debateId', requireAuth, cancelVote);

export default router;

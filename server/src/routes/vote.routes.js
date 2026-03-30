import { Router } from 'express';
import { castVote, getVoteTally, getMyVote, getMyVotesBatch, cancelVote, finalizeExpiredVotes } from '../controllers/vote.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateUUID } from '../middleware/validate.middleware.js';

const router = Router();

router.post('/finalize', requireAuth, finalizeExpiredVotes);
router.post('/batch/my', requireAuth, getMyVotesBatch);
router.get('/:debateId/my', validateUUID('debateId'), requireAuth, getMyVote);
router.get('/:debateId', validateUUID('debateId'), getVoteTally);
router.post('/:debateId', validateUUID('debateId'), requireAuth, castVote);
router.delete('/:debateId', validateUUID('debateId'), requireAuth, cancelVote);

export default router;

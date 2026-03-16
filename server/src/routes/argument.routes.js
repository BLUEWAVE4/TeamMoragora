import { Router } from 'express';
import { submitArgument, getArguments, generateSoloArgument } from '../controllers/argument.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import { contentFilterMiddleware } from '../middleware/contentFilter.middleware.js';

const router = Router();

router.get('/:debateId', optionalAuth, getArguments);
router.post('/:debateId', requireAuth, contentFilterMiddleware, submitArgument);
router.post('/:debateId/solo', requireAuth, generateSoloArgument);

export default router;

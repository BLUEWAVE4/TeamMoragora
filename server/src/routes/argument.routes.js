import { Router } from 'express';
import { submitArgument, getArguments } from '../controllers/argument.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { contentFilterMiddleware } from '../middleware/contentFilter.middleware.js';

const router = Router();

router.get('/:debateId', getArguments);
router.post('/:debateId', requireAuth, contentFilterMiddleware, submitArgument);

export default router;

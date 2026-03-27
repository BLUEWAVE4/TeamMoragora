import { Router } from 'express';
import { submitArgument, getArguments, generateSoloArgument } from '../controllers/argument.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import { contentFilterMiddleware } from '../middleware/contentFilter.middleware.js';
import { validateUUID } from '../middleware/validate.middleware.js';

const router = Router();

router.get('/:debateId', validateUUID('debateId'), optionalAuth, getArguments);
router.post('/:debateId', validateUUID('debateId'), requireAuth, contentFilterMiddleware, submitArgument);
router.post('/:debateId/solo', validateUUID('debateId'), requireAuth, generateSoloArgument);

export default router;

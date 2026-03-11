import { Router } from 'express';
import { submitFeedback, getMyFeedbacks } from '../controllers/feedback.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', requireAuth, submitFeedback);
router.get('/me', requireAuth, getMyFeedbacks);

export default router;

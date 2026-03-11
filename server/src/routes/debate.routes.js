// import { Router } from 'express';
// import { createDebate, getDebate, listDebates, joinByInvite } from '../controllers/debate.controller.js';
// import { requireAuth } from '../middleware/auth.middleware.js';

// const router = Router();

// router.get('/', listDebates);
// router.get('/:id', getDebate);
// router.post('/', requireAuth, createDebate);
// router.post('/join/:inviteCode', requireAuth, joinByInvite);

// export default router;

import { Router } from 'express';
import { 
  createDebate, 
  getDebate, 
  listDebates, 
  joinByInvite,
  getDebateByInviteCode
} from '../controllers/debate.controller.js';

import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', listDebates);

// ⭐ 반드시 이걸 먼저
router.get('/invite/:inviteCode', getDebateByInviteCode);

router.get('/:id', getDebate);

router.post('/', requireAuth, createDebate);
router.post('/join/:inviteCode', requireAuth, joinByInvite);

export default router;

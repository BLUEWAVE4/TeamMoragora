import { Router } from 'express';
import { getComments, createComment, deleteComment, toggleLike } from '../controllers/comment.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// 댓글 목록 (로그인 시 좋아요 여부 포함)
router.get('/:debateId', optionalAuth, getComments);

// 댓글 작성 (로그인 필수)
router.post('/:debateId', requireAuth, createComment);

// 댓글 삭제 (본인만)
router.delete('/:commentId', requireAuth, deleteComment);

// 좋아요 토글 (로그인 필수)
router.post('/:commentId/like', requireAuth, toggleLike);

export default router;

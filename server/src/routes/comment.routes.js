import { Router } from 'express';
import { getComments, createComment, deleteComment } from '../controllers/comment.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import { validateUUID } from '../middleware/validate.middleware.js';
import { commentFilterMiddleware } from '../middleware/contentFilter.middleware.js';

const router = Router();

// 댓글 목록
router.get('/:debateId', validateUUID('debateId'), optionalAuth, getComments);

// 댓글 작성 (로그인 필수 + 콘텐츠 필터 1~2단계)
router.post('/:debateId', validateUUID('debateId'), requireAuth, commentFilterMiddleware, createComment);

// 댓글 삭제 (본인만)
router.delete('/:commentId', validateUUID('commentId'), requireAuth, deleteComment);

export default router;

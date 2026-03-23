import { Router } from 'express';
import { sendMessage, getMessages, startChat, endChat } from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// 채팅 메시지 목록 조회
router.get('/:debateId/messages', requireAuth, getMessages);

// 채팅 메시지 전송
router.post('/:debateId/messages', requireAuth, sendMessage);

// 채팅 시작 (양측 참여 확인 → chatting 상태 전환)
router.post('/:debateId/start', requireAuth, startChat);

// 채팅 종료 → 판결 요청
router.post('/:debateId/end', requireAuth, endChat);

export default router;

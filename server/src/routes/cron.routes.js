import { Router } from 'express';
import { createDailyDebate } from '../services/dailyDebate.service.js';
import { env } from '../config/env.js';

const router = Router();

// POST /api/cron/daily-debate
// 외부 cron 서비스에서 매일 오전 8시(KST) 호출
// Authorization: Bearer <CRON_SECRET> 으로 보호
router.post('/daily-debate', async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const debate = await createDailyDebate();
    res.json({ success: true, debateId: debate.id, topic: debate.topic });
  } catch (err) {
    console.error('[Cron] 오늘의 논쟁 생성 실패:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

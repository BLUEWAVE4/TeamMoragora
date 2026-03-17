import { Router } from 'express';
import { createDailyDebate } from '../services/dailyDebate.service.js';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

// cron 시크릿 검증 미들웨어
function verifyCronSecret(req, res, next) {
  const cronSecret = env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

const router = Router();

// POST /api/cron/daily-debate
// 외부 cron 서비스에서 매일 오전 8시(KST) 호출
// Authorization: Bearer <CRON_SECRET> 으로 보호
router.post('/daily-debate', verifyCronSecret, async (req, res) => {
  try {
    const debate = await createDailyDebate();
    res.json({ success: true, debateId: debate.id, topic: debate.topic });
  } catch (err) {
    console.error('[Cron] 오늘의 논쟁 생성 실패:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cron/daily-debate/:id — daily 논쟁 삭제 (관리용)
router.delete('/daily-debate/:id', verifyCronSecret, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('debates')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

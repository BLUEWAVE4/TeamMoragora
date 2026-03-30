import { Router } from 'express';
import { createDailyDebate } from '../services/dailyDebate.service.js';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

// cron 시크릿 검증 미들웨어
function verifyCronSecret(req, res, next) {
  const cronSecret = env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
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

// POST /api/cron/cleanup-stale — 방치 논쟁 자동 정리
// waiting 24시간 + arguing 48시간 미완료 → 삭제
// voting 기간 만료 → completed 전환
router.post('/cleanup-stale', verifyCronSecret, async (req, res) => {
  try {
    const now = new Date();
    const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const h48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const results = { deleted_waiting: 0, deleted_arguing: 0, completed_voting: 0 };

    // 1. waiting 상태 24시간 초과 → 삭제
    const { data: staleWaiting } = await supabaseAdmin
      .from('debates')
      .delete()
      .eq('status', 'waiting')
      .lt('created_at', h24Ago)
      .select('id');
    results.deleted_waiting = staleWaiting?.length || 0;

    // 2. arguing 상태 48시간 초과 (주장 미완료) → 삭제
    const { data: staleArguing } = await supabaseAdmin
      .from('debates')
      .delete()
      .eq('status', 'arguing')
      .lt('created_at', h48Ago)
      .select('id');
    results.deleted_arguing = staleArguing?.length || 0;

    // 3. voting 상태 + 투표 기간 만료 → completed 전환
    const { data: expiredVoting } = await supabaseAdmin
      .from('debates')
      .select('id, created_at, vote_duration')
      .eq('status', 'voting');

    let completedCount = 0;
    for (const d of (expiredVoting || [])) {
      const voteDuration = d.vote_duration ?? 1;
      const deadline = new Date(new Date(d.created_at).getTime() + voteDuration * 24 * 60 * 60 * 1000);
      if (now > deadline) {
        await supabaseAdmin.from('debates').update({ status: 'completed' }).eq('id', d.id);
        completedCount++;
      }
    }
    results.completed_voting = completedCount;

    console.log('[Cron] cleanup-stale:', results);
    res.json({ success: true, ...results });
  } catch (err) {
    console.error('[Cron] cleanup-stale 실패:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

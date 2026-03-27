import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// 페이지뷰 기록
router.post('/page-view', optionalAuth, async (req, res, next) => {
  try {
    const { path, session_id, referrer, user_agent } = req.body;
    await supabaseAdmin.from('page_views').insert({
      path,
      session_id,
      user_id: req.user?.id || null,
      referrer: referrer || null,
      user_agent: user_agent || null,
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 이벤트 기록
router.post('/event', optionalAuth, async (req, res, next) => {
  try {
    const { event_name, metadata, session_id, path } = req.body;
    await supabaseAdmin.from('analytics_events').insert({
      event_name,
      metadata: metadata || {},
      session_id,
      user_id: req.user?.id || null,
      path: path || null,
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;

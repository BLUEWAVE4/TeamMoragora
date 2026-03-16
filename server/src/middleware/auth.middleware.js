import { supabaseAdmin } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }

  req.user = user;
  req.accessToken = token;
  next();
}

// 인증 선택적 — 토큰 있으면 user 부착, 없어도 통과
export async function optionalAuth(req, _res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) req.user = user;
    } catch { /* ignore */ }
  }
  next();
}

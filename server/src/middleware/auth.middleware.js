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

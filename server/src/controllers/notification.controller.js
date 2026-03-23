import { supabaseAdmin } from '../config/supabase.js';

// 알림 목록 조회 (최근 50개)
export async function getNotifications(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const unreadCount = (data || []).filter(n => !n.is_read).length;
    res.json({ notifications: data || [], unreadCount });
  } catch (err) {
    next(err);
  }
}

// 읽지 않은 알림 개수만 조회
export async function getUnreadCount(req, res, next) {
  try {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) throw error;
    res.json({ unreadCount: count || 0 });
  } catch (err) {
    next(err);
  }
}

// 개별 알림 읽음 처리
export async function markAsRead(req, res, next) {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// 전체 읽음 처리
export async function markAllAsRead(req, res, next) {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

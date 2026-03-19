import { supabaseAdmin } from '../config/supabase.js';

// ===== 알림 생성 (같은 논쟁 링크의 기존 알림은 업데이트) =====
export async function createNotification({ userId, type, title, message, link }) {
  if (!userId) return null;
  try {
    // 같은 유저 + 같은 링크의 기존 알림이 있으면 업데이트 (최신 내용으로 갱신)
    if (link) {
      const { data: existing } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('link', link)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .update({ type, title, message, is_read: false, created_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({ user_id: userId, type, title, message, link })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Notification] 생성 실패:', err.message);
    return null;
  }
}

// 여러 사용자에게 동시 알림 (같은 링크 기존 알림 업데이트)
export async function createNotifications(notifications) {
  if (!notifications.length) return;
  try {
    await Promise.all(notifications.map(n => createNotification(n)));
  } catch (err) {
    console.error('[Notification] 일괄 생성 실패:', err.message);
  }
}

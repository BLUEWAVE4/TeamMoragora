import { supabaseAdmin } from '../config/supabase.js';

// ===== 알림 생성 공통 함수 =====
export async function createNotification({ userId, type, title, message, link }) {
  if (!userId) return null;
  try {
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

// 여러 사용자에게 동시 알림
export async function createNotifications(notifications) {
  if (!notifications.length) return;
  try {
    await supabaseAdmin.from('notifications').insert(notifications);
  } catch (err) {
    console.error('[Notification] 일괄 생성 실패:', err.message);
  }
}

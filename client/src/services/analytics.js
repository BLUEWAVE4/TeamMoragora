import { supabase } from './supabase';

// 세션 ID (탭 단위 고유)
const sessionId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);

// 페이지뷰 기록
export async function trackPageView(path) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('page_views').insert({
      path,
      session_id: sessionId,
      user_id: session?.user?.id || null,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    });
  } catch {
    // analytics 실패는 무시
  }
}

// 이벤트 기록 (논쟁 생성, 판결 열람, 투표 등)
export async function trackEvent(event_name, metadata = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('analytics_events').insert({
      event_name,
      metadata,
      session_id: sessionId,
      user_id: session?.user?.id || null,
      path: window.location.pathname,
    });
  } catch {
    // analytics 실패는 무시
  }
}

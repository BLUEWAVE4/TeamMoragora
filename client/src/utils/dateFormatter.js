/**
 * 공통 시간/날짜 포맷 유틸
 */

// "방금", "3분 전", "2시간 전", "3일 전", "2개월 전", "3.26"
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}일 전`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}개월 전`;
  return `${Math.floor(diff / 31536000)}년 전`;
}

// "2026.03.24" 형식
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// "00:05:30" 형식 카운트다운
export function formatCountdown(diffMs) {
  if (diffMs <= 0) return '00:00:00';
  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  const s = Math.floor((diffMs % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// "오후 3:42" 형식 메시지 시간
export function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h >= 12 ? '오후' : '오전'} ${h % 12 || 12}:${m}`;
}

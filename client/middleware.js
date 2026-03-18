// Vercel Edge Middleware — 소셜 크롤러에게 동적 OG 메타 태그 제공
const API_BASE = 'https://teammoragora.onrender.com/api';

const CRAWLERS = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|kakaotalk-scrap|Slackbot|Discordbot|WhatsApp|Googlebot|bingbot|yandex|Pinterestbot/i;

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const { pathname } = new URL(request.url);

  // /moragora/:debateId 또는 /debate/:debateId 경로에서 크롤러만 처리
  const match = pathname.match(/^\/(moragora|debate)\/([a-zA-Z0-9-]+)$/);
  if (!match || !CRAWLERS.test(ua)) return;

  const debateId = match[2];

  try {
    const res = await fetch(`${API_BASE}/judgments/${debateId}/og`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return; // 판결 없으면 기본 OG 사용

    const og = await res.json();
    const pageUrl = request.url;

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta property="og:title" content="${escapeHtml(og.title)}" />
  <meta property="og:description" content="${escapeHtml(og.description)}" />
  <meta property="og:image" content="${og.image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(og.title)}" />
  <meta name="twitter:description" content="${escapeHtml(og.description)}" />
  <meta name="twitter:image" content="${og.image}" />
  <title>${escapeHtml(og.title)}</title>
</head>
<body></body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return; // 에러 시 기본 SPA로 폴백
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const config = {
  matcher: ['/moragora/:path*', '/debate/:path*'],
};

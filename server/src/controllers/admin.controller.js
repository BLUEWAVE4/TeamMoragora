import { supabaseAdmin } from '../config/supabase.js';

// ===== 대시보드 핵심 지표 =====
export async function getDashboardStats(req, res, next) {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00+09:00`;
    const todayEnd = `${today}T23:59:59+09:00`;

    // 병렬 조회
    const [
      { count: totalUsers },
      { count: totalDebates },
      { count: totalVerdicts },
      { count: totalVotes },
      { count: totalComments },
      { count: todayPageViews },
      { data: filterLogs },
      { data: ratings },
      { data: feedbacks },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('debates').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('verdicts').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('votes').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', todayStart).lte('created_at', todayEnd),
      supabaseAdmin.from('content_filter_logs').select('filter_stage, result').limit(1000),
      supabaseAdmin.from('verdict_ratings').select('score').limit(1000),
      supabaseAdmin.from('feedbacks').select('rating').limit(1000),
    ]);

    // DAU: 오늘 page_views의 고유 세션
    const { data: pvToday } = await supabaseAdmin.from('page_views').select('session_id').gte('created_at', todayStart).lte('created_at', todayEnd).limit(5000);
    const dau = new Set(pvToday?.map(p => p.session_id)).size;

    // 필터 차단 건수
    const filterBlocked = filterLogs?.filter(l => l.result === 'block').length || 0;

    // 평균 만족도
    const avgRating = ratings?.length > 0
      ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
      : null;
    const avgFeedback = feedbacks?.length > 0
      ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
      : null;

    res.json({
      dau,
      totalUsers: totalUsers || 0,
      totalDebates: totalDebates || 0,
      totalVerdicts: totalVerdicts || 0,
      totalVotes: totalVotes || 0,
      totalComments: totalComments || 0,
      todayPageViews: todayPageViews || 0,
      filterBlocked,
      avgRating,
      avgFeedback,
      ratingCount: ratings?.length || 0,
      feedbackCount: feedbacks?.length || 0,
    });
  } catch (err) { next(err); }
}

// ===== AI 성능 =====
export async function getAIStats(req, res, next) {
  try {
    const { data: judgments } = await supabaseAdmin
      .from('ai_judgments')
      .select('ai_model, winner_side, score_a, score_b, confidence, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    const models = {};
    (judgments || []).forEach(j => {
      const m = j.ai_model || 'unknown';
      if (!models[m]) models[m] = { total: 0, success: 0, fail: 0, wins: { A: 0, B: 0, draw: 0 }, confSum: 0 };
      models[m].total++;
      if (j.status === 'success') {
        models[m].success++;
        models[m].wins[j.winner_side] = (models[m].wins[j.winner_side] || 0) + 1;
        models[m].confSum += parseFloat(j.confidence || 0);
      } else {
        models[m].fail++;
      }
    });

    const aiStats = Object.entries(models).map(([model, s]) => ({
      model,
      total: s.total,
      successRate: s.total > 0 ? Math.round(s.success / s.total * 1000) / 10 : 0,
      avgConfidence: s.success > 0 ? (s.confSum / s.success).toFixed(2) : '0',
      wins: s.wins,
    }));

    res.json({ aiStats });
  } catch (err) { next(err); }
}

// ===== 일간 추이 (14일) =====
export async function getDailyTrends(req, res, next) {
  try {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const verdictCounts = [];
    const dauCounts = [];

    for (const day of days) {
      const start = `${day}T00:00:00+09:00`;
      const end = `${day}T23:59:59+09:00`;

      const [{ count: vCount }, { data: pvData }] = await Promise.all([
        supabaseAdmin.from('verdicts').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
        supabaseAdmin.from('page_views').select('session_id').gte('created_at', start).lte('created_at', end).limit(5000),
      ]);

      verdictCounts.push({ date: day, count: vCount || 0 });
      dauCounts.push({ date: day, count: new Set(pvData?.map(p => p.session_id)).size });
    }

    res.json({ verdictTrends: verdictCounts, dauTrends: dauCounts });
  } catch (err) { next(err); }
}

// ===== 방문자 분석 =====
export async function getAnalytics(req, res, next) {
  try {
    const { data: pageViews } = await supabaseAdmin
      .from('page_views')
      .select('page_path, created_at, session_id')
      .order('created_at', { ascending: false })
      .limit(5000);

    // 인기 페이지
    const pageCounts = {};
    (pageViews || []).forEach(pv => {
      pageCounts[pv.page_path] = (pageCounts[pv.page_path] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count, ratio: Math.round(count / (pageViews?.length || 1) * 1000) / 10 }));

    // 이벤트 분포
    const { data: events } = await supabaseAdmin
      .from('analytics_events')
      .select('event_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    const eventCounts = {};
    (events || []).forEach(e => {
      eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
    });
    const eventDist = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, ratio: Math.round(count / (events?.length || 1) * 1000) / 10 }));

    res.json({
      totalPageViews: pageViews?.length || 0,
      uniqueSessions: new Set(pageViews?.map(p => p.session_id)).size,
      topPages,
      eventDist,
      totalEvents: events?.length || 0,
    });
  } catch (err) { next(err); }
}

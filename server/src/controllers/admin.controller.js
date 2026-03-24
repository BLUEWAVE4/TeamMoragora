import { supabaseAdmin } from '../config/supabase.js';

// ===== 페이지네이션 헬퍼 (Supabase max_rows 1000 제한 우회) =====
async function fetchAll(table, select, filters = []) {
  let all = [];
  let offset = 0;
  const batch = 1000;
  while (true) {
    let q = supabaseAdmin.from(table).select(select);
    filters.forEach(f => {
      if (f.method === 'not') q = q.not(f.col, f.op, f.val);
      else q = q[f.method](f.col, f.val);
    });
    const { data } = await q.range(offset, offset + batch - 1);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < batch) break;
    offset += batch;
  }
  return all;
}

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

    // DAU: 오늘 page_views의 고유 로그인 유저
    const pvToday = await fetchAll('page_views', 'user_id', [
      { method: 'gte', col: 'created_at', val: todayStart },
      { method: 'lte', col: 'created_at', val: todayEnd },
      { method: 'not', col: 'user_id', op: 'is', val: null },
    ]);
    const dau = new Set(pvToday.map(p => p.user_id)).size;

    // 필터 차단 상세
    const filterBlocked = filterLogs?.filter(l => l.result === 'block').length || 0;
    const filterByStage = {};
    (filterLogs || []).filter(l => l.result === 'block').forEach(l => {
      const stage = `${l.filter_stage}단계`;
      filterByStage[stage] = (filterByStage[stage] || 0) + 1;
    });

    // 별점 분포
    const ratingDist = { 1: 0, 1.5: 0, 2: 0, 2.5: 0, 3: 0, 3.5: 0, 4: 0, 4.5: 0, 5: 0 };
    (ratings || []).forEach(r => { if (ratingDist[r.score] !== undefined) ratingDist[r.score]++; });
    const avgRating = ratings?.length > 0
      ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
      : null;

    // 피드백 분포
    const feedbackDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (feedbacks || []).forEach(f => { if (feedbackDist[f.rating] !== undefined) feedbackDist[f.rating]++; });
    const avgFeedback = feedbacks?.length > 0
      ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
      : null;

    // 논쟁 모드별 분포
    const [
      { count: duoCount },
      { count: soloCount },
      { count: dailyCount },
      { count: chatCount },
    ] = await Promise.all([
      supabaseAdmin.from('debates').select('*', { count: 'exact', head: true }).eq('mode', 'duo'),
      supabaseAdmin.from('debates').select('*', { count: 'exact', head: true }).eq('mode', 'solo'),
      supabaseAdmin.from('debates').select('*', { count: 'exact', head: true }).eq('mode', 'daily'),
      supabaseAdmin.from('debates').select('*', { count: 'exact', head: true }).eq('mode', 'chat'),
    ]);

    // 논쟁 상태별 분포
    const [
      { count: waitingCount },
      { count: arguingCount },
      { count: votingCount },
      { count: completedCount },
    ] = await Promise.all([
      supabaseAdmin.from('debates').select('*', { count: 'exact', head: true }).eq('status', 'waiting'),
      supabaseAdmin.from('debates').select('*', { count: 'exact', head: true }).eq('status', 'arguing'),
      supabaseAdmin.from('debates').select('*', { count: 'exact', head: true }).eq('status', 'voting'),
      supabaseAdmin.from('debates').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    ]);

    // 유저 티어 분포
    const { data: tierData } = await supabaseAdmin.from('profiles').select('tier').limit(1000);
    const tierDist = {};
    (tierData || []).forEach(p => { tierDist[p.tier] = (tierDist[p.tier] || 0) + 1; });

    res.json({
      dau,
      totalUsers: totalUsers || 0,
      totalDebates: totalDebates || 0,
      totalVerdicts: totalVerdicts || 0,
      totalVotes: totalVotes || 0,
      totalComments: totalComments || 0,
      todayPageViews: todayPageViews || 0,
      filterBlocked,
      filterByStage,
      avgRating,
      avgFeedback,
      ratingCount: ratings?.length || 0,
      ratingDist,
      feedbackCount: feedbacks?.length || 0,
      feedbackDist,
      debateByMode: { duo: duoCount || 0, solo: soloCount || 0, daily: dailyCount || 0, chat: chatCount || 0 },
      debateByStatus: { waiting: waitingCount || 0, arguing: arguingCount || 0, voting: votingCount || 0, completed: completedCount || 0 },
      tierDist,
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
      .limit(50000);

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

      const [{ count: vCount }, pvData] = await Promise.all([
        supabaseAdmin.from('verdicts').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
        fetchAll('page_views', 'user_id', [
          { method: 'gte', col: 'created_at', val: start },
          { method: 'lte', col: 'created_at', val: end },
          { method: 'not', col: 'user_id', op: 'is', val: null },
        ]),
      ]);

      verdictCounts.push({ date: day, count: vCount || 0 });
      dauCounts.push({ date: day, count: new Set(pvData.map(p => p.user_id)).size });
    }

    // MAU 달력: 이번 달 일별 고유 사용자 수 (DAU와 동일한 KST 쿼리 방식)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthSessions = new Set();
    const mauCalendar = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${monthStr}-${String(d).padStart(2, '0')}`;
      const start = `${dayStr}T00:00:00+09:00`;
      const end = `${dayStr}T23:59:59+09:00`;
      const pvDay = await fetchAll('page_views', 'user_id', [
        { method: 'gte', col: 'created_at', val: start },
        { method: 'lte', col: 'created_at', val: end },
        { method: 'not', col: 'user_id', op: 'is', val: null },
      ]);
      const sessions = new Set(pvDay.map(p => p.user_id).filter(Boolean));
      sessions.forEach(s => monthSessions.add(s));
      mauCalendar.push({ day: d, count: sessions.size });
    }

    res.json({
      verdictTrends: verdictCounts,
      dauTrends: dauCounts,
      mauCalendar,
      mauTotal: monthSessions.size,
      mauMonth: monthStr,
      mauDaysInMonth: daysInMonth,
      mauFirstDayOfWeek: new Date(year, month, 1).getDay(), // 0=일, 1=월...
    });
  } catch (err) { next(err); }
}

// ===== 방문자 분석 =====
export async function getAnalytics(req, res, next) {
  try {
    // 총 카운트는 count 쿼리 (limit 영향 없음)
    const [
      { count: totalPageViews },
      { count: totalEvents },
    ] = await Promise.all([
      supabaseAdmin.from('page_views').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('analytics_events').select('*', { count: 'exact', head: true }),
    ]);

    // 고유 세션: 페이지별 집계를 위해 RPC 또는 페이지네이션으로 전체 가져오기
    // Supabase max_rows=1000 제한 → 페이지네이션
    let allPV = [];
    let offset = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabaseAdmin
        .from('page_views')
        .select('path, session_id')
        .order('created_at', { ascending: false })
        .range(offset, offset + batchSize - 1);
      if (!data || data.length === 0) break;
      allPV = allPV.concat(data);
      if (data.length < batchSize) break;
      offset += batchSize;
    }

    // 인기 페이지
    const pageCounts = {};
    allPV.forEach(pv => {
      pageCounts[pv.path] = (pageCounts[pv.path] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count, ratio: Math.round(count / (allPV.length || 1) * 1000) / 10 }));

    const uniqueSessions = new Set(allPV.map(p => p.user_id)).size;

    // 이벤트 분포
    let allEvents = [];
    offset = 0;
    while (true) {
      const { data } = await supabaseAdmin
        .from('analytics_events')
        .select('event_name')
        .order('created_at', { ascending: false })
        .range(offset, offset + batchSize - 1);
      if (!data || data.length === 0) break;
      allEvents = allEvents.concat(data);
      if (data.length < batchSize) break;
      offset += batchSize;
    }

    const eventCounts = {};
    allEvents.forEach(e => {
      eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
    });
    const eventDist = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, ratio: Math.round(count / (allEvents.length || 1) * 1000) / 10 }));

    res.json({
      totalPageViews: totalPageViews || 0,
      uniqueSessions,
      topPages,
      eventDist,
      totalEvents: totalEvents || 0,
    });
  } catch (err) { next(err); }
}

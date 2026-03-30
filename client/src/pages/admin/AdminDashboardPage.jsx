import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAdminStats, getAdminAI, getAdminTrends, getAdminAnalytics } from '../../services/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { ArrowLeft, Users, Gavel, MessageSquare, ThumbsUp, Shield, Star, TrendingUp, Eye, Zap, X, ChevronRight, Share2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const TABS = ['핵심 지표', 'AI 성능', '일/월간 추이', '방문자 분석'];

function StatCard({ icon: Icon, label, value, sub, color = '#6366f1', onClick }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all" onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold text-gray-400">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-[28px] font-black text-[#1B2A4A] leading-none">{value}</p>
        {onClick && <ChevronRight size={14} className="text-gray-300 mb-1" />}
      </div>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function AICard({ model, data }) {
  const colors = { 'gpt-4o': '#1B2A4A', 'gemini-2.5-flash': '#4285F4', 'claude-sonnet': '#D97706' };
  const names = { 'gpt-4o': 'Judge G (GPT)', 'gemini-2.5-flash': 'Judge M (Gemini)', 'claude-sonnet': 'Judge C (Claude)' };
  const color = colors[model] || '#6366f1';
  const t = data.wins.A + data.wins.B + (data.wins.draw || 0);
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border-2" style={{ borderColor: `${color}30` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[14px] font-black" style={{ color }}>{names[model] || model}</span>
        <span className="text-[11px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">정상</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <div><span className="text-gray-400">성공률</span><p className="text-[16px] font-black text-emerald-500">{data.successRate}%</p></div>
        <div><span className="text-gray-400">평균 확신도</span><p className="text-[16px] font-black text-[#1B2A4A]">{data.avgConfidence}</p></div>
        <div><span className="text-gray-400">총 호출</span><p className="text-[14px] font-bold text-[#1B2A4A]">{data.total}건</p></div>
        <div><span className="text-gray-400">승률</span><p className="text-[12px] font-bold text-[#1B2A4A]">A:{t > 0 ? Math.round(data.wins.A/t*100) : 0}% B:{t > 0 ? Math.round(data.wins.B/t*100) : 0}% 무:{t > 0 ? Math.round((data.wins.draw||0)/t*100) : 0}%</p></div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // { title, content }

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 핵심 지표만 먼저 로드 (빠른 첫 화면)
      const s = await getAdminStats();
      setStats(s);
      setLoading(false);
      // 나머지 탭 데이터는 백그라운드에서 병렬 로드
      const [a, t, an] = await Promise.all([
        getAdminAI(), getAdminTrends(), getAdminAnalytics()
      ]);
      setAiStats(a); setTrends(t); setAnalytics(an);
    } catch (err) { console.error('대시보드 로딩 실패:', err); setLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F3F1EC] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3F1EC] pb-20">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2D4470] px-5 pt-12 pb-5">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="text-white/60"><ArrowLeft size={20} /></button>
          <h1 className="text-[20px] font-black text-white">운영 대시보드</h1>
          <span className="bg-[#6366f1] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ADMIN</span>
        </div>
        <p className="text-[11px] text-white/40">마지막 갱신: {new Date().toLocaleString('ko-KR')}</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mx-4 mt-4 bg-white rounded-xl p-1 shadow-sm">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${tab === i ? 'bg-[#6366f1] text-white' : 'text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {/* 탭 0: 핵심 지표 */}
        {tab === 0 && stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Users} label="DAU (일간 활성)" value={stats.dau} sub={`총 ${stats.totalUsers}명 가입`}
                onClick={() => setDetail({ title: '유저 현황', content: (
                  <div className="space-y-3">
                    <div className="flex justify-between text-[13px]"><span className="text-gray-500">총 가입자</span><span className="font-bold">{stats.totalUsers}명</span></div>
                    <div className="flex justify-between text-[13px]"><span className="text-gray-500">오늘 활성(DAU)</span><span className="font-bold">{stats.dau}명</span></div>
                    <p className="text-[11px] font-bold text-gray-400 mt-3 mb-1">등급 분포</p>
                    {stats.tierDist && Object.entries(stats.tierDist).map(([tier, cnt]) => (
                      <div key={tier} className="flex justify-between text-[12px]"><span>{tier}</span><span className="font-bold">{cnt}명</span></div>
                    ))}
                  </div>
                )})} />
              <StatCard icon={Gavel} label="총 판결 수" value={stats.totalVerdicts} color="#10b981"
                onClick={() => setDetail({ title: '논쟁 상세', content: (
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-gray-400 mb-1">모드별 분포</p>
                    {stats.debateByMode && Object.entries(stats.debateByMode).map(([mode, cnt]) => (
                      <div key={mode} className="flex justify-between text-[12px]"><span>{mode === 'duo' ? '1:1 대결' : mode === 'solo' ? '연습 모드' : mode === 'daily' ? '오늘의 논쟁' : '실시간 채팅'}</span><span className="font-bold">{cnt}건</span></div>
                    ))}
                    <p className="text-[11px] font-bold text-gray-400 mt-3 mb-1">상태별 분포</p>
                    {stats.debateByStatus && Object.entries(stats.debateByStatus).map(([status, cnt]) => (
                      <div key={status} className="flex justify-between text-[12px]"><span>{status}</span><span className="font-bold">{cnt}건</span></div>
                    ))}
                  </div>
                )})} />
              <StatCard icon={MessageSquare} label="총 논쟁 수" value={stats.totalDebates} color="#f59e0b"
                onClick={() => setDetail({ title: '논쟁 모드별 현황', content: (
                  <div className="space-y-2">
                    {stats.debateByMode && Object.entries(stats.debateByMode).map(([mode, cnt]) => (
                      <div key={mode} className="flex justify-between text-[12px]">
                        <span>{mode === 'duo' ? '1:1 대결' : mode === 'solo' ? '연습 모드' : mode === 'daily' ? '오늘의 논쟁' : '실시간 채팅'}</span>
                        <span className="font-bold">{cnt}건 ({stats.totalDebates > 0 ? Math.round(cnt / stats.totalDebates * 100) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                )})} />
              <StatCard icon={ThumbsUp} label="총 투표 수" value={stats.totalVotes} color="#3b82f6" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Shield} label="필터 차단" value={`${stats.filterBlocked}건`} color="#ef4444" sub="콘텐츠 필터"
                onClick={() => setDetail({ title: '콘텐츠 필터 상세', content: (
                  <div className="space-y-3">
                    <div className="flex justify-between text-[13px]"><span className="text-gray-500">총 차단 건수</span><span className="font-bold text-red-500">{stats.filterBlocked}건</span></div>
                    <p className="text-[11px] font-bold text-gray-400 mt-2 mb-1">단계별 차단 현황</p>
                    {stats.filterByStage && Object.keys(stats.filterByStage).length > 0
                      ? Object.entries(stats.filterByStage).map(([stage, cnt]) => (
                        <div key={stage} className="flex justify-between text-[12px] bg-red-50 rounded-lg px-3 py-2">
                          <span className="text-red-600">{stage} {stage === '1단계' ? '(비속어 사전)' : stage === '2단계' ? '(AI 유해성)' : '(주제 관련성)'}</span>
                          <span className="font-bold text-red-600">{cnt}건</span>
                        </div>
                      ))
                      : <p className="text-[12px] text-gray-400">차단 기록이 없습니다</p>
                    }
                  </div>
                )})} />
              <StatCard icon={Star} label="판결 만족도" value={stats.avgRating || '-'} color="#d4af37" sub={`${stats.ratingCount}건 평가`}
                onClick={() => setDetail({ title: '판결 만족도 상세', content: (
                  <div className="space-y-3">
                    <div className="flex justify-between text-[13px]"><span className="text-gray-500">평균 점수</span><span className="font-bold text-[#d4af37]">{stats.avgRating || '-'} / 5.0</span></div>
                    <div className="flex justify-between text-[13px]"><span className="text-gray-500">총 평가 수</span><span className="font-bold">{stats.ratingCount}건</span></div>
                    <p className="text-[11px] font-bold text-gray-400 mt-2 mb-1">별점 분포</p>
                    {stats.ratingDist && Object.entries(stats.ratingDist).reverse().map(([score, cnt]) => (
                      cnt > 0 && <div key={score} className="flex items-center gap-2 text-[12px]">
                        <span className="w-8 text-right font-bold">{score}점</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#d4af37] rounded-full" style={{ width: `${stats.ratingCount > 0 ? cnt / stats.ratingCount * 100 : 0}%` }} />
                        </div>
                        <span className="w-6 text-gray-400">{cnt}</span>
                      </div>
                    ))}
                  </div>
                )})} />
              <StatCard icon={Eye} label="오늘 페이지뷰" value={stats.todayPageViews} color="#8b5cf6" />
              <StatCard icon={MessageSquare} label="시민 의견" value={stats.totalComments} color="#06b6d4" sub="총 댓글" />
              <StatCard icon={CheckCircle} label="판결 완주율" value={`${stats.completionRate || 0}%`} color="#059669" sub="생성 대비 완료" />
              <StatCard icon={Share2} label="공유 수" value={stats.shareCount || 0} color="#8b5cf6" sub="판결+초대 공유" />
            </div>
          </div>
        )}

        {/* 탭 1: AI 성능 */}
        {tab === 1 && aiStats && (
          <div className="space-y-3">
            {aiStats.aiStats?.map(a => <AICard key={a.model} model={a.model} data={a} />)}
          </div>
        )}

        {/* 탭 2: 일/월간 추이 */}
        {tab === 2 && trends && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-[12px] font-bold text-gray-400 mb-3">일간 판결 수 (최근 14일)</p>
              <Bar data={{
                labels: trends.verdictTrends?.map(d => d.date.slice(5)),
                datasets: [{ data: trends.verdictTrends?.map(d => d.count), backgroundColor: '#6366f1', borderRadius: 4 }]
              }} options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} height={150} />
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-[12px] font-bold text-gray-400 mb-3">DAU 추이 (최근 14일)</p>
              <Bar data={{
                labels: trends.dauTrends?.map(d => d.date.slice(5)),
                datasets: [{ data: trends.dauTrends?.map(d => d.count), backgroundColor: '#3b82f6', borderRadius: 4 }]
              }} options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} height={150} />
            </div>

            {/* MAU 달력 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-bold text-gray-400">MAU 달력 ({trends.mauMonth})</p>
                <span className="text-[14px] font-black text-[#6366f1]">{trends.mauTotal}명</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['일','월','화','수','목','금','토'].map(d => (
                  <div key={d} className="text-[10px] font-bold text-gray-300 py-1">{d}</div>
                ))}
                {Array.from({ length: trends.mauFirstDayOfWeek || 0 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {trends.mauCalendar?.map(d => {
                  const today = new Date().getDate();
                  const isToday = d.day === today;
                  const intensity = d.count === 0 ? 'bg-gray-50 text-gray-300'
                    : d.count < 5 ? 'bg-blue-50 text-blue-500'
                    : d.count < 20 ? 'bg-blue-100 text-blue-600'
                    : d.count < 50 ? 'bg-blue-200 text-blue-700'
                    : 'bg-blue-400 text-white';
                  return (
                    <div key={d.day} className={`rounded-lg py-1.5 text-[11px] font-bold ${intensity} ${isToday ? 'ring-2 ring-[#6366f1]' : ''}`}>
                      <div className="text-[10px] opacity-60">{d.day}</div>
                      <div>{d.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 탭 3: 방문자 분석 */}
        {tab === 3 && analytics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Eye} label="총 페이지뷰" value={analytics.totalPageViews} color="#8b5cf6" />
              <StatCard icon={Zap} label="총 이벤트" value={analytics.totalEvents} color="#f59e0b" />
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-[12px] font-bold text-gray-400 mb-3">인기 페이지 (Top 10)</p>
              <div className="space-y-2">
                {analytics.topPages?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#1B2A4A] font-medium truncate flex-1">{p.path}</span>
                    <span className="text-gray-400 ml-2">{p.count}</span>
                    <span className="text-gray-300 ml-2 w-12 text-right">{p.ratio}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-[12px] font-bold text-gray-400 mb-3">이벤트 유형 분포</p>
              <div className="space-y-2">
                {analytics.eventDist?.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#1B2A4A] font-medium">{e.name} <span className="text-gray-400">{{ verdict_view: '(판결 열람)', debate_create: '(논쟁 생성)', vote_cast: '(투표)', comment_create: '(댓글 작성)', share: '(공유)' }[e.name] || ''}</span></span>
                    <span className="text-gray-400">{e.count}건 ({e.ratio}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[500] flex items-end justify-center"
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                <h3 className="text-[16px] font-black text-[#1B2A4A]">{detail.title}</h3>
                <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="px-5 py-4 overflow-y-auto flex-1">
                {detail.content}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

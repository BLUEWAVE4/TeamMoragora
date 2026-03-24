import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAdminStats, getAdminAI, getAdminTrends, getAdminAnalytics } from '../services/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { ArrowLeft, Users, Gavel, MessageSquare, ThumbsUp, Shield, Star, TrendingUp, Eye, Zap } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const TABS = ['핵심 지표', 'AI 성능', '일간 추이', '방문자 분석'];

function StatCard({ icon: Icon, label, value, sub, color = '#6366f1' }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold text-gray-400">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="text-[28px] font-black text-[#1B2A4A] leading-none">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function AICard({ model, data }) {
  const colors = { 'gpt-4o': '#4285F4', 'gemini-2.5-flash': '#10A37F', 'claude-sonnet': '#D97706' };
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

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, a, t, an] = await Promise.all([
        getAdminStats(), getAdminAI(), getAdminTrends(), getAdminAnalytics()
      ]);
      setStats(s.data); setAiStats(a.data); setTrends(t.data); setAnalytics(an.data);
    } catch (err) { console.error('대시보드 로딩 실패:', err); }
    setLoading(false);
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
              <StatCard icon={Users} label="DAU (일간 활성)" value={stats.dau} sub={`총 ${stats.totalUsers}명 가입`} />
              <StatCard icon={Gavel} label="총 판결 수" value={stats.totalVerdicts} color="#10b981" />
              <StatCard icon={MessageSquare} label="총 논쟁 수" value={stats.totalDebates} color="#f59e0b" />
              <StatCard icon={ThumbsUp} label="총 투표 수" value={stats.totalVotes} color="#3b82f6" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Shield} label="필터 차단" value={`${stats.filterBlocked}건`} color="#ef4444" sub="콘텐츠 필터" />
              <StatCard icon={Star} label="판결 만족도" value={stats.avgRating || '-'} color="#d4af37" sub={`${stats.ratingCount}건 평가`} />
              <StatCard icon={Eye} label="오늘 페이지뷰" value={stats.todayPageViews} color="#8b5cf6" />
              <StatCard icon={MessageSquare} label="시민 의견" value={stats.totalComments} color="#06b6d4" sub="총 댓글" />
            </div>
          </div>
        )}

        {/* 탭 1: AI 성능 */}
        {tab === 1 && aiStats && (
          <div className="space-y-3">
            {aiStats.aiStats?.map(a => <AICard key={a.model} model={a.model} data={a} />)}
          </div>
        )}

        {/* 탭 2: 일간 추이 */}
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
                    <span className="text-[#1B2A4A] font-medium">{e.name}</span>
                    <span className="text-gray-400">{e.count}건 ({e.ratio}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

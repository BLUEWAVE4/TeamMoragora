import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { supabase } from '../services/supabase';
import api from '../services/api'; 
import VerdictDetailModal from './VerdictDetailModal';
import { motion, AnimatePresence } from 'framer-motion';

// 📈 iOS 스타일 부드러운 숫자 카운팅
const CountUp = ({ end }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 40; 
    const increment = end / duration;
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 20);
    return () => clearInterval(timer);
  }, [end]);
  return <span>{count.toLocaleString()}</span>;
};

// 🕸️ 직접 구현한 SVG 방사형 차트
const RadarChart = ({ data }) => {
  const size = 220;
  const center = size / 2;
  const radius = size * 0.35;
  const angleStep = (Math.PI * 2) / data.length;

  const points = data.map((d, i) => {
    const r = radius * (d.val / 100);
    const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
    const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex justify-center items-center py-6">
      <svg width={size} height={size}>
        {[0.5, 1].map((m) => (
          <polygon key={m} points={data.map((_, i) => {
            const x = center + radius * m * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + radius * m * Math.sin(i * angleStep - Math.PI / 2);
            return `${x},${y}`;
          }).join(' ')} fill="none" stroke="#E5E5EA" strokeWidth="1" />
        ))}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          points={points}
          fill="rgba(0, 122, 255, 0.15)"
          stroke="#007AFF"
          strokeWidth="2.5"
        />
        {data.map((d, i) => {
          const x = center + (radius + 28) * Math.cos(i * angleStep - Math.PI / 2);
          const y = center + (radius + 15) * Math.sin(i * angleStep - Math.PI / 2);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" fontSize="11" fontWeight="800" fill="#8E8E93">
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [myJudgments, setMyJudgments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerdict, setSelectedVerdict] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  // 📝 나의 논쟁 리스트 더미 데이터
  const dummyDebates = [
    { id: 1, title: "탕수육 찍먹 vs 부먹, 진정한 미식가는?", date: "2026.03.05", status: "승리", category: "음식" },
    { id: 2, title: "연인 사이에 깻잎 논쟁, 허용 가능한가?", date: "2026.03.02", status: "패배", category: "연애" },
    { id: 3, title: "재택근무 vs 사무실 출근, 업무 효율의 승자는?", date: "2026.02.25", status: "승리", category: "직장" },
  ];

  const wins = profileData?.wins || 0;
  const losses = profileData?.losses || 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const getTier = (pts) => {
    if (pts >= 10000) return { name: '레전드', color: '#FF9500' };
    if (pts >= 5000) return { name: '다이아', color: '#007AFF' };
    if (pts >= 2500) return { name: '플래티넘', color: '#34C759' };
    if (pts >= 1000) return { name: '골드', color: '#FFCC00' };
    if (pts >= 500) return { name: '실버', color: '#8E8E93' };
    return { name: '브론즈', color: '#A2845E' };
  };
  const tier = getTier(profileData?.total_score || 0);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [pRes, vRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/profiles/me/verdicts')
        ]);
        const profile = pRes.data || pRes;
        setProfileData(profile);
        setNewNickname(profile.nickname || '');
        setMyJudgments(Array.isArray(vRes.data) ? vRes.data : []);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchAllData();
  }, [user]);

  const handleUpdateNickname = async () => {
    if (!newNickname.trim()) return;
    setLoading(true);
    try {
      await api.patch('/auth/me', { nickname: newNickname });
      setIsEditing(false);
      window.location.reload(); 
    } catch (err) {
      alert('변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    try {
      await api.post('/auth/logout');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      await supabase.auth.signOut();
      window.location.href = '/';
    }
  };

  if (!user) return <div className="h-screen flex items-center justify-center text-gray-400 font-medium bg-[#F2F2F7]">로그인이 필요합니다.</div>;

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-32 font-[-apple-system,BlinkMacSystemFont,sans-serif]">
      
      {/* 🍏 iOS 내비게이션 바 */}
      <nav className="sticky top-0 z-50 bg-[#F2F2F7]/80 backdrop-blur-xl px-5 h-14 flex items-center justify-between border-b border-gray-200/50">
        <h1 className="text-[17px] font-semibold text-black">프로필</h1>
        <div className="flex gap-4">
          <button onClick={() => setIsEditing(!isEditing)} className="text-[#007AFF] text-[17px] active:opacity-30 transition-opacity font-medium">
            {isEditing ? '취소' : '편집'}
          </button>
          {!isEditing && (
            <button onClick={handleLogout} className="text-[#FF3B30] text-[17px] active:opacity-30 transition-opacity font-medium">로그아웃</button>
          )}
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 pt-8">
        
        {/* ✨ 프로필 메인 섹션 (편집 애니메이션 포함) */}
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            animate={{ scale: isEditing ? 1.05 : 1 }}
            className="w-24 h-24 rounded-full bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center shadow-inner mb-4 relative overflow-hidden"
          >
            <span className="text-4xl font-light text-white">{(newNickname || 'U').charAt(0)}</span>
            {isEditing && (
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-white text-[10px] font-bold">변경</div>
            )}
          </motion.div>

          <div className="h-16 flex flex-col items-center justify-center w-full">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div key="edit" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex flex-col items-center gap-2 w-full">
                  <input 
                    autoFocus
                    value={newNickname} 
                    onChange={(e) => setNewNickname(e.target.value)} 
                    className="w-2/3 bg-white rounded-xl px-4 py-2 text-center text-xl font-bold outline-none shadow-sm border border-gray-200"
                  />
                  <button onClick={handleUpdateNickname} className="text-[#007AFF] text-sm font-bold tracking-tight">저장하기</button>
                </motion.div>
              ) : (
                <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-2xl font-bold text-black tracking-tight">{newNickname || '사용자'}님</h2>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black text-white uppercase">{tier.name}</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1 font-medium italic">"논거의 달인" (상위 8%)</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 📊 대시보드 그리드 */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <span className="text-[11px] font-bold text-[#8E8E93] uppercase mb-1 block">총 포인트</span>
            <div className="text-2xl font-bold text-black"><CountUp end={profileData?.total_score || 2450} /></div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <span className="text-[11px] font-bold text-[#8E8E93] uppercase mb-1 block">전체 승률</span>
            <div className="text-2xl font-bold text-[#007AFF]">{winRate || 78}%</div>
          </div>
        </div>

        {/* 🔍 나의 논리 프로필 분석 버튼 */}
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsSheetOpen(true)}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mb-8"
        >
          <span className="text-[15px] font-bold text-black">나의 논리 프로필 분석</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </motion.button>

        {/* 📜 나의 논쟁 리스트 섹션 (서버 연결용) */}
        <div className="mb-10">
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-3 ml-1">나의 논쟁 리스트</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {dummyDebates.map((debate) => (
              <motion.div 
                key={debate.id}
                whileTap={{ backgroundColor: "#F9F9F9" }}
                className="p-4 flex items-center justify-between cursor-pointer"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      debate.status === '승리' ? 'bg-blue-50 text-[#007AFF]' : 'bg-red-50 text-[#FF3B30]'
                    }`}>
                      {debate.status}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">{debate.date}</span>
                  </div>
                  <h4 className="text-[15px] font-semibold text-black line-clamp-1">{debate.title}</h4>
                </div>
                <div className="flex items-center gap-1 text-[#C7C7CC]">
                  <span className="text-[12px] font-medium text-gray-300">{debate.category}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </motion.div>
            ))}
          </div>
          <button className="w-full py-4 text-[#007AFF] text-[14px] font-semibold active:opacity-30 transition-opacity">
            전체 기록 보기
          </button>
        </div>
      </div>

      {/* 📥 논리 프로필 바텀시트 (드래그 기능 포함) */}
      <AnimatePresence>
        {isSheetOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSheetOpen(false)}
              className="fixed inset-0 bg-black/30 z-[100] backdrop-blur-sm"
            />
            <motion.div 
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setIsSheetOpen(false); }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[30px] max-h-[90vh] overflow-y-auto pb-12 shadow-2xl"
            >
              <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto my-4" />
              <div className="px-6">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-xl font-bold text-black">나의 논리 프로필</h3>
                  <span className="text-[11px] text-gray-400 font-medium">업데이트: 2026-02-18</span>
                </div>

                <div className="bg-[#F9F9F9] rounded-[24px] mb-6 border border-gray-50">
                  <RadarChart data={[
                    { label: '논거 구성력', val: 92 },
                    { label: '논리 일관성', val: 88 },
                    { label: '인용/근거', val: 85 },
                    { label: '반박력', val: 78 },
                    { label: '감정 제어', val: 71 },
                  ]} />
                </div>

                <div className="bg-[#F2F2F7] rounded-2xl p-5 mb-8">
                  <h4 className="text-[12px] font-bold text-gray-400 uppercase mb-3 tracking-tight">강점 분석 (TOP 3)</h4>
                  <ul className="text-[14px] font-medium text-black/80 space-y-2">
                    <li>• <span className="font-bold text-black">논거 구성력:</span> 주장의 구조화가 매우 탄탄합니다.</li>
                    <li>• <span className="font-bold text-black">논리 일관성:</span> 논쟁 전반에 걸쳐 일관된 입장을 유지합니다.</li>
                    <li>• <span className="font-bold text-black">인용/근거:</span> 객관적인 지표를 활용한 설득력이 높습니다.</li>
                  </ul>
                </div>

                <h4 className="text-[12px] font-bold text-[#8E8E93] uppercase mb-4 ml-1 tracking-widest">Category Expertise</h4>
                <div className="space-y-3 mb-8">
                  {[
                    { cat: '연애/관계', count: 47, rate: 89, color: '#FF2D55' },
                    { cat: '직장/업무', count: 31, rate: 76, color: '#007AFF' },
                    { cat: '생활/습관', count: 28, rate: 71, color: '#34C759' },
                    { cat: '사회/이슈', count: 12, rate: 52, color: '#FF9500' },
                  ].map((item) => (
                    <div key={item.cat} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: item.color }} />
                        <div>
                          <p className="text-[14px] font-bold text-black">{item.cat}</p>
                          <p className="text-[11px] text-gray-400">{item.count}건</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[16px] font-black text-[#007AFF]">{item.rate}%</p>
                        <p className="text-[9px] font-bold text-gray-300 uppercase italic">Win</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setIsSheetOpen(false)} className="w-full py-4.5 bg-black text-white font-bold rounded-2xl active:scale-95 transition-all">확인</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <VerdictDetailModal selectedVerdict={selectedVerdict} onClose={() => setSelectedVerdict(null)} />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { supabase } from '../services/supabase';
import api from '../services/api'; 
import VerdictDetailModal from './VerdictDetailModal';
import TierModal from './TierModal';
import LogicChartModal from './LogicChartModal'; 

const CountUp = ({ end, duration = 1000 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const target = Number(end) || 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return <span>{count.toLocaleString()}</span>;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [myJudgments, setMyJudgments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerdict, setSelectedVerdict] = useState(null);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [isLogicModalOpen, setIsLogicModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleUpdateNickname = async () => {
    try {
      if (!newNickname.trim()) return alert('닉네임을 입력해주세요!');
      
      // 서버 API로 닉네임 업데이트
      await api.patch('/auth/me', { nickname: newNickname });
      
      alert('변경되었습니다!');
      setIsEditing(false);
      window.location.reload();
    } catch (err) {
      console.error("Update Error:", err);
      alert('수정 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        
        // 1. 프로필 정보 (서버 API 우선)
        const response = await api.get('/auth/me');
        const profile = response.data || response;
        setProfileData(profile);

        // 2. 판결 기록 조회
        const vResponse = await api.get('/profiles/me/verdicts');
        const finalData = vResponse.data || vResponse;
        setMyJudgments(Array.isArray(finalData) ? finalData : []);
        
        // 3. 닉네임 설정 (서버 profile -> supabase metadata 순)
        setNewNickname(profile.nickname || user.user_metadata?.nickname || '');
        
      } catch (error) {
        console.error("데이터 로드 중 에러 발생:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [user]);

  if (!user) return <div className="py-20 text-center font-bold text-gray-400">로그인이 필요합니다.</div>;

  return (
    <div className="flex flex-col gap-6 p-5 pb-24 max-w-md mx-auto min-h-screen bg-[#F8F9FA] font-sans relative">
      <div className="bg-[#2D3350] rounded-[40px] p-8 pb-16 text-center text-white shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-center pb-6 px-1">
          <h1 className="text-xl font-black italic tracking-tighter">MY</h1>
          <div className="flex gap-3 text-xs font-bold">
            <button onClick={() => setIsEditing(!isEditing)} className="text-gray-400 hover:text-white transition-colors">정보수정</button>
            <button onClick={handleLogout} className="text-red-400">로그아웃</button>
          </div>
        </div>

        <div className="w-20 h-20 rounded-full bg-[#FFBD43] flex items-center justify-center text-3xl font-black text-[#2D3350] mx-auto mb-4 border-4 border-white/10 shadow-lg">
          {(newNickname || '준').charAt(0)}
        </div>
        
        {isEditing ? (
          <div className="flex flex-col gap-2 px-4 mb-4">
            <input 
              type="text" value={newNickname} 
              onChange={(e) => setNewNickname(e.target.value)}
              className="w-full p-2 bg-white/10 rounded-xl border border-white/20 text-center text-sm outline-none text-white focus:bg-white/20"
            />
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 text-[10px] py-2 bg-white/5 rounded-lg font-bold">취소</button>
              <button onClick={handleUpdateNickname} className="flex-1 text-[10px] py-2 bg-[#FFBD43] text-[#2D3350] font-black rounded-lg">저장</button>
            </div>
          </div>
        ) : (
          <h2 className="text-xl font-black mb-1 text-white">{newNickname || '사용자'}님</h2>
        )}
        
        <div className="flex flex-col items-center gap-3 mt-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsTierModalOpen(true)} className="px-4 py-1.5 bg-[#FFBD43]/20 text-[#FFBD43] text-[11px] font-black rounded-full border border-[#FFBD43]/30 active:scale-95 transition-all shadow-sm">⚖️ 수습 배심원</button>
            <button onClick={() => setIsLogicModalOpen(true)} className="px-4 py-1.5 bg-white/10 text-white text-[11px] font-black rounded-full border border-white/20 active:scale-95 transition-all hover:bg-white/20 shadow-sm">📊 논리 분석</button>
          </div>
          <div className="flex items-center gap-4 bg-white/5 px-5 py-2 rounded-2xl border border-white/5">
            <div className="text-center">
              <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Ranking</p>
              <p className="text-sm font-black text-white">#8</p>
            </div>
            <div className="w-[1px] h-6 bg-white/10"></div>
            <div className="text-center">
              <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Points</p>
              <p className="text-sm font-black text-[#FFBD43]"><CountUp end={profileData?.total_score || 0} />pt</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[35px] p-6 shadow-sm border border-gray-100 -mt-12 mx-4 z-10">
        <div className="flex justify-around text-center items-center">
          <div className="flex-1"><p className="text-2xl font-black text-[#22C55E]"><CountUp end={profileData?.wins || 0} /></p><p className="text-[10px] font-black text-gray-300 uppercase">Wins</p></div>
          <div className="w-px h-8 bg-gray-100 mx-4"></div>
          <div className="flex-1"><p className="text-2xl font-black text-[#EF4444]"><CountUp end={profileData?.losses || 0} /></p><p className="text-[10px] font-black text-gray-300 uppercase">Losses</p></div>
          <div className="w-px h-8 bg-gray-100 mx-4"></div>
          <div className="flex-1"><p className="text-2xl font-black text-gray-400"><CountUp end={profileData?.draws || 0} /></p><p className="text-[10px] font-black text-gray-300 uppercase">Draws</p></div>
        </div>
      </div>

      <section className="flex flex-col gap-4 px-2 mt-2">
        <h3 className="font-black text-[#2D3350] text-lg">나의 판결 기록</h3>
        <div className="flex flex-col gap-3">
          {myJudgments.length > 0 ? myJudgments.map((item) => {
            const debateInfo = item.debate || item.debates || {};
            const isWin = item.is_win ?? (item.voted_side === debateInfo.win_side);
            return (
              <div key={item.id} onClick={() => setSelectedVerdict(item)} className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-50 flex justify-between items-center cursor-pointer active:scale-95">
                <div className="flex flex-col gap-1 pr-4 flex-1">
                  <h4 className="text-[14px] font-extrabold text-[#2D3350] line-clamp-2">{debateInfo.topic || "참여한 논쟁"}</h4>
                  <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-300">{new Date(item.created_at).toLocaleDateString()}</span></div>
                </div>
                <div className={`shrink-0 w-14 h-14 rounded-[22px] flex flex-col items-center justify-center font-black ${isWin ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                  <span className="text-[9px] opacity-60">{isWin ? 'WIN' : 'LOSE'}</span>
                  <span className="text-base">{isWin ? '승' : '패'}</span>
                </div>
              </div>
            );
          }) : <div className="py-20 text-center text-gray-300 font-bold bg-white rounded-[32px]">기록이 없습니다.</div>}
        </div>
      </section>

      {selectedVerdict && <VerdictDetailModal selectedVerdict={selectedVerdict} onClose={() => setSelectedVerdict(null)} />}
      <TierModal isOpen={isTierModalOpen} onClose={() => setIsTierModalOpen(false)} />
      <LogicChartModal isOpen={isLogicModalOpen} onClose={() => setIsLogicModalOpen(false)} />
    </div>
  );
}
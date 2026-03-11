import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import api from '../services/api';
import VerdictDetailModal from './VerdictDetailModal';
import TierModal from './TierModal';
import LogicChartModal from './LogicChartModal';
import FeedbackModal from './FeedbackModal';

const CountUp = ({ end, duration = 1000 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
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
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error("Logout Error:", err);
      await supabase.auth.signOut();
      window.location.href = '/';
    }
  };

  const handleUpdateNickname = async () => {
    if (!newNickname.trim()) return alert('닉네임을 입력해주세요!');
    setLoading(true);
    try {
      await api.patch('/auth/me', { nickname: newNickname });
      alert('닉네임이 성공적으로 변경되었습니다!');
      setIsEditing(false);
      window.location.reload(); 
    } catch (err) {
      console.error("Update Error:", err);
      alert('닉네임 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const response = await api.get('/auth/me');
        const profile = response.data || response;
        setProfileData(profile);
        setNewNickname(profile.nickname || '');
        const vResponse = await api.get('/profiles/me/verdicts');
        setMyJudgments(Array.isArray(vResponse.data) ? vResponse.data : []);
      } catch (error) {
        console.error("Fetch Data Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [user]);

  if (!user) return <div className="py-20 text-center font-bold text-gray-400">로그인이 필요합니다.</div>;

  return (
    <div className="flex flex-col gap-6 p-5 pb-24 max-w-md mx-auto min-h-screen bg-[#F8F9FA] font-sans relative">
      <div className="bg-[#2D3350] rounded-[40px] p-8 pb-16 text-center text-white shadow-xl relative overflow-hidden border border-white/10">
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
            <input type="text" value={newNickname} onChange={(e) => setNewNickname(e.target.value)} className="w-full p-2 bg-white/10 rounded-xl border border-white/20 text-center outline-none text-white text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 text-[10px] py-2 bg-white/5 rounded-lg">취소</button>
              <button onClick={handleUpdateNickname} className="flex-1 text-[10px] py-2 bg-[#FFBD43] text-[#2D3350] font-black rounded-lg">저장</button>
            </div>
          </div>
        ) : (
          <h2 className="text-xl font-black mb-1 text-white">{newNickname || '사용자'}님</h2>
        )}
        <div className="flex items-center gap-4 bg-white/5 px-5 py-2 rounded-2xl border border-white/5 mx-auto w-fit mt-4">
            <div className="text-center">
              <p className="text-[9px] font-black text-gray-400 uppercase">Ranking</p>
              <p className="text-sm font-black text-white">#8</p>
            </div>
            <div className="w-[1px] h-6 bg-white/10"></div>
            <div className="text-center">
              <p className="text-[9px] font-black text-gray-400 uppercase">Points</p>
              <p className="text-sm font-black text-[#FFBD43]"><CountUp end={profileData?.total_score || 0} />pt</p>
            </div>
        </div>
      </div>
      <div className="bg-white rounded-[35px] p-6 shadow-sm border border-gray-100 -mt-12 mx-4 z-10">
        <div className="flex justify-around text-center items-center">
          <div><p className="text-2xl font-black text-[#22C55E]"><CountUp end={profileData?.wins || 0} /></p><p className="text-[10px] font-black text-gray-300 uppercase">Wins</p></div>
          <div className="w-px h-8 bg-gray-100"></div>
          <div><p className="text-2xl font-black text-[#EF4444]"><CountUp end={profileData?.losses || 0} /></p><p className="text-[10px] font-black text-gray-300 uppercase">Losses</p></div>
          <div className="w-px h-8 bg-gray-100"></div>
          <div><p className="text-2xl font-black text-gray-400"><CountUp end={profileData?.draws || 0} /></p><p className="text-[10px] font-black text-gray-300 uppercase">Draws</p></div>
        </div>
      </div>
      <section className="flex flex-col gap-4 px-2 mt-2">
        <h3 className="font-black text-[#2D3350] text-lg">나의 판결 기록</h3>
        <div className="flex flex-col gap-3">
          {myJudgments.length > 0 ? myJudgments.map((item) => (
            <div key={item.id} onClick={() => setSelectedVerdict(item)} className="bg-white p-5 rounded-[28px] shadow-sm flex justify-between items-center cursor-pointer active:scale-95 transition-transform">
              <div className="flex flex-col gap-1 pr-4 flex-1">
                <h4 className="text-[14px] font-extrabold text-[#2D3350] line-clamp-2">{item.debate?.topic || "참여한 논쟁"}</h4>
                <span className="text-[10px] font-bold text-gray-300">{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center font-black ${item.is_win ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                {item.is_win ? '승' : '패'}
              </div>
            </div>
          )) : (
            <div className="py-20 text-center text-gray-300 font-bold bg-white rounded-[32px] border-2 border-dashed border-gray-100">기록이 없습니다.</div>
          )}
        </div>
      </section>
      {/* 서비스 평가 버튼 */}
      <div className="px-2 mt-2">
        <button
          onClick={() => setIsFeedbackOpen(true)}
          className="w-full py-4 bg-white rounded-[28px] shadow-sm border border-gray-100 text-sm font-bold text-[#2D3350] active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <span className="text-lg">&#9997;</span> 서비스 평가하기
        </button>
      </div>

      <div className="px-2 mt-1 mb-2">
        <Link to="/privacy" className="text-[11px] text-gray-300 hover:text-gray-500 underline">개인정보처리방침</Link>
      </div>

      <VerdictDetailModal selectedVerdict={selectedVerdict} onClose={() => setSelectedVerdict(null)} />
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}
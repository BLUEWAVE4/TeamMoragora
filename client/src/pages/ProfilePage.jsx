import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { supabase } from '../services/supabase';

// API 설정 (서버 통신용)
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export default function ProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [myJudgments, setMyJudgments] = useState([]); // 서버에서 받을 판결 기록
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  // 로그아웃 로직
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // 닉네임 수정 로직
  const handleUpdateNickname = async () => {
    try {
      if (!newNickname.trim()) return alert('닉네임을 입력해주세요!');
      const { error } = await supabase.auth.updateUser({ data: { nickname: newNickname } });
      if (error) throw error;
      alert('닉네임이 변경되었습니다!');
      setIsEditing(false);
    } catch (error) {
      alert('수정 실패: ' + error.message);
    }
  };

  // 💡 통합 데이터 로드 (Supabase 전적 + 서버 판결 기록)
  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      try {
        setLoading(true);

        // 1. Supabase에서 전적 데이터 가져오기
        const { data: stats, error: statsError } = await supabase
          .from('profiles')
          .select('wins, losses, draws, total_score')
          .eq('id', user.id)
          .single();
        if (!statsError) setProfileData(stats);

        // 2. 서버에서 판결 기록 가져오기 (준민님 토큰 방식 적용)
        const rawData = localStorage.getItem('sb-gdswoatbmglwdbchdznq-auth-token');
        const authData = rawData ? JSON.parse(rawData) : null;
        const token = authData?.access_token;

        const verdictRes = await api.get('/profiles/me/verdicts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setMyJudgments(verdictRes.data || []);

        setNewNickname(user.user_metadata?.nickname || user.user_metadata?.name || '');
      } catch (error) {
        console.error("데이터 통합 로드 실패:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  if (!user) return <div className="py-20 text-center font-bold">로그인이 필요합니다.</div>;

  const userNickname = user.user_metadata?.nickname || user.user_metadata?.name || '사용자';

  return (
    <div className="flex flex-col gap-6 p-5 pb-24 max-w-md mx-auto min-h-screen bg-[#F8F9FA]">
      
      {/* 💡 상단 메뉴 */}
      <div className="flex justify-between items-center pt-2 px-1">
        <h1 className="text-xl font-bold text-[#2D3350]">프로필</h1>
        <div className="flex gap-3 items-center">
          <button onClick={() => setIsEditing(!isEditing)} className="text-xs font-bold text-gray-400 hover:text-[#FFBD43]">정보수정</button>
          <span className="text-[10px] text-gray-200">|</span>
          <button onClick={handleLogout} className="text-xs font-bold text-gray-400 hover:text-red-400">로그아웃</button>
        </div>
      </div>

      {/* 👤 메인 프로필 섹션 (Dark 디자인) */}
      <div className="bg-[#2D3350] rounded-[40px] p-8 shadow-xl text-center text-white relative overflow-hidden">
        <div className="w-24 h-24 rounded-full bg-[#FFBD43] flex items-center justify-center text-4xl font-black text-[#2D3350] mx-auto border-4 border-white/20 shadow-inner mb-6">
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} className="w-full h-full rounded-full object-cover" />
          ) : (
            userNickname.charAt(0)
          )}
        </div>
        
        <h2 className="text-2xl font-extrabold mb-4">{userNickname}님</h2>

        <div className="flex gap-2 justify-center mb-2">
          <span className="px-3 py-1 bg-[#FFBD43]/20 text-[#FFBD43] text-xs font-bold rounded-full border border-[#FFBD43]/30">⚖️ 수습 변호사</span>
          <span className="px-3 py-1 bg-white/10 text-white/80 text-xs font-bold rounded-full border border-white/10">🔥 {myJudgments.length}회 참여</span>
        </div>

        {isEditing && (
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-xl text-left animate-in fade-in zoom-in duration-200">
            <label className="text-[10px] font-bold text-gray-400 ml-1">닉네임 변경</label>
            <input type="text" value={newNickname} onChange={(e) => setNewNickname(e.target.value)} className="w-full mt-1 p-3 bg-gray-50 rounded-xl text-sm text-[#2D3350] mb-3 outline-none ring-1 ring-gray-100 focus:ring-[#FFBD43]" />
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-bold text-gray-500">취소</button>
              <button onClick={handleUpdateNickname} className="flex-1 py-2.5 bg-[#2D3350] rounded-xl text-sm font-bold text-white">저장</button>
            </div>
          </div>
        )}
      </div>

      {/* 📊 전적 대시보드 */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative -mt-10 mx-3 z-10">
        <div className="flex justify-around items-center text-center">
          <div>
            <p className="text-3xl font-black text-[#22C55E]">{profileData?.wins || 0}</p>
            <p className="text-xs font-bold text-[#22C55E] mt-1">승리</p>
          </div>
          <div className="h-10 w-px bg-gray-100"></div>
          <div>
            <p className="text-3xl font-black text-[#EF4444]">{profileData?.losses || 0}</p>
            <p className="text-xs font-bold text-[#EF4444] mt-1">패배</p>
          </div>
          <div className="h-10 w-px bg-gray-100"></div>
          <div>
            <p className="text-3xl font-black text-gray-400">{profileData?.draws || 0}</p>
            <p className="text-xs font-bold text-gray-400 mt-1">무승부</p>
          </div>
        </div>
      </div>

      {/* 💰 포인트 카드 */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mx-3">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-1">총 포인트</p>
            <p className="text-3xl font-black text-[#2D3350]">
              {(profileData?.total_score || 0).toLocaleString()}
              <span className="text-lg font-bold text-gray-400 ml-1.5">P</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#FFBD43]/10 flex items-center justify-center text-[#FFBD43] font-black text-xl shadow-inner">
            $
          </div>
        </div>
      </div>

      {/* ⚖️ 실시간 나의 판결 기록 리스트 (디자인 통합!) */}
      <section className="flex flex-col gap-4 mt-2 mx-3">
        <h3 className="font-bold text-lg text-[#2D3350]">나의 판결 기록</h3>
        
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-gray-100 text-gray-300 font-bold">
              판결 리스트를 불러오는 중입니다...
            </div>
          ) : myJudgments.length > 0 ? (
            myJudgments.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="px-3 py-1 bg-gray-50 text-[#2D3350] text-[10px] font-black rounded-lg uppercase border border-gray-100">
                    #{item.debate?.category || '일상'}
                  </span>
                  <span className="text-[10px] font-bold text-gray-300">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#2D3350] leading-tight">
                  {item.debate?.topic}
                </h3>
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-400 italic">My:</span>
                    <span className={`text-[12px] font-black ${item.voted_side === 'A' ? 'text-teal-500' : 'text-rose-400'}`}>
                      {item.voted_side === 'A' ? 'SIDE A 선택' : 'SIDE B 선택'}
                    </span>
                  </div>
                  <div className="text-[9px] font-black text-white bg-[#2D3350] px-3 py-1 rounded-full uppercase tracking-tighter">
                    COMPLETED
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-gray-100 text-gray-300 text-sm font-bold">
              아직 참여한 판결이 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
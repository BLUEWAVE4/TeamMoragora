import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { supabase } from '../services/supabase';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

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

  // 💡 준민님이 연동된다고 하신 그 로직 그대로!
  useEffect(() => {
    const fetchProfileStats = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('wins, losses, draws, total_score')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfileData(data);
        setNewNickname(user.user_metadata?.nickname || user.user_metadata?.name || '');
      } catch (error) {
        console.error("전적 데이터 로드 실패:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileStats();
  }, [user]);

  if (!user) return <div className="py-20 text-center font-bold">로그인이 필요합니다.</div>;

  const userNickname = user.user_metadata?.nickname || user.user_metadata?.name || '사용자';

  return (
    <div className="flex flex-col gap-6 p-5 pb-24 max-w-md mx-auto min-h-screen bg-[#F8F9FA]">
      
      {/* 💡 상단 메뉴 구성 */}
      <div className="flex justify-between items-center pt-2 px-1">
        <h1 className="text-xl font-bold text-[#2D3350]">프로필</h1>
        <div className="flex gap-3 items-center">
          <button onClick={() => setIsEditing(!isEditing)} className="text-xs font-bold text-gray-400 hover:text-[#FFBD43]">정보수정</button>
          <span className="text-[10px] text-gray-200">|</span>
          <button onClick={handleLogout} className="text-xs font-bold text-gray-400 hover:text-red-400">로그아웃</button>
        </div>
      </div>

      {/* 👤 메인 프로필 섹션 */}
      <div className="bg-[#2D3350] rounded-3xl p-8 shadow-xl text-center text-white relative overflow-hidden">
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
          <span className="px-3 py-1 bg-white/10 text-white/80 text-xs font-bold rounded-full border border-white/10">🔥 7일 연속</span>
        </div>

        {isEditing && (
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-xl text-left">
            <label className="text-[10px] font-bold text-gray-400 ml-1">닉네임 변경</label>
            <input type="text" value={newNickname} onChange={(e) => setNewNickname(e.target.value)} className="w-full mt-1 p-3 bg-gray-50 rounded-xl text-sm text-[#2D3350] mb-3 outline-none ring-1 ring-gray-100 focus:ring-[#FFBD43]" />
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-bold text-gray-500">취소</button>
              <button onClick={handleUpdateNickname} className="flex-1 py-2.5 bg-[#2D3350] rounded-xl text-sm font-bold text-white">저장</button>
            </div>
          </div>
        )}
      </div>

      {/* 📊 전적 대시보드 (DB 연동 확실!) */}
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

      {/* 포인트 카드 */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mx-3">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-1">총점</p>
            <p className="text-3xl font-black text-[#2D3350]">
              {(profileData?.total_score || 0).toLocaleString()}
              <span className="text-lg font-bold text-gray-400 ml-1.5">P</span>
            </p>
          </div>
          <div className="p-4 rounded-full bg-[#FFBD43]/10 text-[#FFBD43] font-black text-xl">$</div>
        </div>
      </div>

      {/* 나의 판결 기록 (임시 안내) */}
      <section className="flex flex-col gap-4 mt-2 mx-3">
        <h3 className="font-bold text-lg text-[#2D3350]">나의 판결 기록</h3>
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-gray-100 text-gray-300 text-sm">
          판결 리스트를 불러오는 중입니다.
        </div>
      </section>
    </div>
  );
}
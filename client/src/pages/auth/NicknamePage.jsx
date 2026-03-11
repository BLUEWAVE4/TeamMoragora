import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { trackEvent } from '../../services/analytics';

export default function NicknamePage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  // 소셜 로그인에서 가져온 기본 이름이 있다면 초기값으로 세팅 (사용자 편의성)
  const [nickname, setNickname] = useState(user?.user_metadata?.full_name || '');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 유효성 검사 로직
  const isInvalid = nickname.trim().length < 2 || !gender || age.length !== 2;

  const handleAgeChange = (e) => {
    const value = e.target.value;
    const onlyNumber = value.replace(/[^0-9]/g, '');
    const formattedNumber = onlyNumber.replace(/^0+/, '');
    if (onlyNumber.length <= 2) {
      setAge(onlyNumber);
    }
  };

  const adjustAge = (amount) => {
    const currentAge = parseInt(age) || 0;
    const newAge = Math.min(Math.max(currentAge + amount, 0), 99);
    setAge(newAge === 0 ? '' : newAge.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isInvalid || isLoading) return;

    setIsLoading(true);
    try {
      const { error } = await updateProfile({ nickname, gender, age });
      if (error) throw error;
      trackEvent('signup_complete', { gender, age: parseInt(age) });

      // 성공 피드백 후 이동
      navigate('/moragora', { replace: true });
    } catch (error) {
      alert('프로필 설정 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center pt-10 px-8 pb-12">
      <div className="w-full max-w-[340px]">
        
        {/* 상단 헤더 영역 */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4 animate-in zoom-in duration-500"></div>
          <h2 className="text-2xl font-black text-[#1a2744] tracking-tight">프로필 설정</h2>
          <p className="text-gray-400 mt-2 text-[13px] font-medium leading-relaxed">
            AI의 정확한 판결 분석을 위해<br/>성별과 나이 정보가 필요합니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          
          {/* 닉네임 입력 */}
          <div className="space-y-2">
            <label className="block text-[13px] font-extrabold text-[#1a2744] ml-1 uppercase tracking-wider">Nickname</label>
            <div className="relative group">
              <input
                type="text"
                className="w-full p-4.5 bg-white rounded-[22px] border border-gray-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-[#1a2744]/5 focus:border-[#1a2744]/20 transition-all text-[16px] font-medium placeholder:text-gray-300"
                placeholder="2~10자 이내"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={10}
              />
              {nickname.length > 0 && nickname.length < 2 && (
                <span className="absolute -bottom-5 left-2 text-[10px] text-red-400 font-bold">최소 2자 이상 입력해주세요.</span>
              )}
            </div>
          </div>

          {/* 성별 선택: 버튼 크기 및 액티브 상태 강화 */}
          <div className="space-y-2">
            <label className="block text-[13px] font-extrabold text-[#1a2744] ml-1 uppercase tracking-wider">Gender</label>
            <div className="flex gap-3">
              {['남성', '여성'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGender(item)}
                  className={`flex-1 py-4.5 rounded-[22px] font-bold text-[15px] transition-all duration-300 transform active:scale-[0.96] cursor-pointer ${
                    gender === item
                      ? 'bg-[#1a2744] text-white shadow-lg shadow-[#1a2744]/20'
                      : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* 나이 입력: 모바일 숫자 패드 및 조절 버튼 최적화 */}
          <div className="space-y-2">
            <label className="block text-[13px] font-extrabold text-[#1a2744] ml-1 uppercase tracking-wider">Age</label>
            <div className="relative flex items-center bg-white rounded-[22px] border border-gray-100 shadow-sm focus-within:ring-4 focus-within:ring-[#1a2744]/5 focus-within:border-[#1a2744]/20 transition-all overflow-hidden">
              <input
                type="text"
                inputMode="numeric"
                className="w-full p-4.5 focus:outline-none text-[16px] font-semibold placeholder:text-gray-300"
                placeholder="숫자 2자리 (예: 25)"
                value={age}
                onChange={handleAgeChange}
              />
              <div className="flex flex-col border-l border-gray-100 bg-gray-50 shrink-0">
                <button
                  type="button"
                  onClick={() => adjustAge(1)}
                  className="px-6 py-2.5 hover:bg-gray-200 active:bg-gray-300 text-[12px] text-gray-400 border-b border-gray-200 transition-colors cursor-pointer"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => adjustAge(-1)}
                  className="px-6 py-2.5 hover:bg-gray-200 active:bg-gray-300 text-[12px] text-gray-400 transition-colors cursor-pointer"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>

          {/* 제출 버튼: 하단 고정 느낌의 묵직한 디자인 */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isInvalid || isLoading}
              className={`w-full h-[64px] rounded-[24px] font-black text-[18px] transition-all duration-500 shadow-xl transform active:scale-[0.98] ${
                isInvalid || isLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-[#1a2744] text-white cursor-pointer hover:bg-[#151f36] shadow-[#1a2744]/20'
              }`}
            >
              {isLoading ? '설정 저장 중...' : '모라고라 시작하기'}
            </button>
            <p className="text-center text-gray-300 text-[10px] mt-4 font-medium italic">
              * 입력하신 정보는 AI 익명 판결 데이터로만 활용됩니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
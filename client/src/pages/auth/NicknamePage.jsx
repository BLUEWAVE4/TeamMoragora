import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

export default function NicknamePage() {
  const { user, updateProfile } = useAuth(); 
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState(''); 
  const [age, setAge] = useState('');

  // ✅ 유효성 검사: 나이가 정확히 2글자여야 활성화 (10~99세)
  const isInvalid = nickname.trim().length < 2 || !gender || age.length !== 2;

  // ✅ 나이 입력 핸들러: 숫자 외 문자 차단 + 2글자 제한
  const handleAgeChange = (e) => {
    const value = e.target.value;
    const onlyNumber = value.replace(/[^0-9]/g, '');
    if (onlyNumber.length <= 2) {
      setAge(onlyNumber);
    }
  };

  // ✅ 추가된 기능: 화살표 클릭 시 1부터 시작하여 증감 (최대 99)
  const adjustAge = (amount) => {
    const currentAge = parseInt(age) || 0;
    const newAge = Math.min(Math.max(currentAge + amount, 0), 99);
    
    // 0이면 빈값, 아니면 문자열로 변환하여 저장
    setAge(newAge === 0 ? '' : newAge.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isInvalid) return;
    
    console.log('프로필 데이터 제출:', { nickname, gender, age });
    alert(`${nickname}님, 프로필 설정이 완료되었습니다!`);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pt-10 px-8 pb-12">
      <div className="w-full max-w-sm">
        
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-gray-900">프로필 설정</h2>
          <p className="text-gray-500 mt-2 text-sm">정확한 판결을 위해 정보를 입력해주세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. 닉네임 입력 */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2 ml-1">닉네임</label>
            <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#1a2744]/10 transition-all">
              <input
                type="text"
                className="w-full p-4.5 focus:outline-none text-[15px] placeholder-gray-300"
                placeholder="2~10자 이내"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={10}
              />
            </div>
          </div>

          {/* 2. 성별 선택 */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2 ml-1">성별</label>
            <div className="flex gap-3">
              {['남성', '여성'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGender(item)}
                  className={`flex-1 py-4 rounded-[18px] font-bold text-[15px] transition-all cursor-pointer ${
                    gender === item
                      ? 'bg-[#1a2744] text-white shadow-md transform scale-[1.02]'
                      : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 나이 입력 (화살표 스테퍼 추가됨) */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2 ml-1">나이</label>
            <div className="relative flex items-center bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#1a2744]/10 transition-all">
              <input
                type="text"
                inputMode="numeric"
                className="w-full p-4.5 focus:outline-none text-[15px] placeholder-gray-300"
                placeholder="숫자 2자리 (예: 25)"
                value={age}
                onChange={handleAgeChange}
              />
              
              {/* ✅ 화살표 버튼 영역 */}
              <div className="flex flex-col border-l border-gray-50 bg-gray-50/20">
                <button
                  type="button"
                  onClick={() => adjustAge(1)}
                  className="px-4 py-2 hover:bg-gray-100 active:bg-gray-200 text-[10px] text-gray-400 border-b border-gray-50 transition-colors cursor-pointer"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => adjustAge(-1)}
                  className="px-4 py-2 hover:bg-gray-100 active:bg-gray-200 text-[10px] text-gray-400 transition-colors cursor-pointer"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>

          {/* 4. 제출 버튼 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isInvalid}
              className={`w-full h-[58px] rounded-[18px] font-bold text-[17px] transition-all shadow-lg ${
                isInvalid
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-[#1a2744] text-white cursor-pointer active:scale-[0.97] hover:bg-[#151f36]'
              }`}
            >
              설정 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

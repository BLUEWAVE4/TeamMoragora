import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { trackEvent } from '../../services/analytics';
import { supabase } from '../../services/supabase';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function NicknamePage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState(user?.user_metadata?.full_name || '');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [lastCheckedNickname, setLastCheckedNickname] = useState('');

  const isInvalid =
    nickname.trim().length < 2 ||
    !gender ||
    age.length !== 2 ||
    isAvailable !== true ||
    nickname !== lastCheckedNickname;

 const handleNicknameChange = (e) => {
  const filteredValue = e.target.value.replace(/[^ㄱ-ㅎ가-힣a-zA-Z0-9]/g, '');
  setNickname(filteredValue);
    
    if (isAvailable !== null) {
      setIsAvailable(null);
      setLastCheckedNickname('');
    }
  };

  const handleCheckDuplicate = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) return;
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', trimmed)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setIsAvailable(false);
        setLastCheckedNickname('');
      } else {
        setIsAvailable(true);
        setLastCheckedNickname(trimmed);
      }
    } catch (error) {
      console.error('Nickname check error:', error);
      alert('중복 확인 중 오류가 발생했습니다.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleAgeChange = (e) => {
    const onlyNumber = e.target.value.replace(/[^0-9]/g, '');
    if (onlyNumber.length <= 2) setAge(onlyNumber);
  };

  const adjustAge = (amount) => {
    const newAge = Math.min(Math.max((parseInt(age) || 0) + amount, 0), 99);
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

      const params = new URLSearchParams(window.location.search);
      const target =
        params.get('target') ||
        localStorage.getItem('redirectAfterLogin_backup') ||
        '/moragora';

      localStorage.removeItem('redirectAfterLogin_backup');
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(target, { replace: true });
    } catch (error) {
      alert('프로필 설정 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 진행 단계 계산
  const isNicknameDone = nickname.trim().length >= 2 && isAvailable === true && nickname === lastCheckedNickname;
  const isGenderDone = !!gender;
  const isAgeDone = age.length === 2;

  const doneCount = [isNicknameDone, isGenderDone, isAgeDone].filter(Boolean).length;
  const progressSteps = [false, false, false].map((_, i) => i < doneCount);

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col">
      {/* ── 상단 헤더 ── */}
      <div className="bg-gradient-to-br from-[#1B2A4A] to-[#2d3a5d] pt-14 pb-12 px-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-[#D4AF37]/5 rounded-full blur-xl" />

        <div className="relative max-w-[340px] mx-auto">
          <h1 className="text-white text-[24px] font-black tracking-tight mb-1">프로필 설정</h1>
          <p className="text-white/40 text-[13px] leading-relaxed">
            AI의 정확한 판결을 위해<br/>기본 정보를 입력해주세요.
          </p>

          {/* 진행 바 */}
          <div className="flex items-center gap-2 mt-5">
            {progressSteps.map((done, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  done ? 'bg-[#D4AF37]' : 'bg-white/15'
                }`}
              />
            ))}
          </div>
          <p className="text-white/30 text-[11px] mt-1.5 font-medium">{doneCount} / 3 완료</p>
        </div>
      </div>

      {/* ── 폼 ── */}
      <div className="flex-1 px-6 py-8">
        <form onSubmit={handleSubmit} className="max-w-[340px] mx-auto flex flex-col gap-7">

          {/* 닉네임 */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-[#1B2A4A]/50 uppercase tracking-widest ml-1">
              닉네임
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  className={`w-full px-5 py-4 bg-white rounded-[18px] border-2 text-[16px] font-medium outline-none transition-all placeholder:text-gray-200 ${
                    isAvailable === true
                      ? 'border-emerald-300'
                      : isAvailable === false
                      ? 'border-red-300'
                      : 'border-gray-100 focus:border-[#D4AF37]/50'
                  }`}
                  placeholder="2~10자 이내"
                  value={nickname}
                  onChange={handleNicknameChange}
                  maxLength={10}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isAvailable === true && <CheckCircle2 size={17} className="text-emerald-500" />}
                  {isAvailable === false && <AlertCircle size={17} className="text-red-500" />}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCheckDuplicate}
                disabled={nickname.trim().length < 2 || isChecking}
                className="px-5 rounded-[18px] bg-[#1B2A4A] text-[#D4AF37] font-black text-[13px] disabled:bg-gray-100 disabled:text-gray-300 transition-all active:scale-95 shrink-0 shadow-md shadow-[#1B2A4A]/10 cursor-pointer"
              >
                {isChecking ? '...' : '중복확인'}
              </button>
            </div>
            
            {/* 메시지 영역 */}
          <div className="h-5 ml-1 flex items-center">
           {nickname.length > 0 && nickname.length < 2 ? (
          <span className="text-[11px] text-red-400 font-bold">최소 2자 이상 입력해주세요.</span>
          ) : isAvailable === null && nickname.length >= 2 ? (
          <span className="text-[11px] text-orange-500 font-bold">중복 확인이 필요합니다.(공백/특수문자 제외)</span>
          ) : isAvailable === true && nickname === lastCheckedNickname ? (
          <span className="text-[11px] text-emerald-500 font-bold">사용 가능한 닉네임입니다.</span>
          ) : isAvailable === false ? (
          <span className="text-[11px] text-red-500 font-bold">이미 사용 중인 닉네임입니다.</span>
          ) : null}
          </div>
          </div>

          {/* 성별 */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-[#1B2A4A]/50 uppercase tracking-widest ml-1">
              성별
            </label>
            <div className="flex gap-3">
              {['남성', '여성'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGender(item)}
                  className={`cursor-pointer flex-1 py-4 rounded-[18px] font-black text-[15px] transition-all duration-300 active:scale-[0.96] ${
                    gender === item
                      ? 'bg-[#1B2A4A] text-[#D4AF37] shadow-lg shadow-[#1B2A4A]/20'
                      : 'bg-white text-gray-400 border border-gray-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* 나이 */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-[#1B2A4A]/50 uppercase tracking-widest ml-1">
              나이
            </label>
            <div className="flex bg-white rounded-[18px] border-2 border-gray-100 overflow-hidden focus-within:border-[#D4AF37]/50 transition-all">
              <input
                type="text"
                inputMode="numeric"
                className="flex-1 px-5 py-4 focus:outline-none text-[16px] font-semibold placeholder:text-gray-200"
                placeholder="숫자 2자리 (예: 25)"
                value={age}
                onChange={handleAgeChange}
              />
              <div className="flex flex-col border-l border-gray-100 bg-gray-50 shrink-0">
                <button
                  type="button"
                  onClick={() => adjustAge(1)}
                  className="px-5 py-2.5 hover:bg-gray-100 active:bg-gray-200 text-[12px] text-gray-400 border-b border-gray-100 transition-colors cursor-pointer"
                >▲</button>
                <button
                  type="button"
                  onClick={() => adjustAge(-1)}
                  className="px-5 py-2.5 hover:bg-gray-100 active:bg-gray-200 text-[12px] text-gray-400 transition-colors cursor-pointer"
                >▼</button>
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isInvalid || isLoading}
              className={`w-full h-[60px] rounded-[20px] font-black text-[17px] transition-all duration-500 flex items-center justify-center gap-2 ${
                isInvalid || isLoading
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                  : 'bg-[#1B2A4A] text-[#D4AF37] shadow-xl shadow-[#1B2A4A]/20 active:scale-[0.98] cursor-pointer'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <span>모라고라 시작하기</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
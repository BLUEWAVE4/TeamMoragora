import React from 'react';

export default function TierModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  // 💡 팀 기획안(image_e982ca.png)의 5단계 리그 구조를 그대로 반영
  const tiers = [
    { 
      level: 'Tier 5', 
      name: '대법관 (Supreme)', 
      condition: '상위 1%', 
      desc: '50명 단위 그룹 • 매월 10명 강등',
      color: 'text-yellow-400', 
      bg: 'bg-yellow-400/10', 
      icon: '🏛️' 
    },
    { 
      level: 'Tier 4', 
      name: '판사 (Judge)', 
      condition: '상위 5%', 
      desc: '매월 상위 10명 승격 / 하위 10명 강등',
      color: 'text-purple-400', 
      bg: 'bg-purple-400/10', 
      icon: '⚖️' 
    },
    { 
      level: 'Tier 3', 
      name: '변호사 (Attorney)', 
      condition: '상위 20%', 
      desc: '매월 상위 10명 승격 / 하위 10명 강등',
      color: 'text-blue-400', 
      bg: 'bg-blue-400/10', 
      icon: '📜' 
    },
    { 
      level: 'Tier 2', 
      name: '배심원 (Juror)', 
      condition: '상위 50%', 
      desc: '매월 상위 10명 승격 / 하위 10명 강등',
      color: 'text-emerald-400', 
      bg: 'bg-emerald-400/10', 
      icon: '📋' 
    },
    { 
      level: 'Tier 1', 
      name: '시민 (Citizen)', 
      condition: '신규 사용자 시작점', 
      desc: '50명 단위 그룹 • 매월 상위 10명 승격',
      color: 'text-slate-400', 
      bg: 'bg-slate-400/10', 
      icon: '👤' 
    },
  ];

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-[#2D3350]/90 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* 헤더 영역 */}
        <div className="bg-[#2D3350] p-7 text-center">
          <p className="text-[#FFBD43] text-[10px] font-black tracking-[0.2em] mb-1 uppercase">Verdict League System</p>
          <h3 className="text-white text-xl font-black italic">모라고라 리그 시스템</h3>
        </div>
        
        {/* 리스트 영역 */}
        <div className="p-5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          <p className="text-[11px] text-gray-400 font-bold px-2 mb-1">
            * 모든 사용자는 5단계 리그로 분류되어 경쟁합니다.
          </p>
          
          {tiers.map((tier) => (
            <div key={tier.level} className={`flex flex-col p-4 rounded-3xl ${tier.bg} border border-white/50 relative overflow-hidden`}>
              {/* 배경에 크게 깔리는 티어 숫자 */}
              <span className="absolute right-4 top-2 text-4xl font-black opacity-5 italic text-gray-900">{tier.level}</span>
              
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{tier.icon}</span>
                <div className="flex flex-col">
                  <span className={`text-[14px] font-black ${tier.color}`}>{tier.name}</span>
                  <span className="text-[10px] font-bold text-gray-500 opacity-70">{tier.condition}</span>
                </div>
              </div>
              
              <p className="text-[11px] font-medium text-gray-600 leading-relaxed bg-white/40 p-2 rounded-xl">
                {tier.desc}
              </p>
            </div>
          ))}
        </div>

        {/* 푸터 버튼 */}
        <div className="p-5 pt-2">
          <button 
            onClick={onClose} 
            className="w-full py-4 bg-[#2D3350] text-[#FFBD43] rounded-2xl font-black shadow-lg active:scale-95 transition-all text-sm"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
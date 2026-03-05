import React from "react";

import IndicatorDots from "../../components/ui/IndicatorDots";
import ModeSelector from "../../components/ui/ModeSelector";
import PurposeCard from "../../components/ui/PurposeCard";

function NewDebate() {
  return (
    <div className="min-h-screen flex justify-center items-center px-4 bg-[#FAFAF5]">

      <div
        className="relative w-full max-w-sm min-h-screen rounded-3xl shadow-2xl border border-[#D4AF37]/30 overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: "url('/agora.jpg')",
        }}
      >
        {/* 오버레이 */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />

        {/* 실제 콘텐츠 */}
        <div className="relative z-10 min-h-screen">

          {/* 상단 장식 바 */}
          <div className="h-2 bg-gradient-to-r from-[#D4AF37] via-[#F5E6B8] to-[#D4AF37]" />

          {/* Header */}
          <div className="h-14 flex items-center justify-center border-b border-[#E8E1D5] bg-[#FAFAF5]/90 font-semibold text-lg tracking-wide text-[#1B2A4A]">
            Agora Debate
          </div>

          {/* 모드 선택 */}
          <ModeSelector />

          {/* 인디케이터 */}
          <IndicatorDots />

          {/* 목적 선택 */}
          <div className="p-5 mt-8">

            <h2 className="text-lg font-bold text-[#F5E6B8]">
              논쟁의 목적
            </h2>
            <p className="text-sm text-[#FAFAF5] mb-5">
              어떤 방식의 토론을 원하십니까?
            </p>

            <div className="flex flex-col gap-4">

              <PurposeCard
                icon="⚖️"
                title="승부 판별"
                description="논리로 승패를 가립니다"
                highlight
              />

              <PurposeCard
                icon="🤝"
                title="합의 도출"
                description="공통의 진실을 찾습니다"
              />

              <PurposeCard
                icon="📜"
                title="분석 요청"
                description="양측 논리를 정리합니다"
              />

            </div>

            <button className="w-full mt-8 py-3 rounded-xl bg-[#1B2A4A] text-white font-semibold tracking-wide
                               hover:bg-[#16223B] transition shadow-md">
              다음 단계 →
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

export default NewDebate;
import React from "react";

// src/components/ui/ModeSelector.jsx

function ModeSelector() {
  return (
    <div className="flex justify-center gap-4 mt-8 px-4">

      {/* 🔥 주제 지정 */}
      <div
        className="relative group w-40 h-40 rounded-xl overflow-hidden cursor-pointer
                   shadow-md transition-all duration-300
                   hover:scale-105 hover:-translate-y-1
                   hover:shadow-[0_0_25px_rgba(212,175,55,0.7)]"
        style={{
          backgroundImage: "url('../../public/fight.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* 어두운 오버레이 */}
        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition duration-300" />

        {/* 콘텐츠 */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
          <div className="text-2xl transition-transform duration-300 group-hover:scale-110">
            
          </div>
          <h3 className="mt-2 font-semibold group-hover:text-[#D4AF37]">
            사용자 설정
          </h3>
          <p className="text-sm text-gray-200 text-center">
            직접 의제를 선택
          </p>
        </div>
      </div>

      {/* 🎲 랜덤 매칭 */}
      <div
        className="relative group w-40 h-40 rounded-xl overflow-hidden cursor-pointer
                   shadow-md transition-all duration-300
                   hover:scale-105 hover:-translate-y-1
                   hover:shadow-[0_0_35px_rgba(212,175,55,0.5)]"
        style={{
          backgroundImage: "url('/random.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* 어두운 오버레이 */}
        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition duration-300" />

        {/* 콘텐츠 */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
          <div className="text-2xl transition-transform duration-300 group-hover:rotate-6">
            
          </div>
          <h3 className="mt-2 font-semibold group-hover:text-[#D4AF37]">
            랜덤 매칭
          </h3>
          <p className="text-sm text-gray-200 text-center">
            운명적 논쟁
          </p>
        </div>
      </div>

    </div>
  );
}

export default ModeSelector;
import React from "react";

function ModeSelector() {
  return (
    <div className="flex justify-center gap-6 mt-8 px-4">

      {/* 🔥 주제 지정 */}
      <div
        className="
        relative group w-40 h-40 rounded-xl overflow-hidden cursor-pointer
        shadow-lg transition-all duration-500
        hover:scale-110 hover:-translate-y-2
        hover:shadow-[0_0_60px_rgba(212,175,55,0.9)]
        "
      >

        {/* background image */}
        <div
          className="
          absolute inset-0 bg-center bg-cover
          transition-all duration-700
          brightness-75
          group-hover:brightness-110
          group-hover:scale-110
          "
          style={{
            backgroundImage: "url('/fight2.png')"
          }}
        />

        {/* dark overlay */}
        <div className="
          absolute inset-0
          bg-black/50
          group-hover:bg-black/20
          transition duration-500
        " />

        {/* gold glow overlay */}
        <div className="
          absolute inset-0
          opacity-0
          group-hover:opacity-100
          transition duration-500
          bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.35),transparent_70%)]
        " />

        {/* content */}
        <div className="relative z-10 flex flex-col items-center justify-end h-full text-white pb-3">

          <h3 className="font-semibold text-lg transition-all duration-300 group-hover:text-[#D4AF37]">
            1 vs 1
          </h3>

          <p className="text-xs text-gray-200 text-center">
            직접 의제를 선택
          </p>

        </div>
      </div>

      {/* 🎲 랜덤 매칭 */}
      <div
        className="
        relative group w-40 h-40 rounded-xl overflow-hidden cursor-pointer
        shadow-lg transition-all duration-500
        hover:scale-110 hover:-translate-y-2
        hover:shadow-[0_0_60px_rgba(212,175,55,0.9)]
        "
      >

        <div
          className="
          absolute inset-0 bg-center bg-cover
          transition-all duration-700
          brightness-75
          group-hover:brightness-110
          group-hover:scale-110
          "
          style={{
            backgroundImage: "url('/random2.png')"
          }}
        />

        <div className="
          absolute inset-0
          bg-black/50
          group-hover:bg-black/20
          transition duration-500
        " />

        <div className="
          absolute inset-0
          opacity-0
          group-hover:opacity-100
          transition duration-500
          bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.35),transparent_70%)]
        " />

        <div className="relative z-10 flex flex-col items-center justify-end h-full text-white pb-3">

          <h3 className="font-semibold text-lg transition-all duration-300 group-hover:text-[#D4AF37]">
            랜덤 매칭
          </h3>

          <p className="text-xs text-gray-200 text-center">
            운명적 논쟁
          </p>

        </div>
      </div>

    </div>
  );
}

export default ModeSelector;
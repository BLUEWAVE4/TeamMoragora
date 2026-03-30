import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { getGuideStep, advanceGuide } from "../common/OnboardingModal";

function ModeSelector({ onStart }) {

  const [selectedIdx, setSelectedIdx] = useState(1);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (getGuideStep() === 'mode') setShowGuide(true);
  }, []);
  // const [showRandomModal, setShowRandomModal] = useState(false);
  const [showPracticeModal, setShowPracticeModal] = useState(false);

  const startX = useRef(0);
  const endX = useRef(0);

  const modes = [
    {
      key: "practice",
      label: "연습 모드",
      desc: "AI와 논쟁 연습을 진행하며 자신의 논리를 시험해볼 수 있습니다.",
      img: "/practice2.webp"
      // img: "/practice.webp"
    },
    {
      key: "battle",
      label: "1 vs 1",
      desc: "상대와 직접 논쟁을 진행하며 논리와 설득력으로 승부합니다.",
      img: "/fight2.webp"
      // img: "/fight.webp"
    },
    {
      key: "chat",
      label: "실시간 논쟁",
      desc: "실시간으로 진행되는 논쟁을 통해 상대와 뜨겁게 설전합니다.",
      img: "/3vs3.webp"
    }
  ];

  const total = modes.length;
  const selectedMode = modes[selectedIdx];

  const getDiff = (idx) => {
    let diff = idx - selectedIdx;

    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    return diff;
  };

  const getPosition = (diff) => {

    if (diff === 0) {
      return "scale-125 translate-x-0 z-30";
    }

    if (diff === -1) {
      return "-translate-x-[65%] scale-90 opacity-70";
    }

    if (diff === 1) {
      return "translate-x-[65%] scale-90 opacity-70";
    }

    return "opacity-0 pointer-events-none";
  };

  const next = () => {
    setSelectedIdx((prev) => (prev + 1) % total);
  };

  const prev = () => {
    setSelectedIdx((prev) => (prev - 1 + total) % total);
  };

  // 드래그 시작
  const handleStart = (x) => {
    startX.current = x;
  };

  // 드래그 끝
  const handleEnd = (x) => {

    endX.current = x;

    const diff = startX.current - endX.current;

    if (diff > 50) {
      next();
    }

    if (diff < -50) {
      prev();
    }
  };

  const handleGameStart = () => {

    if (selectedMode.key === "random") {
      setShowRandomModal(true);
      return;
    }

    // practice → solo로 매핑
    const modeKey = selectedMode.key === "practice" ? "solo" : selectedMode.key;
    onStart(modeKey);
  };

  return (
    <div className="flex flex-col items-center">

      <h2 className="text-xl font-bold mb-4 mt-[20px]">
        게임 모드
      </h2>

      <div
        className="
        relative
        w-full
        max-w-[400px]
        h-[220px]
        flex
        justify-center
        items-center
        touch-none
        "
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseUp={(e) => handleEnd(e.clientX)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchEnd={(e) => handleEnd(e.changedTouches[0].clientX)}
      >

        {modes.map((m, idx) => {

          const diff = getDiff(idx);
          const isCenter = diff === 0;

          return (
            <div
              key={m.key}
              onClick={() => setSelectedIdx(idx)}
              className={`
              absolute
              w-40
              h-40
              rounded-xl
              overflow-hidden
              cursor-pointer
              transition-all
              duration-500
              ${getPosition(diff)}
              ${isCenter ? "shadow-[0_0_40px_rgba(212,175,55,0.6)]" : ""}
              `}
            >

              {/* 이미지 */}
              <div
                className={`
                absolute inset-0
                bg-cover bg-center
                transition-transform duration-500
                ${isCenter ? "scale-110 brightness-110" : "brightness-75"}
                `}
                style={{ backgroundImage: `url(${m.img})` }}
              />

              {/* 어두운 레이어 */}
              <div className={`absolute inset-0 ${isCenter ? "bg-black/20" : "bg-black/50"}`} />

              {/* 골드 오라 */}
              {isCenter && (
                <div className="
                absolute inset-0
                bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.45),transparent_70%)]
                animate-pulse
                "/>
              )}

              {/* 이미지 안의 타이틀 */}
              <div className="relative z-10 flex flex-col items-center justify-end h-full pb-3 text-white">

                <h3 className={`text-sm font-bold ${isCenter ? "text-[#D4AF37]" : ""}`}>
                  {m.label}
                </h3>

              </div>

            </div>
          );
        })}

      </div>

      {/* 모드 설명만 표시 */}
      <div className="mt-6 text-center max-w-[360px]">

        <p className="text-sm text-gray-600">
          {selectedMode.desc}
        </p>

      </div>

      <div className="fixed bottom-20 left-0 right-0 flex flex-col items-center px-4 z-30">
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative mb-5 pointer-events-none"
          >
            <div className="bg-[#1B2A4A] rounded-2xl px-5 py-3 shadow-2xl border border-[#D4AF37]/30">
              <p className="text-[14px] font-black text-white text-center whitespace-nowrap">
                1vs1을 선택하고 시작!
              </p>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#1B2A4A] rotate-45 border-r border-b border-[#D4AF37]/30" />
          </motion.div>
        )}
        <div className="relative w-full max-w-[260px]">
          {showGuide && (
            <>
              <div className="absolute -inset-0.5 rounded-xl border-2 border-[#D4AF37] opacity-75 pointer-events-none" style={{ animation: 'guide-glow 2s ease-in-out infinite' }} />
              <div className="absolute -inset-1.5 rounded-xl border border-[#D4AF37]/40 pointer-events-none" style={{ animation: 'guide-glow 2s ease-in-out infinite 0.3s' }} />
              <style>{`@keyframes guide-glow{0%,100%{opacity:0.3;transform:scale(1);}50%{opacity:0.9;transform:scale(1.06);}}`}</style>
            </>
          )}
          <Button
            className="w-full"
            onClick={() => {
              if (showGuide) { setShowGuide(false); advanceGuide('topic'); }
              handleGameStart();
            }}
          >
            게임 시작
          </Button>
        </div>
      </div>

      {/* <Modal
        isOpen={showRandomModal}
        onClose={() => setShowRandomModal(false)}
        title="랜덤 매칭 안내"
      >
        <p>랜덤 매칭 기능은 추후 업데이트 예정입니다.</p>

        <div className="flex justify-end mt-6">
          <Button onClick={() => setShowRandomModal(false)}>
            확인
          </Button>
        </div>

      </Modal> */}

      <Modal
        isOpen={showPracticeModal}
        onClose={() => setShowPracticeModal(false)}
        title="연습 모드 안내"
      >
        <p>연습 모드 기능은 추후 업데이트 예정입니다.</p>

        <div className="flex justify-end mt-6">
          <Button onClick={() => setShowPracticeModal(false)}>
            확인
          </Button>
        </div>

      </Modal>

    </div>
  );
}

export default ModeSelector;
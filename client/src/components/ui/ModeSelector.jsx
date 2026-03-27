import React, { useState, useRef } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";

function ModeSelector({ onStart }) {

  const [selectedIdx, setSelectedIdx] = useState(1);
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
<<<<<<< Updated upstream
      desc: "기다림 없는 실시간 채팅 형식으로 상대와 뜨겁게 설전합니다.",
      img: "/random2.webp"
=======
      desc: "실시간으로 진행되는 논쟁을 통해 상대와 뜨겁게 설전합니다.",
      img: "/3vs3.webp"
      // img: "/3vs3V2.webp"
>>>>>>> Stashed changes
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
      return "-translate-x-[140px] scale-90 opacity-70";
    }

    if (diff === 1) {
      return "translate-x-[140px] scale-90 opacity-70";
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

      <Button
        className="mt-20 w-full max-w-[260px]"
        onClick={handleGameStart}
      >
        게임 시작
      </Button>

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
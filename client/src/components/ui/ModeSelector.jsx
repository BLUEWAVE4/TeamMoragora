// import React, { useState } from "react";
// import Modal from "../common/Modal";
// import Button from "../common/Button";

// function ModeSelector({ onStart }) {

//   const [selected, setSelected] = useState("battle");
//   const [showRandomModal, setShowRandomModal] = useState(false);

//   const modes = [
//     { key: "practice", label: "연습 모드", sub: "자유롭게 연습", img: "/practice.png" },
//     { key: "battle", label: "1 vs 1", sub: "직접 의제를 선택", img: "/fight2.png" },
//     { key: "random", label: "랜덤 매칭", sub: "운명적 논쟁", img: "/random2.png" }
//   ];

//   const selectedIdx = modes.findIndex(m => m.key === selected);

//   const getPosition = (diff) => {

//     if (diff === 0) {
//       return "scale-105 translate-x-0 z-20";
//     }

//     if (diff === -1) {
//       return "-translate-x-[110px] scale-90 opacity-80";
//     }

//     if (diff === 1) {
//       return "translate-x-[110px] scale-90 opacity-80";
//     }

//     return "opacity-0 pointer-events-none";
//   };

//   const handleStart = () => {

//     if (selected === "random") {
//       setShowRandomModal(true);
//       return;
//     }

//     onStart(selected);
//   };

//   return (
//     <div className="flex flex-col items-center">

//       <div
//         className="
//         relative
//         w-full
//         max-w-[440px]
//         h-[200px]
//         flex
//         justify-center
//         items-center
//         "
//       >

//         {modes.map((m, idx) => {

//           const diff = idx - selectedIdx;
//           const isCenter = diff === 0;

//           return (
//             <div
//               key={m.key}
//               onClick={() => setSelected(m.key)}
//               className={`
//               absolute
//               w-36
//               h-36
//               rounded-xl
//               overflow-hidden
//               cursor-pointer
//               transition-all
//               duration-500
//               ${getPosition(diff)}
//               `}
//             >

//               <div
//                 className={`
//                 absolute inset-0
//                 bg-cover bg-center
//                 ${isCenter ? "brightness-110" : "brightness-75"}
//                 `}
//                 style={{ backgroundImage: `url(${m.img})` }}
//               />

//               <div className={`absolute inset-0 ${isCenter ? "bg-black/20" : "bg-black/50"}`} />

//               {isCenter && (
//                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.35),transparent_70%)]"/>
//               )}

//               <div className="relative z-10 flex flex-col items-center justify-end h-full pb-2 text-white">

//                 <h3 className={`text-sm font-semibold ${isCenter ? "text-[#D4AF37]" : ""}`}>
//                   {m.label}
//                 </h3>

//                 <p className="text-[10px] text-gray-200">
//                   {m.sub}
//                 </p>

//               </div>

//             </div>
//           );
//         })}

//       </div>

//       <Button
//         className="mt-6 w-full max-w-[260px]"
//         onClick={handleStart}
//       >
//         게임 시작
//       </Button>

//       <Modal
//         isOpen={showRandomModal}
//         onClose={() => setShowRandomModal(false)}
//         title="랜덤 매칭 안내"
//       >
//         <p>랜덤 매칭 기능은 추후 업데이트 예정입니다.</p>

//         <div className="flex justify-end mt-6">
//           <Button onClick={() => setShowRandomModal(false)}>
//             확인
//           </Button>
//         </div>

//       </Modal>

//     </div>
//   );
// }

// export default ModeSelector;

import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";

function ModeSelector({ onStart }) {

  const [selected, setSelected] = useState("battle");
  const [showRandomModal, setShowRandomModal] = useState(false);

  const modes = [
    {
      key: "practice",
      label: "연습 모드",
      
      desc: "AI와 논쟁 연습을 진행하며 자신의 논리를 시험해볼 수 있습니다.",
      img: "/practice.png"
    },
    {
      key: "battle",
      label: "1 vs 1",
      
      desc: "상대와 직접 논쟁을 진행하며 논리와 설득력으로 승부합니다.",
      img: "/fight2.png"
    },
    {
      key: "random",
      label: "랜덤 매칭",
      
      desc: "랜덤으로 상대가 매칭되어 예상치 못한 논쟁이 펼쳐집니다.",
      img: "/random2.png"
    }
  ];

  const selectedIdx = modes.findIndex(m => m.key === selected);
  const selectedMode = modes[selectedIdx];

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

  const handleStart = () => {

    if (selected === "random") {
      setShowRandomModal(true);
      return;
    }

    onStart(selected);
  };

  return (
    <div className="flex flex-col items-center">

      <h2 className="text-xl font-bold mb-4">
        게임 모드
      </h2>

      <div
        className="
        relative
        w-full
        max-w-[440px]
        h-[220px]
        flex
        justify-center
        items-center
        "
      >

        {modes.map((m, idx) => {

          const diff = idx - selectedIdx;
          const isCenter = diff === 0;

          return (
            <div
              key={m.key}
              onClick={() => setSelected(m.key)}
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

              {/* 텍스트 */}
              <div className="relative z-10 flex flex-col items-center justify-end h-full pb-3 text-white">

                <h3 className={`text-sm font-bold ${isCenter ? "text-[#D4AF37]" : ""}`}>
                  {m.label}
                </h3>

                <p className="text-[10px] text-gray-200">
                  {m.sub}
                </p>

              </div>

            </div>
          );
        })}

      </div>

      {/* 모드 설명 */}
      <div className="mt-6 text-center max-w-[360px]">

        <h3 className="text-lg font-semibold text-[#D4AF37] mb-2">
          {selectedMode.label}
        </h3>

        <p className="text-sm text-gray-600">
          {selectedMode.desc}
        </p>

      </div>

      <Button
        className="mt-6 w-full max-w-[260px]"
        onClick={handleStart}
      >
        게임 시작
      </Button>

      <Modal
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

      </Modal>

    </div>
  );
}

export default ModeSelector;
// import React, { useState } from 'react';

// export default function VerdictDetailModal({ selectedVerdict, onClose }) {
//   const [activeAI, setActiveAI] = useState(null);

//   if (!selectedVerdict) return null;

//   // 1. 데이터 추출 (ProfilePage와 동일한 데이터 트리 참조)
//   const debateData = selectedVerdict.debate || selectedVerdict.debates || {};
  
//   // 2. 승패 판정 로직 동기화 (ProfilePage 리스트와 동일)
//   const isWin = selectedVerdict.is_win ?? (selectedVerdict.voted_side === debateData.win_side);

//   // 3. AI 분석 데이터 (서버 데이터가 있다면 해당 필드로 대체 가능)
//   const aiAnalyses = [
//     { 
//       id: 'gpt', 
//       name: 'GPT-4o', 
//       side: 'A', 
//       score: '82', 
//       color: 'text-emerald-500', 
//       comment: "논리적 구조가 매우 탄탄하며, 제시된 근거의 데이터 신뢰성이 매우 높습니다." 
//     },
//     { 
//       id: 'claude', 
//       name: 'Claude-3', 
//       side: 'A', 
//       score: '74', 
//       color: 'text-amber-500', 
//       comment: "감성적 호소와 이성적 논거의 밸런스가 훌륭하나, 일부 반박이 다소 추상적입니다." 
//     },
//     { 
//       id: 'gemini', 
//       name: 'Gemini', 
//       side: 'B', 
//       score: '45', 
//       color: 'text-blue-500', 
//       comment: "창의적인 시각을 제시했으나, 핵심 쟁점에서의 논리적 일관성이 경쟁사 대비 아쉽습니다." 
//     }
//   ];

//   // 투표 수 가공 (서버 데이터가 있다면 매핑: 예: debateData.vote_count_a)
//   const voteA = 849;
//   const voteB = 399;
//   const totalVotes = voteA + voteB;
//   const percentA = Math.round((voteA / totalVotes) * 100);
//   const percentB = 100 - percentA;

//   return (
//     <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0F121D]/95 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>
//       <div 
//         className="bg-[#F8F9FA] w-full max-w-md rounded-[50px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
//         onClick={e => e.stopPropagation()}
//       >
        
//         {/* 상단 헤더: 논쟁 제목 */}
//         <div className="bg-[#2D3350] p-8 pt-12 pb-14 text-center relative overflow-hidden shrink-0">
//           <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FFBD43]/10 rounded-full blur-3xl"></div>
//           <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FFBD43] text-[#2D3350] text-[11px] font-black rounded-full mb-4 shadow-[0_0_20px_rgba(255,189,67,0.4)] tracking-[0.2em]">
//             VERDICT REPORT
//           </div>
//           <h3 className="text-white text-xl font-black leading-tight px-2 tracking-tight line-clamp-2">
//             "{debateData.topic || selectedVerdict.topic || "참여한 논쟁 주제"}"
//           </h3>
//         </div>

//         {/* 메인 컨텐츠 (스크롤 가능) */}
//         <div className="px-6 flex flex-col gap-6 -mt-10 bg-[#F8F9FA] rounded-t-[50px] pt-8 pb-8 overflow-y-auto overflow-x-hidden">
          
//           {/* 나의 논쟁 vs 상대방 논쟁 */}
//           <div className="flex flex-col gap-3">
//             <div className="self-start max-w-[90%] bg-white p-5 rounded-r-[30px] rounded-tl-[30px] rounded-bl-[10px] shadow-sm border-l-4 border-blue-500">
//               <span className="text-[10px] font-black text-blue-500 mb-1 block uppercase tracking-wider">My Argument (Side {selectedVerdict.voted_side})</span>
//               <p className="text-[12px] text-gray-700 leading-relaxed font-medium">
//                 {selectedVerdict.my_argument || "본인의 주장 데이터가 존재하지 않습니다."}
//               </p>
//             </div>
//             <div className="self-end max-w-[90%] bg-white p-5 rounded-l-[30px] rounded-tr-[30px] rounded-br-[10px] shadow-sm border-r-4 border-purple-500 text-right">
//               <span className="text-[10px] font-black text-purple-500 mb-1 block uppercase tracking-wider">Opponent Argument</span>
//               <p className="text-[12px] text-gray-700 leading-relaxed font-medium text-right">
//                 {selectedVerdict.opponent_argument || "상대방의 주장 데이터가 존재하지 않습니다."}
//               </p>
//             </div>
//           </div>

//           {/* AI 투표 현황 및 상세 판결 */}
//           <div className="bg-white rounded-[35px] p-6 shadow-sm border border-gray-50">
//             <div className="flex justify-between items-center mb-5">
//               <h4 className="text-[14px] font-black text-[#2D3350]">AI MODELS ANALYSIS</h4>
//               <div className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full italic">A Side Dominant</div>
//             </div>
            
//             <div className="flex gap-2 mb-4">
//               {aiAnalyses.map((ai) => (
//                 <button 
//                   key={ai.id}
//                   onClick={() => setActiveAI(activeAI === ai.id ? null : ai.id)}
//                   className={`flex-1 flex flex-col items-center p-3 rounded-[24px] transition-all duration-300 border ${
//                     activeAI === ai.id ? 'bg-[#2D3350] border-[#2D3350] shadow-md scale-105' : 'bg-gray-50 border-gray-50 hover:border-gray-200'
//                   }`}
//                 >
//                   <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 bg-white shadow-inner text-[10px] font-black ${ai.color}`}>
//                     {ai.name[0]}
//                   </div>
//                   <span className={`text-[9px] font-black ${activeAI === ai.id ? 'text-[#FFBD43]' : 'text-gray-400'}`}>{ai.name}</span>
//                   <span className={`text-[11px] font-black mt-0.5 ${activeAI === ai.id ? 'text-white' : 'text-[#2D3350]'}`}>{ai.side}측</span>
//                   <span className={`text-[9px] font-bold ${activeAI === ai.id ? 'text-white/40' : 'text-gray-300'}`}>{ai.score}pt</span>
//                 </button>
//               ))}
//             </div>

//             {activeAI && (
//               <div className="p-4 bg-[#F8F9FA] rounded-[22px] border border-dashed border-gray-200 animate-in slide-in-from-top-2">
//                 <p className="text-[12px] text-gray-600 leading-[1.6] italic font-medium">
//                    " {aiAnalyses.find(a => a.id === activeAI)?.comment} "
//                 </p>
//               </div>
//             )}
//           </div>

//           {/* 시민 투표 현황 (막대바 그래프) */}
//           <div className="bg-white rounded-[35px] p-6 shadow-sm border border-gray-100">
//             <div className="flex justify-between items-center mb-5">
//               <div>
//                 <h4 className="text-[14px] font-black text-[#2D3350] tracking-tight">CITIZEN VOTES</h4>
//                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">실시간 집계 통계</p>
//               </div>
//               <div className="text-right">
//                 <span className="text-[10px] font-black text-gray-300 block mb-0.5 uppercase">Total</span>
//                 <span className="text-[13px] font-black text-[#2D3350]">{totalVotes.toLocaleString()} <span className="text-[10px] text-gray-400 uppercase font-bold">Votes</span></span>
//               </div>
//             </div>

//             <div className="flex flex-col gap-4">
//               {/* A측 막대 */}
//               <div className="flex flex-col gap-1.5">
//                 <div className="flex justify-between items-end px-1">
//                   <span className="text-[11px] font-black text-blue-600 uppercase">A Side</span>
//                   <div className="flex items-baseline gap-1.5">
//                     <span className="text-[13px] font-black text-[#2D3350]">{voteA.toLocaleString()}명</span>
//                     <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">{percentA}%</span>
//                   </div>
//                 </div>
//                 <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
//                   <div 
//                     className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out" 
//                     style={{ width: `${percentA}%` }}
//                   ></div>
//                 </div>
//               </div>

//               {/* B측 막대 */}
//               <div className="flex flex-col gap-1.5">
//                 <div className="flex justify-between items-end px-1">
//                   <span className="text-[11px] font-black text-purple-600 uppercase">B Side</span>
//                   <div className="flex items-baseline gap-1.5">
//                     <span className="text-[13px] font-black text-[#2D3350]">{voteB.toLocaleString()}명</span>
//                     <span className="text-[10px] font-black text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">{percentB}%</span>
//                   </div>
//                 </div>
//                 <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
//                   <div 
//                     className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-1000 ease-out" 
//                     style={{ width: `${percentB}%` }}
//                   ></div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* 최종 승리 및 나의 결과 */}
//           <div className="grid grid-cols-2 gap-4">
//             <div className="bg-white p-5 rounded-[35px] shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1">
//               <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest text-center">Final Winner</p>
//               <p className="text-xl font-black text-[#2D3350] italic tracking-tighter">
//                 <span className="text-[#FFBD43] uppercase">{debateData.win_side || 'A'}</span> SIDE
//               </p>
//             </div>
//             <div className={`p-5 rounded-[35px] shadow-lg flex flex-col items-center justify-center gap-1 border-b-4 ${
//               isWin ? 'bg-green-500 border-green-700 shadow-green-200' : 'bg-red-500 border-red-700 shadow-red-200'
//             }`}>
//               <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">My Result</p>
//               <p className="text-xl font-black text-white italic tracking-tighter">
//                 {isWin ? 'WIN승' : 'LOSS패'}
//               </p>
//             </div>
//           </div>

//           {/* 리포트 닫기 버튼 */}
//           <button 
//             onClick={onClose} 
//             className="w-full py-6 bg-gradient-to-r from-[#2D3350] to-[#1A1E31] text-[#FFBD43] rounded-[30px] font-black shadow-[0_10px_25px_-5px_rgba(45,51,80,0.4)] active:scale-[0.97] transition-all text-base tracking-[0.1em] shrink-0"
//           >
//             리포트 닫기
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useState } from "react";

export default function VerdictDetailModal({ selectedVerdict, onClose }) {
  const [activeAI, setActiveAI] = useState(null);

  if (!selectedVerdict) return null;

  // debate 데이터
  const debateData =
    selectedVerdict.debate || selectedVerdict.debates || {};

  // 승리 판정
  const winnerSide =
    selectedVerdict.winner_side ||
    debateData.winner_side ||
    debateData.win_side ||
    "A";

  // 내가 이겼는지 여부
  const isWin = selectedVerdict.voted_side === winnerSide;

  // AI 판정 데이터 (서버 데이터 기반)
  const aiAnalyses = (selectedVerdict.ai_judgments || []).map((j) => ({
    id: j.ai_model,
    name: j.ai_model,
    side: j.score_a > j.score_b ? "A" : "B",
    score: `${j.score_a}:${j.score_b}`,
    color:
      j.ai_model?.toLowerCase().includes("gpt")
        ? "text-emerald-500"
        : j.ai_model?.toLowerCase().includes("claude")
        ? "text-amber-500"
        : "text-blue-500",
    comment: j.reason || "AI 분석 결과입니다.",
  }));

  // 시민 투표 데이터 (서버값 없으면 fallback)
  const voteA = debateData.vote_count_a || 0;
  const voteB = debateData.vote_count_b || 0;
  const totalVotes = voteA + voteB || 1;

  const percentA = Math.round((voteA / totalVotes) * 100);
  const percentB = 100 - percentA;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0F121D]/95 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-[#F8F9FA] w-full max-w-md rounded-[50px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-[#2D3350] p-8 pt-12 pb-14 text-center relative overflow-hidden shrink-0">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FFBD43]/10 rounded-full blur-3xl"></div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FFBD43] text-[#2D3350] text-[11px] font-black rounded-full mb-4 shadow-[0_0_20px_rgba(255,189,67,0.4)] tracking-[0.2em]">
            VERDICT REPORT
          </div>

          <h3 className="text-white text-xl font-black leading-tight px-2 tracking-tight line-clamp-2">
            "
            {debateData.topic ||
              selectedVerdict.topic ||
              debateData.title ||
              "참여한 논쟁 주제"}
            "
          </h3>
        </div>

        {/* 메인 영역 */}
        <div className="px-6 flex flex-col gap-6 -mt-10 bg-[#F8F9FA] rounded-t-[50px] pt-8 pb-8 overflow-y-auto">

          {/* 내 주장 vs 상대 주장 */}
          <div className="flex flex-col gap-3">

            <div className="self-start max-w-[90%] bg-white p-5 rounded-r-[30px] rounded-tl-[30px] rounded-bl-[10px] shadow-sm border-l-4 border-blue-500">
              <span className="text-[10px] font-black text-blue-500 mb-1 block uppercase tracking-wider">
                My Argument (Side {selectedVerdict.voted_side})
              </span>

              <p className="text-[12px] text-gray-700 leading-relaxed font-medium">
                {selectedVerdict.my_argument ||
                  "본인의 주장 데이터가 존재하지 않습니다."}
              </p>
            </div>

            <div className="self-end max-w-[90%] bg-white p-5 rounded-l-[30px] rounded-tr-[30px] rounded-br-[10px] shadow-sm border-r-4 border-purple-500 text-right">
              <span className="text-[10px] font-black text-purple-500 mb-1 block uppercase tracking-wider">
                Opponent Argument
              </span>

              <p className="text-[12px] text-gray-700 leading-relaxed font-medium">
                {selectedVerdict.opponent_argument ||
                  "상대방의 주장 데이터가 존재하지 않습니다."}
              </p>
            </div>

          </div>

          {/* AI 판결 */}
          <div className="bg-white rounded-[35px] p-6 shadow-sm border border-gray-50">

            <div className="flex justify-between items-center mb-5">
              <h4 className="text-[14px] font-black text-[#2D3350]">
                AI MODELS ANALYSIS
              </h4>

              <div className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full italic">
                {winnerSide} Side Dominant
              </div>
            </div>

            <div className="flex gap-2 mb-4">

              {aiAnalyses.map((ai) => (

                <button
                  key={ai.id}
                  onClick={() =>
                    setActiveAI(activeAI === ai.id ? null : ai.id)
                  }
                  className={`flex-1 flex flex-col items-center p-3 rounded-[24px] transition-all duration-300 border ${
                    activeAI === ai.id
                      ? "bg-[#2D3350] border-[#2D3350] shadow-md scale-105"
                      : "bg-gray-50 border-gray-50 hover:border-gray-200"
                  }`}
                >

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 bg-white shadow-inner text-[10px] font-black ${ai.color}`}
                  >
                    {ai.name[0]}
                  </div>

                  <span
                    className={`text-[9px] font-black ${
                      activeAI === ai.id
                        ? "text-[#FFBD43]"
                        : "text-gray-400"
                    }`}
                  >
                    {ai.name}
                  </span>

                  <span
                    className={`text-[11px] font-black mt-0.5 ${
                      activeAI === ai.id
                        ? "text-white"
                        : "text-[#2D3350]"
                    }`}
                  >
                    {ai.side}측
                  </span>

                  <span
                    className={`text-[9px] font-bold ${
                      activeAI === ai.id
                        ? "text-white/40"
                        : "text-gray-300"
                    }`}
                  >
                    {ai.score}
                  </span>

                </button>

              ))}

            </div>

            {activeAI && (
              <div className="p-4 bg-[#F8F9FA] rounded-[22px] border border-dashed border-gray-200">
                <p className="text-[12px] text-gray-600 leading-[1.6] italic font-medium">
                  "
                  {aiAnalyses.find((a) => a.id === activeAI)?.comment}
                  "
                </p>
              </div>
            )}

          </div>

          {/* 시민 투표 */}
          <div className="bg-white rounded-[35px] p-6 shadow-sm border border-gray-100">

            <div className="flex justify-between items-center mb-5">

              <div>
                <h4 className="text-[14px] font-black text-[#2D3350]">
                  CITIZEN VOTES
                </h4>

                <p className="text-[10px] text-gray-400 font-bold uppercase">
                  실시간 집계 통계
                </p>
              </div>

              <div className="text-right">

                <span className="text-[13px] font-black text-[#2D3350]">
                  {totalVotes.toLocaleString()}
                </span>

              </div>

            </div>

            <div className="flex flex-col gap-4">

              {/* A */}
              <div>
                <div className="flex justify-between">
                  <span className="text-blue-600 font-bold text-sm">
                    A Side
                  </span>

                  <span className="text-sm font-bold">
                    {percentA}%
                  </span>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">

                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${percentA}%` }}
                  />

                </div>
              </div>

              {/* B */}
              <div>

                <div className="flex justify-between">

                  <span className="text-purple-600 font-bold text-sm">
                    B Side
                  </span>

                  <span className="text-sm font-bold">
                    {percentB}%
                  </span>

                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">

                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${percentB}%` }}
                  />

                </div>

              </div>

            </div>

          </div>

          {/* 승리 결과 */}
          <div className="grid grid-cols-2 gap-4">

            <div className="bg-white p-5 rounded-[35px] shadow-sm border flex flex-col items-center">

              <p className="text-[10px] text-gray-400 font-bold">
                FINAL WINNER
              </p>

              <p className="text-xl font-black text-[#2D3350]">
                <span className="text-[#FFBD43]">
                  {winnerSide}
                </span>{" "}
                SIDE
              </p>

            </div>

            <div
              className={`p-5 rounded-[35px] shadow-lg flex flex-col items-center ${
                isWin
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            >

              <p className="text-[10px] text-white/70 font-bold">
                MY RESULT
              </p>

              <p className="text-xl font-black text-white">
                {isWin ? "WIN승" : "LOSS패"}
              </p>

            </div>

          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="w-full py-5 bg-[#2D3350] text-[#FFBD43] rounded-[30px] font-black"
          >
            리포트 닫기
          </button>

        </div>
      </div>
    </div>
  );
}
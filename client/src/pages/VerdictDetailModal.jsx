import React from 'react';

export default function VerdictDetailModal({ selectedVerdict, onClose }) {
  if (!selectedVerdict) return null;

  const debateData = selectedVerdict.debate || selectedVerdict.debates || {};
  const isWin = selectedVerdict.is_win ?? (selectedVerdict.voted_side === (debateData.win_side || 'A'));

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#2D3350]/90 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-[#F8F9FA] w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* 상단 헤더 */}
        <div className="bg-[#2D3350] p-8 text-center pt-10">
          <div className="inline-block px-4 py-1 bg-[#FFBD43]/20 text-[#FFBD43] text-[10px] font-black rounded-full mb-3 border border-[#FFBD43]/30 tracking-widest">AI VERDICT REPORT</div>
          <h3 className="text-white text-xl font-black italic leading-tight px-4">
            "{debateData.topic || selectedVerdict.topic || "참여한 논쟁"}"
          </h3>
        </div>

        <div className="p-6 flex flex-col gap-6 -mt-6 bg-[#F8F9FA] rounded-t-[40px]">
          {/* 🤖 AI 분석 섹션 (신규!) */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-black text-[#2D3350] opacity-40">ANALYSIS MODELS</span>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">A측 68% 우세</span>
            </div>
            <div className="flex gap-2">
              {[
                { name: 'GPT-4o', side: 'A', score: '82' },
                { name: 'Claude-3', side: 'A', score: '74' },
                { name: 'Gemini', side: 'B', score: '45' }
              ].map((ai) => (
                <div key={ai.name} className="flex-1 bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center shadow-inner">
                  <p className="text-[8px] font-black text-gray-400 mb-1">{ai.name}</p>
                  <p className={`text-xs font-black ${ai.side === 'A' ? 'text-blue-500' : 'text-purple-500'}`}>{ai.side}측</p>
                  <p className="text-[10px] font-bold text-gray-300 mt-1">{ai.score}pt</p>
                </div>
              ))}
            </div>
          </div>

          {/* 최종 결과 & 내 투표 */}
          <div className="flex gap-3">
            <div className="flex-1 bg-[#2D3350] p-4 rounded-3xl text-center">
              <p className="text-[9px] font-bold text-gray-400 mb-1">FINAL WINNER</p>
              <p className="text-lg font-black text-[#FFBD43]">{debateData.win_side || 'A'}측</p>
            </div>
            <div className={`flex-1 p-4 rounded-3xl text-center border-2 ${isWin ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
              <p className="text-[9px] font-bold text-gray-400 mb-1">MY RESULT</p>
              <p className={`text-lg font-black ${isWin ? 'text-green-600' : 'text-red-600'}`}>{isWin ? '승리' : '패배'}</p>
            </div>
          </div>

          <button onClick={onClose} className="w-full py-5 bg-[#2D3350] text-[#FFBD43] rounded-[24px] font-black shadow-xl active:scale-95 transition-all text-sm">리포트 닫기</button>
        </div>
      </div>
    </div>
  );
}
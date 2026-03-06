import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ArgumentPage() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  
  // 💡 [참고] 나중에 이 데이터들은 API로 가져오거나 Props/Context로 받게 됩니다.
  const debateData = {
    category: "승부 판별",
    tag: "논리/팩트",
    title: "변기 뚜껑은 내려야 한다 vs 각자 알아서",
    side: "A측" // 사용자가 선택한 진영
  };

  const [text, setText] = useState('');
  const MIN_LENGTH = 50;
  const MAX_LENGTH = 2000;
  
  const currentLength = text.length;
  const isInvalid = currentLength < MIN_LENGTH || currentLength > MAX_LENGTH;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isInvalid) {
      // TODO: 서버에 debateId, side, text를 함께 전송
      console.log(`${debateId}번 토론 (${debateData.side}) 제출:`, text);
      alert('주장이 성공적으로 제출되었습니다!');
      navigate(`/debate/${debateId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF5] py-6 px-5">
      {/* 1. 카테고리 & 태그 영역 (다른 팀원 작업물 연동 지점) */}
      <div className="flex items-center gap-1 mb-4 text-[13px] font-bold">
        <span className="text-orange-500">🏆 {debateData.category}</span>
        <span className="text-gray-300 mx-1">·</span>
        <span className="text-red-500 flex items-center gap-1">
          <span className="text-[12px]">🔬</span> {debateData.tag}
        </span>
      </div>

      {/* 2. 토론 주제 영역 */}
      <h2 className="text-[22px] font-extrabold text-gray-900 mb-6 leading-tight break-keep">
        "{debateData.title}"
      </h2>

      {/* 3. 진영 안내 */}
      <p className="text-gray-500 text-[14px] mb-4 font-medium">
        당신의 주장물을 입력하세요 ({debateData.side})
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* 4. 입력창 (시안의 둥근 카드 스타일) */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden mb-3">
          <textarea
            className="w-full h-64 p-6 focus:outline-none resize-none text-[15px] text-gray-800 placeholder-gray-300 leading-relaxed"
            placeholder="여기에 내용을 입력하세요..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {/* 5. 글자 수 카운터 (시안의 파란색 텍스트) */}
        <div className="flex justify-end mb-1 px-1">
          <span className="text-gray-700 text-[12px] font-semibold">
            {currentLength.toLocaleString()} / {MAX_LENGTH.toLocaleString()}자
          </span>
        </div>
        
        {/* 6. 최소/최대 가이드 */}
        <div className="flex justify-between text-[11px] text-gray-400 mb-10 px-1">
          <span>최소 {MIN_LENGTH}자</span>
          <span>최대 {MAX_LENGTH.toLocaleString()}자</span>
        </div>

        {/* 7. 제출 버튼 */}
        <button
          type="submit"
          disabled={isInvalid}
          className={`w-full py-4.5 rounded-[16px] font-bold text-white text-[17px] flex items-center justify-center gap-2 transition-all shadow-lg ${
            isInvalid 
              ? 'bg-gray-300 cursor-not-allowed shadow-none' 
              : 'bg-[#1a2744] active:scale-[0.97] hover:bg-[#151f36]'
          }`}
          style={{ height: '58px' }}
        >
          주장 제출하기
        </button>
      </form>
    </div>
  );
}
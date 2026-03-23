import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// services 폴더는 src 바로 아래에 있으므로 ../../
import { createDebate } from "../../services/api"; 

// components 폴더도 src 바로 아래에 있으므로 ../../
import Button from "../../components/common/Button";
import MoragoraModal from "../../components/common/MoragoraModal";

export default function DebateLobbyPage() {
  const { inviteCode } = useParams(); // URL 파라미터 추출
  const navigate = useNavigate();

  // 상태 관리
  const [topic, setTopic] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoined, setIsJoined] = useState(false); // 상대방 입장 여부 (실시간 감지 필요)

  // 1. [방 만들기] 버튼 클릭 시 실행 (루트 2단계)
  const handleCreateRoom = async () => {
    try {
      setIsCreating(true);
      const data = {
        mode: "chat",
        status: "waiting", // 초기 상태
        topic: "주제를 입력해주세요", // 임시 주제
      };

      const result = await createDebate(data);
      const newCode = result?.invite_code;

      // 방 생성이 완료되면 URL을 코드가 포함된 주소로 변경 (루트 3단계 이동)
      navigate(`/debate/lobby/${newCode}`, { replace: true });
    } catch (err) {
      console.error(err);
      alert("방 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#FAFAF5]">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
        
        {!inviteCode ? (
          /* [Step A] 방 만들기 전: 대기실 초기 화면 */
          <div className="space-y-6">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-2xl font-bold text-gray-800">실시간 논쟁 대기실</h2>
            <p className="text-gray-500">
              방을 생성하고 링크를 공유하여<br />상대방과 실시간으로 논쟁해보세요.
            </p>
            <Button 
              className="w-full py-4 text-lg" 
              onClick={handleCreateRoom}
              disabled={isCreating}
            >
              {isCreating ? "방 생성 중..." : "방 만들기 시작"}
            </Button>
          </div>
        ) : (
          /* [Step B] 방 만들기 후: 주제 입력 및 초대 화면 */
          <div className="space-y-6">
            <div className="inline-block px-4 py-1 rounded-full bg-gold-100 text-gold-700 text-sm font-bold mb-2">
              방 생성 완료
            </div>
            <h2 className="text-xl font-bold">논쟁 준비하기</h2>

            {/* 초대 링크 섹션 */}
            <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">초대 링크</p>
              <div className="flex items-center justify-between bg-white p-2 rounded border">
                <span className="text-sm truncate text-gray-600 mr-2">
                  {window.location.origin}/invite/{inviteCode}
                </span>
                <Button size="sm" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteCode}`);
                  alert("링크가 복사되었습니다!");
                }}>복사</Button>
              </div>
            </div>

            {/* 주제 입력 섹션 (루트 4단계) */}
            <div className="text-left space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">논쟁 주제 입력</label>
              <input 
                type="text"
                className="w-full p-4 border rounded-2xl focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                placeholder="어떤 주제로 대화할까요?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {/* 상대방 대기 상태 표시 */}
            <div className="py-4 border-t border-b border-gray-100 flex items-center justify-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isJoined ? 'bg-green-500' : 'bg-gray-300 animate-pulse'}`} />
              <span className="text-sm text-gray-500">
                {isJoined ? "상대방이 입장했습니다!" : "상대방을 기다리는 중..."}
              </span>
            </div>

            <Button 
              className="w-full" 
              disabled={!topic.trim() || !isJoined}
              onClick={() => navigate(`/debate/${inviteCode}/chat`)} // 실제 채팅방 이동
            >
              실시간 논쟁 시작하기
            </Button>
          </div>
        )}
      </div>

      <button 
        onClick={() => navigate(-1)}
        className="mt-8 text-gray-400 hover:text-gray-600 underline text-sm"
      >
        뒤로 가기
      </button>
    </div>
  );
}
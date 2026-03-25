import { useState, useEffect } from 'react';
import { getChatMessages } from '../../services/api';

export default function ChatLogViewer({ debateId, nicknameA, nicknameB }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getChatMessages(debateId)
      .then(data => setMessages(data || []))
      .finally(() => setLoading(false));
  }, [debateId]);

  if (loading) return <div className="text-center py-8 text-gray-400">로딩 중...</div>;
  if (!messages.length) return <div className="text-center py-8 text-gray-400">채팅 기록이 없습니다</div>;

  const displayMessages = expanded ? messages : messages.slice(0, 10);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-[12px] font-bold text-[#1B2A4A]/40 mb-4">실시간 논쟁 기록</p>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {displayMessages.map(msg => {
          const isA = msg.side === 'A';
          const nickname = isA ? nicknameA : nicknameB;
          const time = new Date(msg.created_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div key={msg.id} className={`flex ${isA ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%]`}>
                <p className={`text-[11px] font-bold mb-1 ${isA ? 'text-[#059669]' : 'text-[#E63946] text-right'}`}>
                  {nickname}
                </p>
                <div className={`flex items-end gap-1.5 ${isA ? '' : 'flex-row-reverse'}`}>
                  <div className={`inline-block px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
                    isA
                      ? 'bg-[#059669]/10 text-[#1B2A4A] rounded-tl-none'
                      : 'bg-[#E63946]/10 text-[#1B2A4A] rounded-tr-none'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-gray-400 shrink-0 pb-0.5">{time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 10개 초과 시 더보기 버튼 */}
      {messages.length > 10 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-center py-2 text-[12px] text-[#007AFF] font-bold mt-2"
        >
          전체 채팅 보기 ({messages.length}개)
        </button>
      )}
    </div>
  );
}
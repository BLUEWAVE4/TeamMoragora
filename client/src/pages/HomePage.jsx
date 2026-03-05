import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TodayDebate from '../components/home/TodayDebate';

export default function HomePage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('전체');
  const [sort, setSort] = useState('최신순');

  // 시간 변환 함수
  const formatTime = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now - past;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    return `${diffInDays}일 전`;
  };

  const categories = [
    { id: 'all', label: '전체', icon: '🌐' },
    { id: 'daily', label: '일상', icon: '🏠' },
    { id: 'love', label: '연애', icon: '💕' },
    { id: 'food', label: '음식', icon: '🍱' },
    { id: 'work', label: '직장', icon: '🏢' },
  ];

  const allFeeds = [
    {
      id: "debate_1",
      category: "음식",
      user: { name: "논쟁마스터", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=1" },
      title: "아이스 아메리카노, 한겨울에도 '얼죽아'가 맞을까?",
      description: "영하 10도에도 아이스만 고집하는 친구, 이거 정상인가요?",
      tags: ["#음식", "#라이프스타일"],
      votesA: 850, votesB: 320,
      comments: 142, likes: 530,
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: "debate_2",
      category: "일상",
      user: { name: "밸런스봇", image: "https://api.dicebear.com/7.x/bottts/svg?seed=2" },
      title: "평생 '라면만 먹기' vs '치킨만 먹기'",
      description: "하나만 선택해야 한다면 당신의 선택은?",
      tags: ["#밸런스게임", "#음식"],
      votesA: 1200, votesB: 1150,
      comments: 890, likes: 2100,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: "debate_3",
      category: "연애",
      user: { name: "사랑꾼", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=3" },
      title: "내 연인의 '깻잎 논쟁', 허용 가능한가요?",
      description: "내 친구의 깻잎을 떼어주는 내 연인, 매너인가요 불륜인가요?",
      tags: ["#연애", "#깻잎논쟁"],
      votesA: 2100, votesB: 1800,
      comments: 450, likes: 1200,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    }
  ];

  const filteredFeeds = filter === '전체' 
    ? allFeeds 
    : allFeeds.filter(feed => feed.category === filter);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <section><TodayDebate /></section>

      <section className="flex flex-col">
        <div className="flex justify-between items-center mb-4 px-5">
          <h2 className="text-xl font-bold text-[#2D3350]">실시간 논쟁 피드</h2>
          <div className="flex items-center gap-1">
            <select 
              value={sort} 
              onChange={(e) => setSort(e.target.value)} 
              className="text-xs font-bold text-gray-400 bg-transparent outline-none cursor-pointer appearance-none"
            >
              <option value="최신순">최신순</option>
              <option value="좋아요순">좋아요순</option>
            </select>
            <span className="text-[10px] text-gray-300">▼</span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-6 px-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.label)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full whitespace-nowrap transition-all border ${
                filter === cat.label 
                  ? 'bg-[#2D3350] border-[#2D3350] text-white shadow-md shadow-[#2D3350]/20' 
                  : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm">{cat.icon}</span>
              <span className="text-xs font-bold">{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          {filteredFeeds.length > 0 ? (
            filteredFeeds.map((feed) => {
              const total = feed.votesA + feed.votesB;
              const perA = ((feed.votesA / total) * 100).toFixed(0);
              const perB = ((feed.votesB / total) * 100).toFixed(0);

              return (
                <div key={feed.id} className="bg-white rounded-[1.8rem] border border-gray-100 shadow-sm overflow-hidden group transition-all">
                  <div className="p-4 flex items-center gap-3">
                    <img src={feed.user.image} alt={feed.user.name} className="w-10 h-10 rounded-full bg-gray-50" />
                    <div>
                      <p className="text-sm font-bold text-gray-800">{feed.user.name}</p>
                      <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-md">{feed.category}</span>
                    </div>
                    <span className="ml-auto text-[11px] font-medium text-gray-400">
                      {formatTime(feed.createdAt)}
                    </span>
                  </div>

                  <div className="px-5 pb-4">
                    <h3 className="text-[17px] font-bold text-[#2D3350] mb-2 leading-snug">{feed.title}</h3>
                    <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed">{feed.description}</p>
                  </div>

                  <div className="bg-gray-50/50 px-5 py-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex flex-col gap-1.5 w-36"> {/* 너비를 살짝 넓힘 */}
                      {/* 🔥 찬성/반대 텍스트 추가 */}
                      <div className="flex justify-between text-[9px] font-black mb-0.5">
                        <span className="text-[#00C193]">찬성</span>
                        <span className="text-[#FF5C5C]">반대</span>
                      </div>
                      
                      <div className="w-full h-2 bg-gray-200 rounded-full flex overflow-hidden">
                        <div className="h-full bg-[#00C193]" style={{ width: `${perA}%` }} />
                        <div className="h-full bg-[#FF5C5C]" style={{ width: `${perB}%` }} />
                      </div>
                      
                      <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-0.5">
                        <span>{perA}%</span>
                        <span>{perB}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                        <span>❤️</span> {feed.likes}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                        <span>💬</span> {feed.comments}
                      </div>
                      
                      <button 
                        onClick={() => navigate(`/debate/${feed.id}`)}
                        className="text-[11px] font-bold text-white bg-[#FF5C5C] px-5 py-2.5 rounded-full shadow-md active:scale-95 hover:bg-[#ff4646] transition-all ml-1 cursor-pointer"
                      >
                        참여하기
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 text-gray-400 text-sm">해당 카테고리의 논쟁이 아직 없습니다.</div>
          )}
        </div>
      </section>
    </div>
  );
}
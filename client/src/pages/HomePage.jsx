import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TodayDebate from '../components/home/TodayDebate';
import CategoryFilter from '../components/home/CategoryFilter';
import DebateCard from '../components/home/DebateCard';

export default function HomePage() {
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState('최신순'); // 정렬 상태 추가
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSortMenu, setShowSortMenu] = useState(false); // 드롭다운 토글

  // 1. 데이터 로드 (1분 자동 갱신)
  const loadRealData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/judgments/feed');
      setFeeds(response.data || []);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealData();
    const timer = setInterval(loadRealData, 60000);
    return () => clearInterval(timer);
  }, []);

  // 2. 정렬 옵션 정의
  const sortOptions = [
    { name: '최신순', description: '최근 작성된 글' },
    { name: '추천순', description: '좋아요가 많은 글' },
    { name: '댓글순', description: '댓글이 많은 글' },
    { name: '조회순', description: '조회수가 높은 글' },
    { name: '인기순', description: '조회수+좋아요+댓글 합산' },
  ];

  // 3. 필터링 및 정렬 로직
  const getProcessedFeeds = () => {
    // 3-1. 카테고리 필터링
    let result = filter === '전체' 
      ? [...feeds] 
      : feeds.filter(feed => (feed.debate?.category || '일상') === filter);

    // 3-2. 정렬 적용
    return result.sort((a, b) => {
      const aData = a.debate || {};
      const bData = b.debate || {};

      switch (sortBy) {
        case '추천순':
          return (bData.likes_count || 0) - (aData.likes_count || 0);
        case '댓글순':
          return (bData.comments_count || 0) - (aData.comments_count || 0);
        case '조회순':
          return (bData.views_count || 0) - (aData.views_count || 0);
        case '인기순':
          const scoreA = (aData.views_count || 0) + (aData.likes_count || 0) * 5 + (aData.comments_count || 0) * 10;
          const scoreB = (bData.views_count || 0) + (bData.likes_count || 0) * 5 + (bData.comments_count || 0) * 10;
          return scoreB - scoreA;
        case '최신순':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  };

  const processedFeeds = getProcessedFeeds();

  // 4. 시간 변환 함수
  const formatTime = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now - past;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);

    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    return past.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FDFDFD]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-bold">데이터를 동기화 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] pb-32 font-sans overflow-x-hidden pt-4">
      
      {/* 🏆 오늘의 핫한 논쟁 배너 */}
      <section>
        <TodayDebate item={feeds[0]} />
      </section>

      {/* 📋 실시간 피드 섹션 */}
      <main className="flex flex-col mt-10">
        
        {/* 💡 타이틀 & 정렬 필터 */}
        <section className="px-6 flex justify-between items-end mb-2 relative">
          <h2 className="text-[22px] font-black text-[#2D3350] tracking-tight">
            실시간 논쟁 피드
          </h2>
          
          {/* 정렬 드롭다운 UI */}
          <div className="relative">
            <div 
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1 text-[#FF6B6B] font-black text-[14px] cursor-pointer pb-1"
            >
              <span>{sortBy}</span>
              <span className={`text-[10px] transition-transform ${showSortMenu ? 'rotate-180' : ''}`}>▼</span>
            </div>

            {showSortMenu && (
              <div className="absolute right-0 top-8 w-36 bg-white shadow-2xl rounded-2xl p-2 z-[100] border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.name}
                    onClick={() => {
                      setSortBy(opt.name);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${
                      sortBy === opt.name ? 'bg-red-50 text-[#FF6B6B]' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 📂 카테고리 필터 */}
        <section className="sticky top-0 z-40 bg-[#FDFDFD]/95 backdrop-blur-sm">
          <CategoryFilter 
            filter={filter} 
            setFilter={setFilter} 
          />
        </section>

        {/* 🃏 논쟁 카드 리스트 */}
        <section className="px-5 mt-4">
          <div className="flex flex-col gap-6">
            {processedFeeds.length > 0 ? (
              processedFeeds.map((feed) => (
                <DebateCard 
                  key={feed.id} 
                  feed={feed} 
                  formatTime={formatTime} 
                />
              ))
            ) : (
              <div className="py-32 text-center text-gray-300">
                <p className="font-black text-lg">해당 조건의 논쟁이 없습니다.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
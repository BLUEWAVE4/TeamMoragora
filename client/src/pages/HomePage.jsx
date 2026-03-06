import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TodayDebate from '../components/home/TodayDebate';
import CategoryFilter from '../components/home/CategoryFilter';
import DebateCard from '../components/home/DebateCard';

export default function HomePage() {
  const [filter, setFilter] = useState('전체');
  const [feeds, setFeeds] = useState([]); 
  const [loading, setLoading] = useState(true);

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

  // 2. 시간 변환 함수
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

  // 3. 필터링 로직
  const filteredFeeds = filter === '전체' 
    ? feeds 
    : feeds.filter(feed => (feed.debate?.category || '일상') === filter);

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
      
      {/* 🏆 오늘의 핫한 논쟁 배너 (최상단 배치) */}
      <section>
        <TodayDebate item={feeds[0]} />
      </section>

      {/* 📋 실시간 피드 섹션 */}
      <main className="flex flex-col mt-10">
        
        {/* 💡 타이틀 & 정렬 필터 (요청하신 대로 헤더 없이 바로 시작) */}
        <section className="px-6 flex justify-between items-end mb-2">
          <h2 className="text-[22px] font-black text-[#2D3350] tracking-tight">
            실시간 논쟁 피드
          </h2>
          <div className="flex items-center gap-1 text-gray-400 font-bold text-[13px] cursor-pointer hover:text-[#FF6B6B] transition-colors pb-1">
            <span>최신순</span>
            <span className="text-[10px] mt-0.5">▼</span>
          </div>
        </section>

        {/* 📂 카테고리 필터 (이미지 스타일 반영) */}
        <section className="sticky top-0 z-40 bg-[#FDFDFD]/95 backdrop-blur-sm">
          <CategoryFilter 
            filter={filter} 
            setFilter={setFilter} 
          />
        </section>

        {/* 🃏 논쟁 카드 리스트 */}
        <section className="px-5 mt-4">
          <div className="flex flex-col gap-6">
            {filteredFeeds.length > 0 ? (
              filteredFeeds.map((feed) => (
                <DebateCard 
                  key={feed.id} 
                  feed={feed} 
                  formatTime={formatTime} 
                />
              ))
            ) : (
              <div className="py-32 text-center text-gray-300">
                <p className="font-black text-lg">해당 카테고리의 논쟁이 없습니다.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ➕ 글쓰기 플로팅 버튼 */}
      <button className="fixed bottom-24 right-6 w-16 h-16 bg-[#FF6B6B] text-white rounded-[24px] shadow-2xl shadow-rose-200 flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-all">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
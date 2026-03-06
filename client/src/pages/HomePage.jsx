import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TodayDebate from '../components/home/TodayDebate';
import CategoryFilter from '../components/home/CategoryFilter';
import DebateCard from '../components/home/DebateCard';

export default function HomePage() {
  const [filter, setFilter] = useState('전체');
  const [feeds, setFeeds] = useState([]); 
  const [loading, setLoading] = useState(true);

  const loadRealData = async () => {
    try {
      // 서버 주소 확인
      const API_BASE = import.meta.env.DEV
        ? 'http://localhost:5000/api'
        : 'https://teammoragora.onrender.com/api';
      const response = await axios.get(`${API_BASE}/judgments/feed`);
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

  const formatTime = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now - past;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    return past.toLocaleDateString();
  };

  // 💡 필터링 로직 수정: '전체'일 때는 다 보여주고, 아닐 때는 debate.category와 비교
  const filteredFeeds = filter === '전체' 
    ? feeds 
    : feeds.filter(feed => feed.debate?.category === filter);

  if (loading) {
    return <div className="py-24 text-center text-gray-300 font-black animate-pulse">데이터 동기화 중...</div>;
  }

  return (
    <div className="flex flex-col gap-6 pb-24 bg-[#FDFDFD] min-h-screen">
      <section><TodayDebate item={feeds[0]} /></section>

      <section className="flex flex-col sticky top-0 z-40 bg-white/80 backdrop-blur-md">
        <CategoryFilter 
          filter={filter} 
          setFilter={setFilter} 
        />
      </section>

      <section className="px-5">
        <div className="flex flex-col gap-6">
          {/* 💡 필터링된 결과가 있을 때만 DebateCard를 렌더링 */}
          {filteredFeeds.length > 0 ? (
            filteredFeeds.map((feed) => (
              <DebateCard 
                key={feed.id} 
                feed={feed} 
                formatTime={formatTime} 
              />
            ))
          ) : (
            <div className="py-24 text-center flex flex-col items-center">
              <img src="/path-to-your-cloud-icon.png" alt="empty" className="w-20 mb-4 opacity-20" />
              <p className="text-gray-300 font-bold">해당 카테고리의 논쟁이 없습니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
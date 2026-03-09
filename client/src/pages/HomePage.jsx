import React, { useState, useEffect } from 'react';
import { getVerdictFeed } from '../services/api';
import TodayDebate from '../components/home/TodayDebate';
import CategoryFilter from '../components/home/CategoryFilter';
import DebateCard from '../components/home/DebateCard';

export default function HomePage() {
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState('최신순');
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const loadRealData = async () => {
    try {
      const data = await getVerdictFeed();
      setFeeds(Array.isArray(data) ? data : data?.data || []);
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

  const sortOptions = [
    { name: '최신순', description: '최근 작성된 글' },
    { name: '추천순', description: '좋아요가 많은 글' },
    { name: '댓글순', description: '댓글이 많은 글' },
    { name: '조회순', description: '조회수가 높은 글' },
    { name: '인기순', description: '종합 인기글' },
  ];

  const getProcessedFeeds = () => {
    let result = filter === '전체' 
      ? [...feeds] 
      : feeds.filter(feed => (feed.debate?.category || '일상') === filter);

    return result.sort((a, b) => {
      const aData = a.debate || {};
      const bData = b.debate || {};
      switch (sortBy) {
        case '추천순': return (bData.likes_count || 0) - (aData.likes_count || 0);
        case '댓글순': return (bData.comments_count || 0) - (aData.comments_count || 0);
        case '조회순': return (bData.views_count || 0) - (aData.views_count || 0);
        case '최신순': default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  };

  const formatTime = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now - past;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes/60)}시간 전`;
    return past.toLocaleDateString();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">데이터 동기화 중...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] pb-32 pt-4">
      <TodayDebate item={feeds[0]} />
      <main className="flex flex-col mt-10 px-6">
        <div className="flex justify-between items-end mb-2 relative">
          <h2 className="text-[22px] font-black text-[#2D3350]">실시간 논쟁 피드</h2>
          <div className="relative">
            <div onClick={() => setShowSortMenu(!showSortMenu)} className="text-[#FF6B6B] font-black text-[14px] cursor-pointer">{sortBy} ▼</div>
            {showSortMenu && (
              <div className="absolute right-0 top-8 w-36 bg-white shadow-2xl rounded-2xl p-2 z-[100] border border-gray-100">
                {sortOptions.map((opt) => (
                  <button key={opt.name} onClick={() => { setSortBy(opt.name); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-bold ${sortBy === opt.name ? 'bg-red-50 text-[#FF6B6B]' : 'text-gray-500'}`}>{opt.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <CategoryFilter filter={filter} setFilter={setFilter} />
        <section className="mt-4 flex flex-col gap-6">
          {getProcessedFeeds().map((feed) => (
            <DebateCard key={feed.id} feed={feed} formatTime={formatTime} />
          ))}
        </section>
      </main>
    </div>
  );
}
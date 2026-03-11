import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getVerdictFeed } from '../services/api';
import TodayDebate from '../components/home/TodayDebate';
import CategoryFilter from '../components/home/CategoryFilter';
import DebateCard from '../components/home/DebateCard';

export default function HomePage() {
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState('최신순');
  const [feeds, setFeeds] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  const observerTarget = useRef(null);

  // 데이터 로드 함수
  const loadData = useCallback(async (pageNum) => {
    if (isFetching || (!hasMore && pageNum !== 1)) return;
    
    setIsFetching(true);
    try {
      // 초기 5개씩 호출 설정
      const data = await getVerdictFeed(pageNum, 5);
      const newItems = Array.isArray(data) ? data : (data?.data || []);

      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setFeeds(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const filteredNewItems = newItems.filter(item => !existingIds.has(item.id));
          return pageNum === 1 ? newItems : [...prev, ...filteredNewItems];
        });
        if (newItems.length < 5) setHasMore(false);
      }
    } catch (err) {
      console.error("피드 로드 실패:", err);
      setHasMore(false);
    } finally {
      setIsFetching(false);
    }
  }, [hasMore, isFetching]);

  // 스크롤 감지 (스피너가 없으므로 rootMargin을 넓게 잡아 미리 로딩)
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        // 화면 하단 300px 근처에 오면 미리 다음 페이지 호출
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          setPage(prev => prev + 1);
        }
      },
      { rootMargin: '300px' } 
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, isFetching]);

  useEffect(() => {
    loadData(page);
  }, [page]);

  // 필터/정렬 변경 시 리셋
  useEffect(() => {
    setFeeds([]);
    setPage(1);
    setHasMore(true);
  }, [filter, sortBy]);

  const processedFeeds = useMemo(() => {
    let result = filter === '전체' 
      ? [...feeds] 
      : feeds.filter(f => (f.debate?.category || '일상') === filter);

    return result.sort((a, b) => {
      const aD = a.debate || {}; const bD = b.debate || {};
      if (sortBy === '추천순') return (bD.likes_count || 0) - (aD.likes_count || 0);
      if (sortBy === '댓글순') return (bD.comments_count || 0) - (aD.comments_count || 0);
      if (sortBy === '조회순') return (bD.views_count || 0) - (aD.views_count || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [feeds, filter, sortBy]);

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] pb-32 pt-4">
      {feeds.length > 0 && <TodayDebate item={feeds[0]} />}
      
      <main className="flex flex-col mt-10 px-6">
        <div className="flex justify-between items-end mb-2 relative">
          <h2 className="text-[22px] font-black text-[#2D3350]">실시간 논쟁 피드</h2>
          <div className="relative">
            <div onClick={() => setShowSortMenu(!showSortMenu)} className="text-[#FF6B6B] font-black text-[14px] cursor-pointer">{sortBy} ▼</div>
            {showSortMenu && (
              <div className="absolute right-0 top-8 w-36 bg-white shadow-2xl rounded-2xl p-2 z-[100] border border-gray-100">
                {['최신순', '추천순', '댓글순', '조회순', '인기순'].map(name => (
                  <button key={name} onClick={() => { setSortBy(name); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-bold ${sortBy === name ? 'bg-red-50 text-[#FF6B6B]' : 'text-gray-500'}`}>{name}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <CategoryFilter filter={filter} setFilter={setFilter} />

        <section className="mt-4 flex flex-col gap-6">
          {processedFeeds.map((feed) => (
            <DebateCard key={feed.id} feed={feed} />
          ))}
        </section>

        {/* 🚀 아무런 표시도 하지 않는 투명 감지 영역 */}
        <div ref={observerTarget} className="h-10 w-full" />
      </main>
    </div>
  );
}
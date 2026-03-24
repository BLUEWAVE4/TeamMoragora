import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getVerdictFeed, getDailyVerdicts } from '../services/api';
import TodayDebate from '../components/home/TodayDebate';
import CategoryFilter from '../components/home/CategoryFilter';
import DebateCard from '../components/home/DebateCard';

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState('최신순');
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(true);
  const [page, setPage] = useState(1);
  const [dailyItems, setDailyItems] = useState([]);

  const hasNextRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const pageRef = useRef(1);

  // 카테고리 한글 → DB값 매핑
  // DB에 한글로 저장되므로 그대로 전달
  const categoryToApi = {
    '전체': null, '일상': '일상', '연애': '연애', '직장': '직장',
    '교육': '교육', '사회': '사회', '정치': '정치',
    '기술': '기술', '철학': '철학', '문화': '문화',
  };

  const loadFeeds = useCallback(async (cat, isInitial = false, query = null) => {
    try {
      if (isInitial) setLoading(true);
      const apiCategory = categoryToApi[cat] || null;
      const res = await getVerdictFeed(1, 5, apiCategory, query || undefined);
      setFeeds(res?.data ?? []);
      pageRef.current = 1;
      hasNextRef.current = res?.hasNext ?? false;
      setHasNext(res?.hasNext ?? false);
      setPage(1);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasNextRef.current) return;
    try {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const nextPage = pageRef.current + 1;
      const apiCategory = categoryToApi[filter] || null;
      const res = await getVerdictFeed(nextPage, 5, apiCategory, searchQuery || undefined);
      setFeeds(prev => [...prev, ...(res?.data ?? [])]);
      pageRef.current = nextPage;
      hasNextRef.current = res?.hasNext ?? false;
      setPage(nextPage);
      setHasNext(res?.hasNext ?? false);
    } catch (error) {
      console.error('추가 로드 실패:', error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [filter]);

  // 초기 로드 + daily
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [_, dailyRes] = await Promise.all([
        loadFeeds('전체', false),
        getDailyVerdicts(5).catch(() => []),
      ]);
      setDailyItems(dailyRes || []);
      setLoading(false);
    };
    init();
  }, []);

  // 카테고리 또는 검색어 변경 시 새로 로드
  useEffect(() => {
    loadFeeds(filter, false, searchQuery || null);
  }, [filter, searchQuery, loadFeeds]);

  // 스크롤 이벤트
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const distanceFromBottom = docHeight - scrollTop - windowHeight;

      if (distanceFromBottom < 200 && hasNextRef.current && !loadingMoreRef.current) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);


  const getProcessedFeeds = () => {
  let result = [...feeds];
  return result.sort((a, b) => {
    const aData = a.debate || {};
    const bData = b.debate || {};
    switch (sortBy) {
      case '좋아요순': return (b.likes_count || 0) - (a.likes_count || 0);
      case '댓글순': return (b.comments_count || 0) - (a.comments_count || 0);
      case '조회순': return (b.views_count || 0) - (a.views_count || 0);
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
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return past.toLocaleDateString();
  };

  if (loading) return (
    <div className="flex flex-col min-h-screen bg-[#F3F1EC] pb-32 pt-4">
      {/* 오늘의 논쟁 스켈레톤 */}
      <div className="mx-5 h-[200px] rounded-2xl bg-gray-200 animate-pulse" />
      {/* 카테고리 스켈레톤 */}
      <div className="flex gap-2 mx-5 mt-6 mb-4">
        {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-14 rounded-full bg-gray-200 animate-pulse" />)}
      </div>
      {/* 카드 스켈레톤 */}
      {[1,2,3].map(i => (
        <div key={i} className="mx-5 mb-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="h-5 w-3/4 rounded bg-gray-200 animate-pulse mb-2" />
          <div className="h-4 w-1/2 rounded bg-gray-100 animate-pulse mb-3" />
          <div className="flex gap-4">
            <div className="h-8 flex-1 rounded-lg bg-gray-100 animate-pulse" />
            <div className="h-8 flex-1 rounded-lg bg-gray-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F1EC] pb-32 pt-4">
      <TodayDebate items={dailyItems} />
      <main className="flex flex-col mt-6 px-5">
        <CategoryFilter filter={filter} setFilter={setFilter} sortBy={sortBy} setSortBy={setSortBy} />

        <section className="mt-2 flex flex-col gap-3">
          {getProcessedFeeds().map((feed) => (
            <DebateCard key={feed.id} feed={feed} formatTime={formatTime} />
          ))}
        </section>

        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!hasNext && feeds.length > 0 && (
          <p className="text-center text-[12px] text-[#1B2A4A]/20 font-sans font-bold py-8">
            모든 논쟁을 확인했습니다
          </p>
        )}
      </main>
    </div>
  );
}
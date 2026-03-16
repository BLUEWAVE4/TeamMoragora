import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';    // 헤더 불러오기
import TabBar from './TabBar';    // 하단 탭바 불러오기

// 헤더를 숨길 경로 패턴
const hideHeaderPaths = ['/moragora/'];

export default function Layout() {
  const location = useLocation();
  const showHeader = !hideHeaderPaths.some(p => location.pathname.startsWith(p) && location.pathname !== '/moragora');

  return (
    /* 준민님의 배경색(#F8F9FA)과 팀원의 최대 너비 변수를 합쳤습니다 */
    <div className="max-w-md mx-auto min-h-screen bg-[#F8F9FA] relative shadow-x">

      {/* 상단 헤더 */}
      {showHeader && <Header />}

      {/* 실제 페이지 내용 영역 */}
      {/* 하단 탭바 높이만큼 여백을 주어 내용이 가려지지 않게 합니다 */}
      <main className="min-h-[calc(100vh-128px)] pb-[calc(var(--tab-h,64px))]">
        <Outlet />
      </main>

      {/* 하단 탭바 */}
      <TabBar />

    </div>
  );
}

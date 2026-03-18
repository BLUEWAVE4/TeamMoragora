import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';    // 헤더 불러오기
import TabBar from './TabBar';    // 하단 탭바 불러오기

export default function Layout() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F8F9FA] relative shadow-x">

      {/* 상단 헤더 — 내부에서 경로별 숨김/표시 처리 */}
      <Header />

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

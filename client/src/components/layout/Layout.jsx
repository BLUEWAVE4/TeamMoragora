import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';    // 헤더 불러오기
import TabBar from './TabBar';    // 하단 탭바 불러오기

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* 상단 헤더 */}
      <Header />

      {/* 실제 페이지 내용이 들어가는 영역 */}
      <main className="max-w-md mx-auto min-h-[calc(100vh-128px)]">
        <Outlet />
      </main>

      {/* 하단 탭바 */}
      <TabBar />
    </div>
  );
}
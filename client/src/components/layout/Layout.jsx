import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import TabBar from './TabBar';
import AnalyticsConsent from '../common/AnalyticsConsent';

export default function Layout() {
  return (
    <div className="app-container max-w-md mx-auto min-h-screen bg-[#F8F9FA] relative shadow-x" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* 상태바 영역 흰색 배경 */}
      <div className="fixed top-0 left-0 right-0 z-[99] bg-white" style={{ height: 'env(safe-area-inset-top, 0px)' }} />

      <Header />

      <main className="min-h-[calc(100vh-128px)] pb-[calc(var(--tab-h,64px))]">
        <Outlet />
      </main>

      <TabBar />
      <AnalyticsConsent />

    </div>
  );
}

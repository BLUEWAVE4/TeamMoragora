import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import TabBar from './TabBar';
import AnalyticsConsent from '../common/AnalyticsConsent';

export default function Layout() {
  return (
    <div className="app-container max-w-md mx-auto min-h-screen bg-[#F8F9FA] relative shadow-x">

      <Header />

      <main className="min-h-[calc(100vh-128px)] pb-[calc(var(--tab-h,64px))]">
        <Outlet />
      </main>

      <TabBar />
      <AnalyticsConsent />

    </div>
  );
}

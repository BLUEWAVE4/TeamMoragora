import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <div className="max-w-[var(--max-w)] mx-auto min-h-dvh bg-bg relative">
      <Header />
      <main className="pb-[calc(var(--tab-h)+24px)]">
        <Outlet />
      </main>
    </div>
  );
}

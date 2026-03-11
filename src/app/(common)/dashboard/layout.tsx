/**
 * @file layout.tsx
 * @description Dashboard 레이아웃 (표준화)
 */

import { SidebarRouter } from '@/components/layout/SidebarRouter';
import { StatusBar } from '@/components/layout/StatusBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      {/* 사이드바 */}
      <SidebarRouter />

      {/* 메인 콘텐츠 영역 (사이드바(48px) + 구분선(2px) = 50px) */}
      <div className="flex-1 flex flex-col ml-[50px]">
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        {/* 하단 상태바 */}
        <StatusBar />
      </div>
    </div>
  );
}

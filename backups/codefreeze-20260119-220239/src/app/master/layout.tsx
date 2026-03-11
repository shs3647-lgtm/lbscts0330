/**
 * @file layout.tsx
 * @description 기초정보(Master) 모듈 레이아웃 
 */

import { Sidebar, StatusBar } from '@/components/layout';
import { LAYOUT } from '@/styles/layout';

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f5f7fa]">
      {/* ===== 1. 사이드바 (48px, fixed) ===== */}
      <Sidebar />

      {/* ===== 구분선: 2px 흰색 (사이드바 | 콘텐츠) ===== */}
      <div 
        className="fixed h-screen z-40 bg-white"
        style={{ 
          left: `${LAYOUT.sidebar.width}px`, 
          width: '2px',
        }} 
      />

      {/* ===== 메인 콘텐츠 영역 ===== */}
      <div 
        className="flex-1 flex flex-col p-0 m-0 ml-[50px]"
      >
        {/* 콘텐츠 */}
        <main className="flex-1 overflow-x-auto overflow-y-auto p-0 m-0">
          {children}
        </main>

        {/* 상태바 */}
        <StatusBar />
      </div>
    </div>
  );
}

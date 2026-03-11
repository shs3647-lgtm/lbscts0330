/**
 * @file layout.tsx
 * @description PFMEA 모듈 레이아웃 (표준화)
 * 
 * 5개 영역 구조:
 * 1. 사이드바 (48px, 고정)
 * 2. 메뉴영역 (상단 고정, 각 페이지에서 구현)
 * 3. 워크시트 영역 (flex-1)
 * 4. 트리뷰 영역 (350px)
 * 5. Status 영역 (우측 상단 통합)
 * 
 * 구분선: 5px 흰색 (모든 영역 사이)
 */

import { Sidebar, StatusBar } from '@/components/layout';
import { LAYOUT } from '@/styles/layout';

export default function PFMEALayout({
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
      {/* 사이드바(48px) + 구분선(2px) = 50px */}
      <div 
        className="flex-1 flex flex-col p-0 m-0 ml-[50px]"
      >
        {/* 콘텐츠 - 패딩 없이 꽉 채움 (바둑판 정렬) + 좌우 스크롤 */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden p-0 m-0">
          {children}
        </main>

        {/* 상태바 */}
        <StatusBar />
      </div>
    </div>
  );
}

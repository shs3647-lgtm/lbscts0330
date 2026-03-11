/**
 * @file layout.tsx
 * @description Control Plan 모듈 레이아웃 (PFMEA와 동일한 구조)
 * 
 * 5개 영역 구조:
 * 1. 사이드바 (48px, 고정)
 * 2. 메뉴영역 (상단 고정, 각 페이지에서 구현)
 * 3. 워크시트 영역 (flex-1)
 * 4. 트리뷰 영역 (350px)
 * 5. Status 영역 (우측 상단 통합)
 * 
 * 구분선: 2px 흰색 (모든 영역 사이)
 */

import { Sidebar, StatusBar } from '@/components/layout';
import { LAYOUT } from '@/styles/layout';

export default function ControlPlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7fa]">
      {/* ===== 1. 사이드바 (48px, fixed) ===== */}
      <Sidebar />

      {/* ===== 메인 콘텐츠 영역 ===== */}
      {/* 사이드바(48px) + 5px 간격 = 53px */}
      <div 
        className="flex-1 flex flex-col p-0 m-0 ml-[53px]"
      >
        {/* 콘텐츠 - 패딩 없이 꽉 채움 */}
        {children}

        {/* 상태바 */}
        <StatusBar />
      </div>
    </div>
  );
}






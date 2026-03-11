/**
 * @file SidebarRouter.tsx
 * @description pathname 기반 사이드바 라우터
 * — "한지붕 세가족" 아키텍처: 가족별 사이드바 dynamic import
 * — FMEA Core 진입 시 Planning/Operations 코드 미로드 (코드 스플리팅)
 * @created 2026-02-27
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// ─── 가족별 사이드바 Dynamic Import (코드 스플리팅) ───

const FmeaSidebar = dynamic(() => import('./FmeaSidebar'), {
  ssr: false,
  loading: () => <SidebarSkeleton />,
});

// Fallback: 전체 사이드바 (common 페이지용)
const FullSidebar = dynamic(() => import('./Sidebar'), {
  ssr: false,
  loading: () => <SidebarSkeleton />,
});

// ─── 로딩 스켈레톤 ───

function SidebarSkeleton() {
  return (
    <div className="fixed left-0 top-0 h-screen w-12 bg-gradient-to-b from-[#1a237e] via-[#283593] to-[#1a237e] z-[100000]" />
  );
}

// ─── 경로 매칭 패턴 ───

const FMEA_CORE_PATTERN = /^\/(pfmea|control-plan|pfd|master)/;
// ─── 라우터 컴포넌트 ───

export const SidebarRouter = React.memo(function SidebarRouter() {
  const pathname = usePathname();

  if (FMEA_CORE_PATTERN.test(pathname)) return <FmeaSidebar />;

  // 공통 페이지 (dashboard, admin, myjob 등) → 전체 사이드바
  return <FullSidebar />;
});

SidebarRouter.displayName = 'SidebarRouter';
export default SidebarRouter;

/**
 * @file layout.tsx
 * @description 웰컴보드 레이아웃 (사이드바 + 바로가기 메뉴 + 심플 컨텐츠)
 * @author AI Assistant
 * @created 2026-01-03
 * @updated 2026-01-13 바로가기 메뉴 추가
 * @version 2.0.0
 *
 * 레이어 구조 (웰컴보드):
 * - L1: Header 없음
 * - L2: TopNav - 바로가기 메뉴 (28px)
 * - L3: ActionBar 없음
 * - L6: Content Area (flex)
 * - L7: StatusBar (24px)
 */

'use client';

import { SidebarRouter, StatusBar } from '@/components/layout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface WelcomeBoardLayoutProps {
  children: React.ReactNode;
}

export default function WelcomeBoardLayout({ children }: WelcomeBoardLayoutProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-slate-100">
      {/* ======== 사이드바 (좌측 고정) ======== */}
      <SidebarRouter />

      {/* ======== 구분선: 2px 흰색 (사이드바 | 콘텐츠) - 고정 위치 ======== */}
      <div
        className="fixed top-0 bottom-0 w-[2px] bg-white z-30"
        style={{ left: '48px' }}
      />

      {/* ======== L2: TopNav - 바로가기 메뉴 (28px) - 고정 위치 ======== */}
      <div
        className="fixed top-0 right-0 z-30 h-7 flex items-center border-b border-white/20"
        style={{
          left: '50px',
          background: 'linear-gradient(to right, #1a237e, #283593, #1a237e)'
        }}
      >
        <div className="px-3 text-white/80 text-[11px] font-semibold border-r border-white/20 h-full flex items-center shrink-0">
          바로가기
        </div>
        <Link 
          href="/pfmea/register" 
          className={`px-4 h-full text-white text-xs flex items-center gap-1 hover:bg-white/10 border-r border-white/15 transition-colors ${
            isActive('/pfmea/register') ? 'bg-white/15 font-semibold' : ''
          }`}
        >
          📝 FMEA등록
        </Link>
        <Link 
          href="/pfmea/list" 
          className={`px-4 h-full text-white text-xs flex items-center gap-1 hover:bg-white/10 border-r border-white/15 transition-colors ${
            isActive('/pfmea/list') ? 'bg-white/15 font-semibold' : ''
          }`}
        >
          📋 FMEA 리스트
        </Link>
        <Link 
          href="/pfmea/worksheet" 
          className={`px-4 h-full text-white text-xs flex items-center gap-1 hover:bg-white/10 border-r border-white/15 transition-colors ${
            isActive('/pfmea/worksheet') ? 'bg-white/15 font-semibold' : ''
          }`}
        >
          ✏️ FMEA 작성화면
        </Link>
        <Link 
          href="/pfmea/revision" 
          className={`px-4 h-full text-white text-xs flex items-center gap-1 hover:bg-white/10 transition-colors ${
            isActive('/pfmea/revision') ? 'bg-white/15 font-semibold' : ''
          }`}
        >
          📜 FMEA 개정관리
        </Link>
      </div>

      {/* ======== L6: 메인 컨텐츠 영역 - 고정 위치 ======== */}
      <main
        className="fixed top-9 right-0 bottom-6 overflow-auto z-10"
        style={{
          left: '50px',
          paddingLeft: '0',
          marginLeft: '0'
        }}
      >
        {children}
      </main>

      {/* ======== L7: 상태바 ======== */}
      <StatusBar />
    </div>
  );
}

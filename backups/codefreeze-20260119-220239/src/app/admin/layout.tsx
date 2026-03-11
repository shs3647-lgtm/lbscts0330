/**
 * @file layout.tsx
 * @description Admin 모듈 레이아웃 (사이드바 + 바로가기 메뉴 포함)
 * @updated 2026-01-13 바로가기 메뉴 추가
 */

'use client';

import { Sidebar, StatusBar } from '@/components/layout';
import { LAYOUT } from '@/styles/layout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
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

      {/* ===== 바로가기 메뉴 (28px) ===== */}
      <div 
        className="fixed top-0 left-[50px] right-0 z-40 h-7 flex items-center border-b border-white/20"
        style={{ background: 'linear-gradient(to right, #1a237e, #283593, #1a237e)' }}
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
          className={`px-4 h-full text-white text-xs flex items-center gap-1 hover:bg-white/10 border-r border-white/15 transition-colors ${
            isActive('/pfmea/revision') ? 'bg-white/15 font-semibold' : ''
          }`}
        >
          📜 FMEA 개정관리
        </Link>
        <Link 
          href="/admin/db-viewer" 
          className={`px-4 h-full text-white text-xs flex items-center gap-1 hover:bg-white/10 transition-colors ${
            isActive('/admin/db-viewer') ? 'bg-white/15 font-semibold' : ''
          }`}
        >
          🗄️ DB뷰어
        </Link>
        <Link 
          href="/admin/settings/users" 
          className={`px-4 h-full text-white text-xs flex items-center gap-1 hover:bg-white/10 transition-colors ${
            isActive('/admin/settings/users') ? 'bg-white/15 font-semibold' : ''
          }`}
        >
          👥 사용자권한
        </Link>
        <Link 
          href="/admin/settings/approval" 
          className={`px-4 h-full text-white text-xs flex items-center gap-1 hover:bg-white/10 transition-colors ${
            isActive('/admin/settings/approval') ? 'bg-white/15 font-semibold' : ''
          }`}
        >
          ✅ 결재설정
        </Link>
      </div>

      {/* ===== 메인 콘텐츠 영역 ===== */}
      {/* 사이드바(48px) + 구분선(2px) = 50px, 바로가기 메뉴(28px) 아래 */}
      <main className="fixed top-7 left-[50px] right-0 bottom-0 overflow-auto">
        {children}
      </main>

      {/* 상태바 */}
      <StatusBar />
    </div>
  );
}


/**
 * @file layout.tsx
 * @description Dashboard 레이아웃 - 사이드바 + TopNav + MainMenu 포함
 * 
 * 레이아웃 구조:
 * - Sidebar (56px) 고정
 * - TopNav (28px) - 바로가기 메뉴
 * - MainMenu (32px) - 대시보드 메뉴
 */

import { Sidebar } from '@/components/layout/Sidebar';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* 사이드바 */}
      <Sidebar />
      
      {/* 사이드바-메인 구분선 */}
      <div className="fixed left-14 top-0 bottom-0 w-1 bg-[#00587a] z-50" />
      
      {/* TopNav - 바로가기 (28px) */}
      <div 
        className="fixed top-0 left-[60px] right-0 z-40 h-7 flex items-center border-b border-white/20"
        style={{ background: 'linear-gradient(to right, #1a237e, #283593, #1a237e)' }}
      >
        <div className="px-3 text-white/80 text-[11px] font-semibold border-r border-white/20 h-full flex items-center">
          바로가기
        </div>
        <Link href="/pfmea/list" className="px-4 h-full text-white text-xs flex items-center gap-1 hover:bg-white/10 border-r border-white/15">
          📋 FMEA 리스트
        </Link>
        <Link href="/pfmea/worksheet" className="px-4 h-full text-white text-xs flex items-center gap-1 hover:bg-white/10 border-r border-white/15">
          ✏️ FMEA 작성
        </Link>
        <Link href="/control-plan" className="px-4 h-full text-white text-xs flex items-center gap-1 hover:bg-white/10 border-r border-white/15">
          📝 Control Plan
        </Link>
        <Link href="/dashboard" className="px-4 h-full text-white text-xs flex items-center gap-1 bg-white/15 font-semibold">
          📊 대시보드
        </Link>
      </div>
      
      {/* MainMenu (32px) */}
      <div 
        className="fixed top-7 left-[60px] right-0 z-40 h-8 flex items-center px-4 border-b border-slate-300"
        style={{ background: 'linear-gradient(to bottom, #e8f4fc, #d0e8f7)' }}
      >
        <span className="text-sm font-bold text-slate-700">📊 FMEA Dashboard</span>
        <span className="mx-3 text-slate-400">|</span>
        <span className="text-xs text-slate-600">위험도 분석 및 개선현황</span>
        <div className="flex-1" />
        <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 mr-2">
          📤 리포트
        </button>
        <button className="px-3 py-1 text-xs bg-slate-500 text-white rounded hover:bg-slate-600">
          🔄 새로고침
        </button>
      </div>
      
      {/* 메인 콘텐츠 - TopNav(28px) + MainMenu(32px) = 60px + 좌우 스크롤 */}
      <main className="flex-1 ml-[60px] mt-[60px] overflow-x-auto">
        {children}
      </main>
    </div>
  );
}


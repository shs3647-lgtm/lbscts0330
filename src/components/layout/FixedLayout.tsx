/**
 * @file FixedLayout.tsx
 * @description 고정 레이아웃 공통 컴포넌트
 * @version 1.0.0
 * @created 2026-01-22
 * 
 * 기능:
 * - TopNav 고정 (최상단)
 * - Sidebar 고정 (좌측)
 * - 콘텐츠 영역만 스크롤
 * - 모든 화면에서 동일한 레이아웃 경험 제공
 */

'use client';

import React, { ReactNode } from 'react';
import { SidebarRouter } from './SidebarRouter';

interface FixedLayoutProps {
    children: ReactNode;
    /** 상단 네비게이션 컴포넌트 (DFMEATopNav, PFMEATopNav 등) */
    topNav?: ReactNode;
    /** TopNav 높이 (기본: 48px) */
    topNavHeight?: number;
    /** 페이지 배경색 (기본: #f0f0f0) */
    bgColor?: string;
    /** 콘텐츠 패딩 (기본: p-3) */
    contentPadding?: string;
    /** Sidebar 표시 여부 (기본: true) */
    showSidebar?: boolean;
}

// 사이드바 너비 상수
const SIDEBAR_WIDTH = 48; // 사이드바 기본 너비
const DIVIDER_WIDTH = 5;  // 구분선 너비
const TOTAL_SIDEBAR = SIDEBAR_WIDTH + DIVIDER_WIDTH; // 53px

export function FixedLayout({
    children,
    topNav,
    topNavHeight = 48,
    bgColor = '#f0f0f0',
    contentPadding = 'p-3',
    showSidebar = true,
}: FixedLayoutProps) {
    return (
        <div className="h-screen w-full max-w-full overflow-x-hidden flex" style={{ backgroundColor: bgColor }}>
            {/* ========== 사이드바 ========== */}
            {showSidebar && <SidebarRouter />}
            
            {/* ========== 구분선 ========== */}
            {showSidebar && (
                <div 
                    className="fixed h-screen z-40 bg-white"
                    style={{ left: SIDEBAR_WIDTH, width: DIVIDER_WIDTH }}
                />
            )}

            {/* ========== 메인 영역 ========== */}
            <div 
                className="flex-1 flex flex-col min-w-0"
                style={{ marginLeft: showSidebar ? TOTAL_SIDEBAR : 0 }}
            >
                {/* 고정 TopNav */}
                {topNav && (
                    <div
                        className="fixed right-0 z-[100]"
                        style={{ 
                            height: topNavHeight,
                            left: showSidebar ? TOTAL_SIDEBAR : 0,
                        }}
                    >
                        {topNav}
                    </div>
                )}

                {/* 스크롤 가능한 콘텐츠 영역 */}
                <div
                    className="flex-1 overflow-y-auto overflow-x-auto"
                    style={{
                        marginTop: topNav ? topNavHeight : 0,
                        height: `calc(100vh - ${topNav ? topNavHeight : 0}px)`,
                    }}
                >
                    <div className={`${contentPadding} max-w-full`}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FixedLayout;

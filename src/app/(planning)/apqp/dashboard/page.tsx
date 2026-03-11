/**
 * @file page.tsx
 * @description APQP 대시보드 페이지 - Project Dashboard 통합
 * @version 1.0.0
 * @created 2026-02-01
 */

'use client';

import React from 'react';
import { SidebarRouter } from '@/components/layout/SidebarRouter';
import APQPTopNav from '@/components/layout/APQPTopNav';
import ProjectDashboardNew from '@/app/(common)/project/components/ProjectDashboardNew';

export default function APQPDashboardPage() {
    return (
        <>
            {/* 사이드바 */}
            <SidebarRouter />

            {/* 상단 네비게이션 */}
            <APQPTopNav />

            {/* 메인 레이아웃 */}
            <div
                className="fixed top-8 left-[53px] right-0 bottom-0 flex flex-col overflow-hidden"
                style={{ background: '#f5f7fa' }}
            >
                {/* Dashboard 컨텐츠 */}
                <ProjectDashboardNew />
            </div>
        </>
    );
}

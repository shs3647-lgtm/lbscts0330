/**
 * @file page.tsx
 * @description Top RPN 분석 페이지
 * @created 2026-02-01
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { FixedLayout } from '@/components/layout';
import PFMEATopNav from '@/components/layout/PFMEATopNav';

// chart.js는 Canvas API를 사용하므로 SSR 비활성화 필수
const TopRPNView = dynamic(
  () => import('@/components/fmea/TopRPNView'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-gray-400">📊 차트 로딩 중...</div> }
);

export default function TopRPNPage() {
    return (
        <FixedLayout
            topNav={<PFMEATopNav />}
            showSidebar={true}
            bgColor="#f0f2f5"
            contentPadding="p-0"
        >
            <div className="h-full flex flex-col">
                <TopRPNView visible={true} />
            </div>
        </FixedLayout>
    );
}

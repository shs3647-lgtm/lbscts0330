/**
 * @file page.tsx
 * @description Top RPN 분석 페이지
 * @created 2026-02-01
 */

'use client';

import React from 'react';
import { FixedLayout } from '@/components/layout';
import TopRPNView from '@/components/fmea/TopRPNView';
import PFMEATopNav from '@/components/layout/PFMEATopNav';

export default function TopRPNPage() {
    return (
        <FixedLayout
            topNav={<PFMEATopNav />}
            showSidebar={true}
            bgColor="#f0f2f5"
            contentPadding="p-0"
        >
            <div className="h-full flex flex-col">
                {/* TopRPNView는 자체적으로 flex-1 및 height:100%를 가짐 */}
                <TopRPNView visible={true} />
            </div>
        </FixedLayout>
    );
}

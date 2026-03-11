'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import FixedLayout from '@/components/layout/FixedLayout';
import ProjectTopNav from '@/components/layout/ProjectTopNav';

// ★ 성능최적화: 1,209행 GanttChartView lazy-load (~20-30KB 초기 번들 절감)
const GanttChartView = dynamic(
    () => import('@/app/(common)/project/components/GanttChartView'),
    {
        ssr: false,
        loading: () => (
            <div className="h-full w-full flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        ),
    }
);

export default function SimpleGanttPage() {
    const ganttRef = useRef(null);

    return (
        <FixedLayout
            topNav={<ProjectTopNav />}
            contentPadding="p-0"
            showSidebar={true}
        >
            <div className="h-full w-full flex flex-col bg-white">
                <GanttChartView ref={ganttRef} visible={true} />
            </div>
        </FixedLayout>
    );
}

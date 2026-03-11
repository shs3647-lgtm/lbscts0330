'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { FixedLayout } from '@/components/layout/FixedLayout';
import ProjectTopNav from '@/components/layout/ProjectTopNav';
import type { GanttChartRef } from './components/GanttChartView';

// ★ 성능최적화: 1,209행 GanttChartView lazy-load (~20-30KB 초기 번들 절감)
const GanttChartView = dynamic(
    () => import('./components/GanttChartView'),
    {
        ssr: false,
        loading: () => (
            <div className="h-full w-full flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        ),
    }
);

/**
 * @file page.tsx
 * @description 프로젝트 관리 페이지 (간트 차트)
 * 
 * ★★★ 구조 개선 - 2026-02-01 ★★★
 * - FixedLayout + ProjectTopNav + GanttChartView 구조
 * - 다른 모듈(APQP, PFMEA, CP)과 동일한 레이아웃
 * 
 * @version 2.0.0 - 레이아웃 구조 표준화
 */

type ProjectView = 'gantt' | 'dashboard' | 'register' | 'list' | 'cft' | 'revision';

const VIEW_LABEL_MAP: Record<ProjectView, string> = {
  gantt: '간트 차트',
  dashboard: '대시보드',
  register: '등록',
  list: '리스트',
  cft: 'CFT',
  revision: '개정',
};

function ProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ganttRef = useRef<GanttChartRef>(null);

  const [currentView, setCurrentView] = useState<ProjectView>('gantt');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // URL 쿼리(view) → 상태 동기화
  useEffect(() => {
    const viewParam = searchParams.get('view') as ProjectView;
    const idParam = searchParams.get('id');

    if (viewParam && VIEW_LABEL_MAP[viewParam]) {
      setCurrentView(viewParam);
    }
    if (idParam) {
      setSelectedProjectId(idParam);
    }
  }, [searchParams]);

  // 현재 뷰에 따른 콘텐츠 렌더링
  const renderContent = () => {
    switch (currentView) {
      case 'gantt':
        return (
          <div className="h-full w-full overflow-hidden bg-white">
            <GanttChartView ref={ganttRef} visible={true} projectId={selectedProjectId || undefined} />
          </div>
        );

      case 'dashboard':
        return (
          <div className="h-full w-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <span className="text-6xl mb-4 block">📈</span>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">프로젝트 대시보드</h2>
              <p className="text-gray-500">개발 중입니다...</p>
            </div>
          </div>
        );

      case 'register':
        return (
          <div className="h-full w-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <span className="text-6xl mb-4 block">📝</span>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">프로젝트 등록</h2>
              <p className="text-gray-500">개발 중입니다...</p>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="h-full w-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <span className="text-6xl mb-4 block">📋</span>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">프로젝트 리스트</h2>
              <p className="text-gray-500">개발 중입니다...</p>
            </div>
          </div>
        );

      case 'cft':
        return (
          <div className="h-full w-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <span className="text-6xl mb-4 block">👥</span>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">CFT 관리</h2>
              <p className="text-gray-500">개발 중입니다...</p>
            </div>
          </div>
        );

      case 'revision':
        return (
          <div className="h-full w-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <span className="text-6xl mb-4 block">📜</span>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">개정 관리</h2>
              <p className="text-gray-500">개발 중입니다...</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <FixedLayout
      topNav={<ProjectTopNav selectedProjectId={selectedProjectId} />}
      topNavHeight={32}
      showSidebar={true}
      contentPadding="p-0"
      bgColor="#f0f0f0"
    >
      {renderContent()}
    </FixedLayout>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <ProjectContent />
    </Suspense>
  );
}

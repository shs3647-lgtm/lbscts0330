'use client';

import CommonTopNav, { TopNavMenuItem } from './CommonTopNav';

interface APQPTopNavProps {
  selectedProjectId?: string | null;
}

/**
 * APQP 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * 
 * @version 3.1.0 - 통계 영역 제거
 */
export default function APQPTopNav({ selectedProjectId }: APQPTopNavProps) {
  const menuItems: TopNavMenuItem[] = [
    { label: '대시보드', shortLabel: '대시보드', path: '/apqp/dashboard', icon: '📈' },
    { label: 'APQP 등록', shortLabel: '등록', path: '/apqp/register', icon: '📝' },
    { label: 'APQP 리스트', shortLabel: '리스트', path: '/apqp/list', icon: '📋' },
    { label: '간트 차트', shortLabel: '간트', path: '/gantt', icon: '📊' },
    { label: 'APQP 작성화면', shortLabel: '작성', path: '/apqp/worksheet', icon: '✏️' },
    { label: 'APQP 개정관리', shortLabel: '개정', path: '/apqp/revision', icon: '📜' },
  ];

  return (
    <CommonTopNav
      title="APQP"
      menuItems={menuItems}
      selectedId={selectedProjectId || undefined}
      gradientFrom="#1565c0"
      gradientTo="#1976d2"
    />
  );
}

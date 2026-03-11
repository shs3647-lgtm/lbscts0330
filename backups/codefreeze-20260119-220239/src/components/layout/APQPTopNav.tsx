'use client';

import CommonTopNav, { TopNavMenuItem, TopNavStatItem } from './CommonTopNav';

interface APQPTopNavProps {
  selectedProjectId?: string | null;
  rowCount?: number;
  stageCount?: number;
  activityCount?: number;
}

/**
 * APQP 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * 
 * @version 3.0.0 - CommonTopNav 기반으로 리팩토링
 */
export default function APQPTopNav({ selectedProjectId, rowCount = 0, stageCount = 5, activityCount = 0 }: APQPTopNavProps) {
  const menuItems: TopNavMenuItem[] = [
    { label: 'APQP 등록', shortLabel: '등록', path: '/apqp/register', icon: '📝' },
    { label: 'APQP 리스트', shortLabel: '리스트', path: '/apqp/list', icon: '📋' },
    { label: 'APQP 작성화면', shortLabel: '작성', path: '/apqp/worksheet', icon: '✏️' },
    { label: 'APQP 개정관리', shortLabel: '개정', path: '/apqp/revision', icon: '📜' },
    { label: 'CFT 등록', shortLabel: 'CFT', path: '/apqp/cft', icon: '👥' },
    { label: '접속 로그', shortLabel: '로그', path: '/apqp/log', icon: '📊' },
  ];

  const statItems: TopNavStatItem[] = [
    { label: 'Stage', value: stageCount, color: 'yellow' },
    { label: 'Activity', value: activityCount, color: 'green' },
  ];

  return (
    <CommonTopNav
      title="APQP"
      menuItems={menuItems}
      statItems={statItems}
      statLabel="APQP:"
      selectedId={selectedProjectId || undefined}
      gradientFrom="#1565c0"
      gradientTo="#1976d2"
    />
  );
}

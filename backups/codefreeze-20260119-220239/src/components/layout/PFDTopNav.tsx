'use client';

import CommonTopNav, { TopNavMenuItem, TopNavStatItem } from './CommonTopNav';

interface PFDTopNavProps {
  linkedFmeaId?: string | null;
  rowCount?: number;
  mainCount?: number;
  inspectCount?: number;
}

/**
 * PFD 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * 
 * @version 3.0.0 - CommonTopNav 기반으로 리팩토링
 */
export default function PFDTopNav({ linkedFmeaId, rowCount = 0, mainCount = 0, inspectCount = 0 }: PFDTopNavProps) {
  const menuItems: TopNavMenuItem[] = [
    { label: 'PFD 등록', shortLabel: '등록', path: '/pfd/register', icon: '📝' },
    { label: 'PFD 리스트', shortLabel: '리스트', path: '/pfd/list', icon: '📋' },
    { label: 'PFD 작성화면', shortLabel: '작성', path: '/pfd/worksheet', icon: '✏️' },
    { label: 'PFD 개정관리', shortLabel: '개정', path: '/pfd/revision', icon: '📜' },
    { label: 'CFT 등록', shortLabel: 'CFT', path: '/pfd/cft', icon: '👥' },
    { label: '접속 로그', shortLabel: '로그', path: '/pfd/log', icon: '📊' },
  ];

  const statItems: TopNavStatItem[] = [
    { label: 'Row', value: rowCount, color: 'blue' },
    { label: '주요', value: mainCount, color: 'green' },
    { label: '검사', value: inspectCount, color: 'orange' },
  ];

  return (
    <CommonTopNav
      title="PFD"
      menuItems={menuItems}
      statItems={statItems}
      statLabel="PFD:"
      selectedId={linkedFmeaId || undefined}
      gradientFrom="#4527a0"
      gradientTo="#5e35b1"
    />
  );
}

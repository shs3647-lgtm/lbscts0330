'use client';

import CommonTopNav, { type TopNavMenuItem } from './CommonTopNav';

interface DFMEATopNavProps {
  selectedFmeaId?: string;
}

/**
 * DFMEA 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * 
 * @version 1.0.0
 */
export default function DFMEATopNav({ selectedFmeaId }: DFMEATopNavProps) {
  const menuItems: TopNavMenuItem[] = [
    { label: 'DFMEA등록', shortLabel: '등록', path: '/dfmea/register', icon: '📝' },
    { label: 'DFMEA 리스트', shortLabel: '리스트', path: '/dfmea/list', icon: '📋' },
    { label: 'DFMEA 작성화면', shortLabel: '작성', path: '/dfmea/worksheet', icon: '✏️' },
    { label: 'DFMEA 개정관리', shortLabel: '개정', path: '/dfmea/revision', icon: '📜' },
  ];

  return (
    <CommonTopNav
      title="D-FMEA"
      menuItems={menuItems}
      selectedId={selectedFmeaId}
      gradientFrom="#4a148c"
      gradientTo="#6a1b9a"
    />
  );
}


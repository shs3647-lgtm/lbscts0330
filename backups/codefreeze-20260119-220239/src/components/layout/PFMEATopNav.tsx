'use client';

import CommonTopNav, { TopNavMenuItem } from './CommonTopNav';

interface PFMEATopNavProps {
  selectedFmeaId?: string;
}

/**
 * PFMEA 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * 
 * @version 3.0.0 - CommonTopNav 기반으로 리팩토링
 */
export default function PFMEATopNav({ selectedFmeaId }: PFMEATopNavProps) {
  const menuItems: TopNavMenuItem[] = [
    { label: 'FMEA등록', shortLabel: '등록', path: '/pfmea/register', icon: '📝' },
    { label: 'FMEA 리스트', shortLabel: '리스트', path: '/pfmea/list', icon: '📋' },
    { label: 'FMEA 작성화면', shortLabel: '작성', path: '/pfmea/worksheet', icon: '✏️' },
    { label: 'FMEA 개정관리', shortLabel: '개정', path: '/pfmea/revision', icon: '📜' },
  ];

  return (
    <CommonTopNav
      title="P-FMEA"
      menuItems={menuItems}
      selectedId={selectedFmeaId}
      gradientFrom="#1a237e"
      gradientTo="#283593"
    />
  );
}

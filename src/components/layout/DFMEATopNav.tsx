'use client';

import CommonTopNav, { TopNavMenuItem } from './CommonTopNav';

interface DFMEATopNavProps {
  selectedFmeaId?: string;
  openNavInNewTab?: boolean;
}

/**
 * DFMEA 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * - PFMEATopNav와 동일 구조, /dfmea/* 경로 사용
 */
export default function DFMEATopNav({ selectedFmeaId, openNavInNewTab }: DFMEATopNavProps) {
  const menuItems: TopNavMenuItem[] = [
    { label: '대시보드', shortLabel: '대시보드', path: '/dfmea/dashboard', icon: '📊' },
    { label: '등록', shortLabel: '등록', path: '/dfmea/register', icon: '📝' },
    { label: '리스트', shortLabel: '리스트', path: '/dfmea/list', icon: '📋' },
    { label: 'New FMEA', shortLabel: 'New FMEA', path: '/dfmea/worksheet', icon: '✏️' },
    { label: '개정관리 현황', shortLabel: '개정관리', path: '/dfmea/revision', icon: '📜' },
    { label: 'AP 개선관리', shortLabel: 'AP개선', path: '/dfmea/ap-improvement', icon: '🚀' },
    { label: 'LLD(설계교훈)', shortLabel: 'LLD', path: '/dfmea/lld', icon: '📋' },
  ];

  return (
    <CommonTopNav
      title="D-FMEA"
      menuItems={menuItems}
      selectedId={selectedFmeaId}
      gradientFrom="#92400e"
      gradientTo="#b45309"
      openNavInNewTab={openNavInNewTab}
    />
  );
}

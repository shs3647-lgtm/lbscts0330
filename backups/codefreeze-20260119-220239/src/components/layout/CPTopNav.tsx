'use client';

import CommonTopNav, { TopNavMenuItem } from './CommonTopNav';

interface CPTopNavProps {
  selectedCpId?: string;
}

/**
 * Control Plan 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * 
 * @version 3.1.0 - 통계 표시 제거
 */
export default function CPTopNav({ selectedCpId }: CPTopNavProps) {
  const menuItems: TopNavMenuItem[] = [
    { label: 'CP 등록', shortLabel: '등록', path: '/control-plan/register', icon: '📝' },
    { label: 'CP 리스트', shortLabel: '리스트', path: '/control-plan/list', icon: '📋' },
    { label: 'CP 작성화면', shortLabel: '작성', path: '/control-plan/worksheet', icon: '✏️' },
    { label: 'CP 개정관리', shortLabel: '개정', path: '/control-plan/revision', icon: '📜' },
    { label: 'CFT 등록', shortLabel: 'CFT', path: '/control-plan/cft', icon: '👥' },
    { label: '접속 로그', shortLabel: '로그', path: '/control-plan/log', icon: '📊' },
  ];

  return (
    <CommonTopNav
      title="Control Plan"
      menuItems={menuItems}
      selectedId={selectedCpId}
      gradientFrom="#00695c"
      gradientTo="#00897b"
    />
  );
}

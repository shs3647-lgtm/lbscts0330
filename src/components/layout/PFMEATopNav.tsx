'use client';

import CommonTopNav, { TopNavMenuItem } from './CommonTopNav';

interface PFMEATopNavProps {
  selectedFmeaId?: string;
  linkedCpNo?: string | null;
  linkedPfdNo?: string | null;
  openNavInNewTab?: boolean;
}

/**
 * PFMEA 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * - 사이드바 메뉴와 순서/명칭 통일
 * 
 * @version 4.0.0 - Admin 메뉴 제거, FMEA 메뉴만 표시
 */
export default function PFMEATopNav({ selectedFmeaId, linkedCpNo, linkedPfdNo, openNavInNewTab }: PFMEATopNavProps) {
  const menuItems: TopNavMenuItem[] = [
    { label: '대시보드', shortLabel: '대시보드', path: '/pfmea/dashboard', icon: '📊' },
{ label: '등록', shortLabel: '등록', path: '/pfmea/register', icon: '📝' },
    { label: '리스트', shortLabel: '리스트', path: '/pfmea/list', icon: '📋' },
    { label: 'New FMEA', shortLabel: 'New FMEA', path: '/pfmea/worksheet', icon: '✏️' },
    { label: '개정관리 현황', shortLabel: '개정관리', path: '/pfmea/revision', icon: '📜' },
    { label: 'AP 개선관리', shortLabel: 'AP개선', path: '/pfmea/ap-improvement', icon: '🚀' },
    { label: 'LLD(필터코드)', shortLabel: 'LLD', path: '/pfmea/lld', icon: '📋' },
  ];

  return (
    <CommonTopNav
      title="P-FMEA"
      menuItems={menuItems}
      selectedId={selectedFmeaId}
      gradientFrom="#1a237e"
      gradientTo="#283593"
      openNavInNewTab={openNavInNewTab}
    />
  );
}


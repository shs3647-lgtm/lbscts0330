'use client';

import CommonTopNav, { TopNavMenuItem } from '@/components/layout/CommonTopNav';

/**
 * @file FamilyTopNav.tsx
 * @description Family FMEA 상단 네비게이션 바
 */
export default function FamilyTopNav() {
  const menuItems: TopNavMenuItem[] = [
    { label: '대시보드', shortLabel: '대시보드', path: '/pfmea/family', icon: '📊' },
    { label: 'Master-00', shortLabel: 'Master', path: '/pfmea/family/master', icon: '📋' },
    { label: '공정별 F/F', shortLabel: 'F/F목록', path: '/pfmea/family/list', icon: '🏭' },
    { label: '새 F/F 생성', shortLabel: '새F/F', path: '/pfmea/family/create', icon: '➕' },
  ];

  return (
    <CommonTopNav
      title="Family FMEA"
      menuItems={menuItems}
      gradientFrom="#1565c0"
      gradientTo="#1976d2"
    />
  );
}

'use client';

import CommonTopNav, { TopNavMenuItem } from '@/components/layout/CommonTopNav';

/**
 * @file PartFmeaTopNav.tsx
 * @description Part FMEA 상단 네비게이션 바
 */
export default function PartFmeaTopNav() {
  const menuItems: TopNavMenuItem[] = [
    { label: '대시보드', shortLabel: '대시보드', path: '/part-fmea', icon: '📊' },
    { label: 'P/F 목록', shortLabel: 'P/F목록', path: '/part-fmea/list', icon: '📋' },
    { label: '새 P/F 생성', shortLabel: '새P/F', path: '/part-fmea/create', icon: '➕' },
  ];

  return (
    <CommonTopNav
      title="Part FMEA"
      menuItems={menuItems}
      gradientFrom="#c62828"
      gradientTo="#d32f2f"
    />
  );
}

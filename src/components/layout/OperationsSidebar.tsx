/**
 * @file OperationsSidebar.tsx
 * @description Operations 가족 전용 사이드바
 * 메뉴: MyJob, WS, PM + Admin
 * @created 2026-02-27
 */

'use client';

import React from 'react';
import { SidebarShell, ColorIcons } from './SidebarShell';
import type { MenuItem } from './SidebarShell';

// ─── 공통 하위 메뉴 생성 함수 ───

const createSubItems = (basePath: string) => [
  { label: '📊 대시보드', href: `${basePath}/dashboard` },
  { label: '등록', href: `${basePath}/register` },
  { label: '리스트', href: `${basePath}/list` },
  { label: '작성화면', href: `${basePath}/worksheet` },
  { label: '개정관리', href: `${basePath}/revision` },
];

// ─── Operations 메뉴 정의 ───

const myJobItem: MenuItem = {
  id: 'myjob',
  label: 'My Job',
  shortLabel: 'My Job',
  Icon: ColorIcons.Person,
  href: '/myjob',
  subItems: [
    { label: '📋 나의 업무현황', href: '/myjob' },
    { label: '💼 결재현황', href: '/approval/approver-portal' },
  ],
};

const mainMenuItems: MenuItem[] = [
  myJobItem,
  {
    id: 'ws', label: 'WS', shortLabel: 'W',
    Icon: ColorIcons.Settings, href: '/ws', subItems: createSubItems('/ws'),
  },
  {
    id: 'pm', label: 'PM', shortLabel: 'Mt',
    Icon: ColorIcons.Maintenance, href: '/pm', subItems: createSubItems('/pm'),
  },
];

const adminMenuItems: MenuItem[] = [
  {
    id: 'admin', label: '시스템 관리', shortLabel: '',
    Icon: ColorIcons.Admin, href: '/admin',
    subItems: [
      { label: '사용자 권한 설정', href: '/admin/settings/users' },
    ],
  },
];

// ─── 컴포넌트 ───

export const OperationsSidebar = React.memo(function OperationsSidebar() {
  return (
    <SidebarShell
      mainMenuItems={mainMenuItems}
      adminMenuItems={adminMenuItems}
    />
  );
});

OperationsSidebar.displayName = 'OperationsSidebar';
export default OperationsSidebar;

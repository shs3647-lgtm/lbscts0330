/**
 * @file PlanningSidebar.tsx
 * @description Planning 가족 전용 사이드바
 * 메뉴: MyJob, APQP (+ Gantt) + Admin
 * @created 2026-02-27
 */

'use client';

import React from 'react';
import { SidebarShell, ColorIcons } from './SidebarShell';
import type { MenuItem } from './SidebarShell';

// ─── Planning 메뉴 정의 ───

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

const apqpSubItems = [
  { label: '📊 대시보드', href: '/apqp/dashboard' },
  { label: '등록', href: '/apqp/register' },
  { label: '리스트', href: '/apqp/list' },
  { label: '📅 간트차트', href: '/gantt' },
  { label: '작성화면', href: '/apqp/worksheet' },
  { label: '개정관리', href: '/apqp/revision' },
];

const mainMenuItems: MenuItem[] = [
  myJobItem,
  {
    id: 'apqp', label: 'APQP', shortLabel: 'A',
    Icon: ColorIcons.Worksheet, href: '/apqp', subItems: apqpSubItems,
  },
];

const adminMenuItems: MenuItem[] = [
  {
    id: 'admin', label: '시스템 관리', shortLabel: '',
    Icon: ColorIcons.Admin, href: '/admin',
    subItems: [
      { label: '사용자 권한 설정', href: '/admin/settings/users' },
      { label: '⚙️ 결제환경설정', href: '/admin/settings/approval' },
    ],
  },
];

// ─── 컴포넌트 ───

export const PlanningSidebar = React.memo(function PlanningSidebar() {
  return (
    <SidebarShell
      mainMenuItems={mainMenuItems}
      adminMenuItems={adminMenuItems}
    />
  );
});

PlanningSidebar.displayName = 'PlanningSidebar';
export default PlanningSidebar;

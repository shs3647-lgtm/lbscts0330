/**
 * @file FmeaSidebar.tsx
 * @description FMEA Core 가족 전용 사이드바
 * 메뉴: MyJob, DFMEA, PFMEA, CP, PFD + 기초정보 + Admin
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

// ─── FMEA Core 메뉴 정의 ───

const myJobItem: MenuItem = {
  id: 'myjob',
  label: 'My Job',
  shortLabel: 'My Job',
  Icon: ColorIcons.Person,
  href: '/myjob',
  subItems: [
    { label: '📋 나의 업무현황', href: '/myjob' },
    { label: '💼 결재현황', href: '/approval/approver-portal' },
    { label: '📊 프로젝트 진행현황', href: '/pfmea/list' },
    { label: '🚀 AP 개선 진행현황', href: '/pfmea/ap-improvement', multiline: true },
  ],
};

const pfmeaSubItems = [
  { label: '📊 대시보드', href: '/pfmea/dashboard' },
  { label: '등록', href: '/pfmea/register' },
  { label: '리스트', href: '/pfmea/list' },
  { label: 'New FMEA', href: '/pfmea/worksheet' },
  // { label: 'FMEA4판', href: '/pfmea/fmea4' },
  { label: '개정관리', href: '/pfmea/revision' },
  { label: '📋 LLD(필터코드)', href: '/pfmea/lld' },
  { label: '🚀 AP 개선관리', href: '/pfmea/ap-improvement', multiline: true },
];

const partFmeaSubItems = [
  { label: '📊 대시보드', href: '/part-fmea' },
  { label: '📋 P/F 목록', href: '/part-fmea/list' },
  { label: '➕ 새 P/F 생성', href: '/part-fmea/create' },
];

const mainMenuItems: MenuItem[] = [
  myJobItem,
  {
    id: 'pfmea', label: 'PFMEA', shortLabel: 'P',
    Icon: ColorIcons.List, href: '/pfmea', subItems: pfmeaSubItems,
  },
  {
    id: 'cp', label: 'Control Plan', shortLabel: 'C',
    Icon: ColorIcons.CFT, href: '/control-plan', subItems: createSubItems('/control-plan'),
  },
  {
    id: 'pfd', label: 'PFD', shortLabel: 'F',
    Icon: ColorIcons.Revision, href: '/pfd', subItems: createSubItems('/pfd'),
  },
  {
    id: 'part-fmea', label: 'Part FMEA', shortLabel: 'PF',
    Icon: ColorIcons.List, href: '/part-fmea', subItems: partFmeaSubItems,
  },
];

const bottomMenuItems: MenuItem[] = [
  {
    id: 'master', label: '기초정보', shortLabel: '',
    Icon: ColorIcons.Settings, href: '/master',
    subItems: [
      { label: '고객사정보', href: '/master/customer' },
      { label: '사용자정보', href: '/master/user' },
      { label: 'PFMEA 임포트', href: '/pfmea/import' },
      { label: 'CP 기초정보', href: '/control-plan/import' },
      { label: 'PFD 기초정보', href: '/pfd/import' },
      { label: '데이타 복구 관리', href: '/master/trash' },
    ],
  },
];

const adminMenuItems: MenuItem[] = [
  {
    id: 'admin', label: '시스템 관리', shortLabel: '',
    Icon: ColorIcons.Admin, href: '/admin',
    subItems: [
      { label: '🏠 관리자 홈', href: '/admin' },
      { label: '👤 사용자관리', href: '/admin/users' },
      { label: '📋 권한(CSV)', href: '/admin/settings/users' },
      { label: '⚙️ 결재환경설정', href: '/admin/settings/approval' },
    ],
  },
];

// ─── 컴포넌트 ───

export const FmeaSidebar = React.memo(function FmeaSidebar() {
  return (
    <SidebarShell
      mainMenuItems={mainMenuItems}
      bottomMenuItems={bottomMenuItems}
      adminMenuItems={adminMenuItems}
    />
  );
});

FmeaSidebar.displayName = 'FmeaSidebar';
export default FmeaSidebar;

/**
 * @file fmea-core-sidebar-menu.tsx
 * @description FMEA Core 사이드바 메뉴 단일 소스 (SSoT)
 * — `FmeaSidebar`·`Sidebar`(Full) 동일 배열 사용. 변경 시 `scripts/audit-fmea-sidebar-routes.ts` 동기화.
 */

'use client';

import type { MenuItem, SubItem } from './SidebarShell';
import { ColorIcons } from './SidebarShell';

export function createCpPfdSubItems(basePath: string): SubItem[] {
  return [
    { label: '📊 대시보드', href: `${basePath}/dashboard` },
    { label: '등록', href: `${basePath}/register` },
    { label: '리스트', href: `${basePath}/list` },
    { label: '작성화면', href: `${basePath}/worksheet` },
    { label: '개정관리', href: `${basePath}/revision` },
  ];
}

const dfmeaSubItems: SubItem[] = [
  { label: '📊 대시보드', href: '/dfmea/dashboard' },
  { label: '등록', href: '/dfmea/register' },
  { label: '리스트', href: '/dfmea/list' },
  { label: 'New DFMEA', href: '/dfmea/worksheet' },
  { label: '개정관리', href: '/dfmea/revision' },
  { label: '📋 설계 LLD', href: '/dfmea/lld' },
];

const pfmeaSubItems: SubItem[] = [
  { label: '📊 대시보드', href: '/pfmea/dashboard' },
  { label: '등록', href: '/pfmea/register' },
  { label: '리스트', href: '/pfmea/list' },
  { label: 'New FMEA', href: '/pfmea/worksheet' },
  { label: '개정관리', href: '/pfmea/revision' },
  { label: '📋 LLD(필터코드)', href: '/pfmea/lld' },
  { label: '🚀 AP 개선관리', href: '/pfmea/ap-improvement', multiline: true },
  { label: '📈 RPN 분석', href: '/rpn-analysis' },
];

export const FMEA_CORE_MY_JOB_ITEM: MenuItem = {
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

export const FMEA_CORE_MAIN_MENU_ITEMS: MenuItem[] = [
  FMEA_CORE_MY_JOB_ITEM,
  {
    id: 'pfmea',
    label: 'PFMEA',
    shortLabel: 'P',
    Icon: ColorIcons.List,
    href: '/pfmea',
    subItems: pfmeaSubItems,
  },
  {
    id: 'dfmea',
    label: 'DFMEA',
    shortLabel: 'D',
    Icon: ColorIcons.List,
    href: '/dfmea',
    subItems: dfmeaSubItems,
  },
  {
    id: 'cp',
    label: 'Control Plan',
    shortLabel: 'C',
    Icon: ColorIcons.CFT,
    href: '/control-plan',
    subItems: createCpPfdSubItems('/control-plan'),
  },
  {
    id: 'pfd',
    label: 'PFD',
    shortLabel: 'F',
    Icon: ColorIcons.Revision,
    href: '/pfd',
    subItems: createCpPfdSubItems('/pfd'),
  },
];

export const FMEA_CORE_BOTTOM_MENU_ITEMS: MenuItem[] = [
  {
    id: 'master',
    label: '기초정보',
    shortLabel: '',
    Icon: ColorIcons.Settings,
    href: '/master',
    subItems: [
      { label: '고객사정보', href: '/master/customer' },
      { label: '사용자정보', href: '/master/user' },
      { label: '시드 데이터 관리', href: '/master/seed-data' },
      { label: 'PFMEA 임포트', href: '/pfmea/import' },
      { label: 'CP 기초정보', href: '/control-plan/import' },
      { label: 'PFD 기초정보', href: '/pfd/import' },
      { label: '데이타 복구 관리', href: '/master/trash' },
    ],
  },
];

export const FMEA_CORE_ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    id: 'admin',
    label: '시스템 관리',
    shortLabel: '',
    Icon: ColorIcons.Admin,
    href: '/admin',
    subItems: [
      { label: '🏠 관리자 홈', href: '/admin' },
      { label: '👤 사용자관리', href: '/admin/users' },
      { label: '📋 권한(CSV)', href: '/admin/settings/users' },
      { label: '⚙️ 결재환경설정', href: '/admin/settings/approval' },
    ],
  },
];

/** 감사 스크립트용 — 메뉴 변경 시 별도 수정 불필요 */
export function collectAllFmeaCoreSidebarHrefs(): string[] {
  const set = new Set<string>();
  const norm = (h: string) => (h.split('?')[0].replace(/\/$/, '') || '/');
  const walk = (items: MenuItem[]) => {
    for (const m of items) {
      set.add(norm(m.href));
      for (const s of m.subItems ?? []) set.add(norm(s.href));
    }
  };
  walk(FMEA_CORE_MAIN_MENU_ITEMS);
  walk(FMEA_CORE_BOTTOM_MENU_ITEMS);
  walk(FMEA_CORE_ADMIN_MENU_ITEMS);
  return [...set];
}

/**
 * @file FmeaSidebar.tsx
 * @description FMEA Core 가족 전용 사이드바 (SidebarShell 래퍼)
 * 메뉴 단일 소스: `fmea-core-sidebar-menu.tsx`
 * @created 2026-02-27
 */

'use client';

import React from 'react';
import { SidebarShell } from './SidebarShell';
import {
  FMEA_CORE_MAIN_MENU_ITEMS,
  FMEA_CORE_BOTTOM_MENU_ITEMS,
  FMEA_CORE_ADMIN_MENU_ITEMS,
} from './fmea-core-sidebar-menu';

export const FmeaSidebar = React.memo(function FmeaSidebar() {
  return (
    <SidebarShell
      mainMenuItems={FMEA_CORE_MAIN_MENU_ITEMS}
      bottomMenuItems={FMEA_CORE_BOTTOM_MENU_ITEMS}
      adminMenuItems={FMEA_CORE_ADMIN_MENU_ITEMS}
    />
  );
});

FmeaSidebar.displayName = 'FmeaSidebar';
export default FmeaSidebar;

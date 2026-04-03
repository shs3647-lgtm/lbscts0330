/**
 * @file dfmea/list/page.tsx
 * @description DFMEA 리스트 페이지 — 공용 FMEAListPage 래퍼
 *
 * ★★★ 2026-04-03: 공용화 리팩토링 ★★★
 * 비즈니스 로직은 @/components/fmea/FMEAListPage.tsx (SSoT)
 * 이 파일은 CONFIG + TopNav만 주입하는 래퍼.
 */

'use client';

import FMEAListPage from '@/components/fmea/FMEAListPage';
import DFMEATopNav from '@/components/layout/DFMEATopNav';

const CONFIG = {
  moduleName: 'DFMEA',
  modulePrefix: 'dfm',
  themeColor: '#d97706',
  registerUrl: '/dfmea/register',
  worksheetUrl: '/dfmea/worksheet',
  apiEndpoint: '/api/fmea/projects?type=D',
};

export default function DFMEAListPage() {
  return <FMEAListPage config={CONFIG} TopNav={DFMEATopNav} />;
}

/**
 * @file index.ts
 * @description 도움말 시스템 중앙 인덱스
 *
 * ┌─ help/
 * │  ├── index.ts          ← 이 파일 (진입점, 모든 데이터 합침)
 * │  ├── types.ts          ← ManualItem, Language 타입
 * │  ├── categories.ts     ← 카테고리 색상/아이콘/UI텍스트
 * │  ├── manual-fmea.ts    ← FMEA 유형 정의 + 등록 + CFT
 * │  ├── manual-import.ts  ← 기초정보 Import
 * │  ├── manual-worksheet.ts ← 워크시트 + 구조분석 + 기능분석 + 편집
 * │  ├── manual-worksheet-advanced.ts ← 고장분석 + 리스크분석 + 최적화 + 전체보기
 * │  ├── manual-modules.ts ← 리스트, 개정관리, 데이터 관리, CP, PFD, APQP
 * │  ├── manual-panels.ts  ← 우측 패널 (트리뷰, PDF, RPN, AP, LLD, GAP)
 * │  ├── manual-modals.ts  ← 모달 사용법 (SOD, 데이터선택, LLD, 특별특성 등)
 * │  ├── manual-dashboard.ts ← 대시보드, MyJob, 결재, Top RPN
 * │  ├── manual-ap-lld.ts  ← AP 개선관리, 습득교훈(LLD), FC검증
 * │  ├── manual-cp-pfd.ts  ← CP/PFD 상세 + 연동
 * │  ├── manual-admin.ts   ← 관리자, 기초정보 관리, WS, PM
 * │  ├── manual-apqp.ts    ← APQP 상세
 * │  └── manual-glossary.ts ← FMEA 용어집
 * └─
 *
 * ★ 새 화면 도움말 추가 방법:
 *   1. help/manual-{화면명}.ts 파일 생성
 *   2. ManualItem[] 배열 export
 *   3. 이 파일에서 import → MANUAL_DATA_KO/EN에 spread
 *   4. categories.ts에 새 카테고리 색상/아이콘 등록
 */

// 타입 re-export
export type { Language, ManualItem } from './types';

// 카테고리 설정 re-export
export { CATEGORY_COLORS, CATEGORY_ICONS, UI_TEXT } from './categories';

// 모듈별 데이터 import
import { FMEA_ITEMS_KO, FMEA_ITEMS_EN } from './manual-fmea';
import { IMPORT_ITEMS_KO, IMPORT_ITEMS_EN } from './manual-import';
import { WORKSHEET_ITEMS_KO, WORKSHEET_ITEMS_EN } from './manual-worksheet';
import { WORKSHEET_ADV_ITEMS_KO, WORKSHEET_ADV_ITEMS_EN } from './manual-worksheet-advanced';
import { MODULES_ITEMS_KO, MODULES_ITEMS_EN } from './manual-modules';
import { PANELS_ITEMS_KO, PANELS_ITEMS_EN } from './manual-panels';
import { MODALS_ITEMS_KO, MODALS_ITEMS_EN } from './manual-modals';
import { DASHBOARD_ITEMS_KO, DASHBOARD_ITEMS_EN } from './manual-dashboard';
import { AP_LLD_ITEMS_KO, AP_LLD_ITEMS_EN } from './manual-ap-lld';
import { CP_PFD_ITEMS_KO, CP_PFD_ITEMS_EN } from './manual-cp-pfd';
import { ADMIN_ITEMS_KO, ADMIN_ITEMS_EN } from './manual-admin';
import { APQP_DETAIL_ITEMS_KO, APQP_DETAIL_ITEMS_EN } from './manual-apqp';
import { GLOSSARY_ITEMS_KO, GLOSSARY_ITEMS_EN } from './manual-glossary';

import type { Language, ManualItem } from './types'; // MANUAL_DATA 타입용

// =====================================================
// 전체 매뉴얼 데이터 (모든 모듈 합침)
// =====================================================

export const MANUAL_DATA: Record<Language, ManualItem[]> = {
  ko: [
    ...FMEA_ITEMS_KO,
    ...IMPORT_ITEMS_KO,
    ...WORKSHEET_ITEMS_KO,
    ...WORKSHEET_ADV_ITEMS_KO,
    ...MODULES_ITEMS_KO,
    ...PANELS_ITEMS_KO,
    ...MODALS_ITEMS_KO,
    ...DASHBOARD_ITEMS_KO,
    ...AP_LLD_ITEMS_KO,
    ...CP_PFD_ITEMS_KO,
    ...ADMIN_ITEMS_KO,
    ...APQP_DETAIL_ITEMS_KO,
    ...GLOSSARY_ITEMS_KO,
  ],
  en: [
    ...FMEA_ITEMS_EN,
    ...IMPORT_ITEMS_EN,
    ...WORKSHEET_ITEMS_EN,
    ...WORKSHEET_ADV_ITEMS_EN,
    ...MODULES_ITEMS_EN,
    ...PANELS_ITEMS_EN,
    ...MODALS_ITEMS_EN,
    ...DASHBOARD_ITEMS_EN,
    ...AP_LLD_ITEMS_EN,
    ...CP_PFD_ITEMS_EN,
    ...ADMIN_ITEMS_EN,
    ...APQP_DETAIL_ITEMS_EN,
    ...GLOSSARY_ITEMS_EN,
  ],
};

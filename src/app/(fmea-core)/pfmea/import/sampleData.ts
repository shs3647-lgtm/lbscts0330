/**
 * @file sampleData.ts
 * @description PFMEA Import 드롭다운 옵션 (PREVIEW_OPTIONS)
 * @updated 2026-03-11 — SAMPLE_DATA 삭제 (Rule 13: 샘플데이터 금지)
 */

// 드롭다운 항목 (L2: 공정/고장형태, L3: 작업요소/고장원인, L1: 완제품/고장영향)
/**
 * 미리보기 옵션 - value는 내부 코드(A1~A6, B1~B5, C1~C4)
 *
 * label / sheetName: `수동_기초정보_Import_v2.7.1.xlsx` 등록양식과 동일한 시트 탭 문자열
 * colIndex: 해당 시트에서 값 열 인덱스 (1-based)
 */
// v5.4+: 기초정보 15시트 — `excel-template.ts` legacy 시트명과 정합
export const PFMEA_BASIC_INFO_EXCEL_TAB_ORDER_V271 = [
  'L2-1(A1) 공정번호',
  'L2-2(A2) 공정명',
  'L2-3(A3) 공정기능',
  'L2-4(A4) 제품특성',
  'L2-5(A5) 고장형태',
  'L2-6(A6) 검출관리',
  'L3-1(B1) 작업요소',
  'L3-2(B2) 요소기능',
  'L3-3(B3) 공정특성',
  'L3-4(B4) 고장원인',
  'L3-5(B5) 예방관리',
  'L1-1(C1) 구분',
  'L1-2(C2) 제품기능',
  'L1-3(C3) 요구사항',
  'L1-4(C4) 고장영향',
] as const;

export const PREVIEW_OPTIONS = [
  // L2 레벨 (공정) - 시트명: L2-1 ~ L2-6
  { value: 'A1', label: 'L2-1(A1) 공정번호', sheetName: 'L2-1(A1) 공정번호', colIndex: 1 },
  { value: 'A2', label: 'L2-2(A2) 공정명', sheetName: 'L2-2(A2) 공정명', colIndex: 2 },
  { value: 'A3', label: 'L2-3(A3) 공정기능', sheetName: 'L2-3(A3) 공정기능', colIndex: 2 },
  { value: 'A4', label: 'L2-4(A4) 제품특성', sheetName: 'L2-4(A4) 제품특성', colIndex: 2 },
  { value: 'A5', label: 'L2-5(A5) 고장형태', sheetName: 'L2-5(A5) 고장형태', colIndex: 2 },
  { value: 'A6', label: 'L2-6(A6) 검출관리', sheetName: 'L2-6(A6) 검출관리', colIndex: 2 },
  // L3 레벨 (작업요소) - 시트명: L3-1 ~ L3-5
  { value: 'B1', label: 'L3-1(B1) 작업요소', sheetName: 'L3-1(B1) 작업요소', colIndex: 2 },
  { value: 'B2', label: 'L3-2(B2) 요소기능', sheetName: 'L3-2(B2) 요소기능', colIndex: 2 },
  { value: 'B3', label: 'L3-3(B3) 공정특성', sheetName: 'L3-3(B3) 공정특성', colIndex: 4 },
  { value: 'B4', label: 'L3-4(B4) 고장원인', sheetName: 'L3-4(B4) 고장원인', colIndex: 3 },
  { value: 'B5', label: 'L3-5(B5) 예방관리', sheetName: 'L3-5(B5) 예방관리', colIndex: 4 },
  // L1 레벨 (완제품) - 시트명: L1-1 ~ L1-4 (고장영향까지)
  { value: 'C1', label: 'L1-1(C1) 구분', sheetName: 'L1-1(C1) 구분', colIndex: 1 },  // YOUR PLANT, SHIP TO PLANT, USER
  { value: 'C2', label: 'L1-2(C2) 제품기능', sheetName: 'L1-2(C2) 제품기능', colIndex: 2 },
  { value: 'C3', label: 'L1-3(C3) 요구사항', sheetName: 'L1-3(C3) 요구사항', colIndex: 2 },
  { value: 'C4', label: 'L1-4(C4) 고장영향', sheetName: 'L1-4(C4) 고장영향', colIndex: 2 },
];

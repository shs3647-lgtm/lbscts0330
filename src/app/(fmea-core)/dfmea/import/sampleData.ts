/**
 * @file sampleData.ts
 * @description PFMEA Import 드롭다운 옵션 (PREVIEW_OPTIONS)
 * @updated 2026-03-11 — SAMPLE_DATA 삭제 (Rule 13: 샘플데이터 금지)
 */

// 드롭다운 항목 (L2: 공정/고장형태, L3: 작업요소/고장원인, L1: 완제품/고장영향)
/**
 * 미리보기 옵션 - value는 내부 코드(A1~C4), label은 신규 시트명(L1-1~L3-5)
 *
 * sheetName: 템플릿 다운로드 시 생성되는 실제 Excel 시트 이름
 * colIndex: 해당 시트에서 데이터가 위치하는 열 인덱스 (1-based)
 * - A1(공정번호)과 A2(공정명)은 'L2-1(A1) 공정번호' 시트에 함께 있음 (1열, 2열)
 */
// v3.0: A6(검출관리), B5(예방관리) IMPORT 제외 → 리스크 탭에서 입력
// v5.4: A4(제품특성), A5(고장형태), B3(공정특성), B4(고장원인/FC) 추가
export const PREVIEW_OPTIONS = [
  // L2 레벨 (공정) - 시트명: L2-1 ~ L2-5
  { value: 'A1', label: 'L2-1(A1) 공정번호', sheetName: 'L2-1(A1) 공정번호', colIndex: 1 },
  { value: 'A2', label: 'L2-2(A2) 공정명', sheetName: 'L2-1(A1) 공정번호', colIndex: 2 },  // A1 시트 2열에 포함
  { value: 'A3', label: 'L2-3(A3) 공정기능', sheetName: 'L2-3(A3) 공정기능', colIndex: 2 },
  { value: 'A4', label: 'L2-4(A4) 제품특성', sheetName: 'L2-4(A4) 제품특성', colIndex: 2 },
  { value: 'A5', label: 'L2-5(A5) 고장형태', sheetName: 'L2-5(A5) 고장형태', colIndex: 2 },
  // L3 레벨 (작업요소) - 시트명: L3-1 ~ L3-4
  { value: 'B1', label: 'L3-1(B1) 작업요소', sheetName: 'L3-1(B1) 작업요소', colIndex: 2 },
  { value: 'B2', label: 'L3-2(B2) 요소기능', sheetName: 'L3-2(B2) 요소기능', colIndex: 2 },
  { value: 'B3', label: 'L3-3(B3) 공정특성', sheetName: 'L3-3(B3) 공정특성', colIndex: 4 },
  { value: 'B4', label: 'L3-4(B4) 고장원인', sheetName: 'L3-4(B4) 고장원인', colIndex: 3 },
  // L1 레벨 (완제품) - 시트명: L1-1 ~ L1-4 (고장영향까지)
  { value: 'C1', label: 'L1-1(C1) 구분', sheetName: 'L1-1(C1) 구분', colIndex: 1 },  // YOUR PLANT, SHIP TO PLANT, USER
  { value: 'C2', label: 'L1-2(C2) 제품기능', sheetName: 'L1-2(C2) 제품기능', colIndex: 2 },
  { value: 'C3', label: 'L1-3(C3) 요구사항', sheetName: 'L1-3(C3) 요구사항', colIndex: 2 },
  { value: 'C4', label: 'L1-4(C4) 고장영향', sheetName: 'L1-4(C4) 고장영향', colIndex: 2 },
];

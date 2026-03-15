/**
 * @file constants.ts
 * @description AP 개선관리 테이블 컬럼 정의 + 엑셀 Import/Export 헤더
 */

// ── 엑셀 Import/Export 헤더 ──
export const EXCEL_HEADERS = [
  'CIP_No', 'AP등급', '대상', '공정번호', '공정명',
  'S', '고장형태(FM)', '고장원인(FC)',
  'O', 'D',
  '예방조치', '검출조치', '담당자',
  '상태', '목표일', '완료일', '비고',
];

export const EXCEL_COL_WIDTHS = [
  12, 6, 8, 8, 15,
  5, 25, 25,
  5, 5,
  30, 30, 10,
  6, 12, 12, 20,
];

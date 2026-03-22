/**
 * @file position-uuid.ts
 * @description 위치기반 UUID 생성 유틸 — 셀 위치가 곧 ID
 *
 * UUID 형식: {Sheet}-R{row}[-C{col}]
 * 예: L1-R2, L2-R5-C6, L3-R37-C7, FC-R100
 *
 * @created 2026-03-22
 */

export type SheetCode = 'L1' | 'L2' | 'L3' | 'FC';

/**
 * 위치기반 UUID 생성
 * @param sheet 시트 코드 (L1/L2/L3/FC)
 * @param row   엑셀 행번호 (1-based, 헤더 제외 = 2부터)
 * @param col   컬럼 번호 (선택, 엔티티 구분용)
 * @returns     예: 'L2-R5' 또는 'L2-R5-C6'
 */
export function positionUUID(sheet: SheetCode, row: number, col?: number): string {
  if (col != null) return `${sheet}-R${row}-C${col}`;
  return `${sheet}-R${row}`;
}

/**
 * 같은 시트 같은 행의 다른 컬럼 FK 참조
 * @param sheet 시트 코드
 * @param row   행번호
 * @param col   대상 컬럼
 * @returns     예: 'L2-R5-C5' (L2시트 5행의 5열 = A4 ProductChar)
 */
export function sameRowFK(sheet: SheetCode, row: number, col: number): string {
  return `${sheet}-R${row}-C${col}`;
}

/**
 * 크로스시트 FK 참조 (FC시트 → L1/L2/L3 시트)
 * @param targetSheet 대상 시트 코드
 * @param targetRow   대상 행번호
 * @param targetCol   대상 컬럼 (선택)
 * @returns           예: 'L1-R2-C4' (L1시트 2행 C4 = FE)
 */
export function crossSheetFK(targetSheet: SheetCode, targetRow: number, targetCol?: number): string {
  if (targetCol != null) return `${targetSheet}-R${targetRow}-C${targetCol}`;
  return `${targetSheet}-R${targetRow}`;
}

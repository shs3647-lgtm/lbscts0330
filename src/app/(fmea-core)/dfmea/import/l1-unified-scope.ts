/**
 * L1 통합시트(L1_UNIFIED) 구분(C1) / 고장영향(C4) 전처리
 * - 병합 셀·대시(-)·N/A 는 엑셀 표시 관례와 동일하게 처리
 */
import type ExcelJS from 'exceljs';
import { getMergedCellValue } from '@/lib/excel-data-range';

const LOOKAHEAD_MAX = 20;

/** 구분 열: 비어 있음·대시·N/A 는 "키 없음"으로 취급 → carry-forward / 병합 / 선행 탐색 적용 */
export function normalizeL1UnifiedScopeKey(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (t === '-' || t === '—' || t === '–') return '';
  const lower = t.toLowerCase();
  if (lower === 'n/a' || lower === 'na') return '';
  return t;
}

/** 고장영향(C4): 해당 없음 표시는 미입력과 동일 */
export function isL1UnifiedEmptyEffectDash(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  if (t === '-' || t === '—' || t === '–') return true;
  const lower = t.toLowerCase();
  return lower === 'n/a' || lower === 'na';
}

/**
 * 한 데이터 행의 유효 구분 키(YP/SP/USER 등) 결정
 * - getMergedCellValue로 병합 마스터 값 반영
 * - 이전 행 cfKey carry-forward
 * - 여전히 없으면 아래쪽 행에서 최대 LOOKAHEAD_MAX 행까지 동일 블록의 구분 추정
 */
export function resolveL1UnifiedRowScopeKey(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  cfKey: string,
): { keyVal: string; nextCfKey: string } {
  let keyVal = normalizeL1UnifiedScopeKey(getMergedCellValue(sheet, row, col));
  if (!keyVal) keyVal = cfKey;
  if (!keyVal) {
    const maxRow = Math.min(row + LOOKAHEAD_MAX, sheet.rowCount);
    for (let look = row + 1; look <= maxRow; look++) {
      const nk = normalizeL1UnifiedScopeKey(getMergedCellValue(sheet, look, col));
      if (nk) {
        keyVal = nk;
        break;
      }
    }
  }
  if (!keyVal) {
    return { keyVal: '', nextCfKey: cfKey };
  }
  return { keyVal, nextCfKey: keyVal };
}

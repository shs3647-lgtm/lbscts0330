/**
 * @file atom-map-whitelist.ts
 * @description 셀 단위 편집 가능 필드 화이트리스트 + 검증 + AP 재계산
 *
 * @created 2026-03-22
 */

import type { EditableField, AtomCellChange } from '@/types/atom-map';

/** 편집 가능 필드 화이트리스트 (16개) */
export const EDITABLE_FIELDS: EditableField[] = [
  // FailureMode
  { table: 'failureModes', field: 'mode', type: 'string', prismaModel: 'failureMode' },
  // FailureCause
  { table: 'failureCauses', field: 'cause', type: 'string', prismaModel: 'failureCause' },
  // FailureEffect
  { table: 'failureEffects', field: 'effect', type: 'string', prismaModel: 'failureEffect' },
  { table: 'failureEffects', field: 'severity', type: 'int', prismaModel: 'failureEffect' },
  // RiskAnalysis
  { table: 'riskAnalyses', field: 'severity', type: 'int', prismaModel: 'riskAnalysis' },
  { table: 'riskAnalyses', field: 'occurrence', type: 'int', prismaModel: 'riskAnalysis' },
  { table: 'riskAnalyses', field: 'detection', type: 'int', prismaModel: 'riskAnalysis' },
  { table: 'riskAnalyses', field: 'ap', type: 'string', prismaModel: 'riskAnalysis' },
  { table: 'riskAnalyses', field: 'preventionControl', type: 'string', prismaModel: 'riskAnalysis' },
  { table: 'riskAnalyses', field: 'detectionControl', type: 'string', prismaModel: 'riskAnalysis' },
  // L2Function
  { table: 'l2Functions', field: 'functionName', type: 'string', prismaModel: 'l2Function' },
  { table: 'l2Functions', field: 'productChar', type: 'string', prismaModel: 'l2Function' },
  // L3Function
  { table: 'l3Functions', field: 'functionName', type: 'string', prismaModel: 'l3Function' },
  { table: 'l3Functions', field: 'processChar', type: 'string', prismaModel: 'l3Function' },
  // ProcessProductChar
  { table: 'processProductChars', field: 'name', type: 'string', prismaModel: 'processProductChar' },
  { table: 'processProductChars', field: 'specialChar', type: 'string', prismaModel: 'processProductChar' },
];

/** 화이트리스트 검색 맵 (O(1) lookup) */
const fieldMap = new Map<string, EditableField>(
  EDITABLE_FIELDS.map(f => [`${f.table}|${f.field}`, f])
);

/** 화이트리스트 검증 — 허용된 table+field인지 확인 */
export function validateChange(change: AtomCellChange): EditableField | null {
  return fieldMap.get(`${change.table}|${change.field}`) || null;
}

/** 값 타입 변환 (string → int 등) */
export function coerceValue(value: string | number, type: 'string' | 'int'): string | number {
  if (type === 'int') {
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    return isNaN(n) ? 0 : n;
  }
  return String(value);
}

/** S/O/D 변경 여부 확인 */
export function isSODChange(change: AtomCellChange): boolean {
  return change.table === 'riskAnalyses' &&
    ['severity', 'occurrence', 'detection'].includes(change.field);
}

/**
 * AIAG-VDA AP 매트릭스 계산 (간이)
 * H: 높은 우선순위, M: 중간, L: 낮은
 */
export function calcAP(s: number, o: number, d: number): string {
  if (s <= 0 || o <= 0 || d <= 0) return '';
  if (s >= 9) {
    if (o >= 4) return 'H';
    if (o >= 2) return d <= 4 ? 'H' : 'M';
    return d <= 2 ? 'H' : d <= 6 ? 'M' : 'L';
  }
  if (s >= 7) {
    if (o >= 4) return d <= 6 ? 'H' : 'M';
    if (o >= 2) return d <= 4 ? 'M' : 'L';
    return 'L';
  }
  if (s >= 5) {
    if (o >= 4) return d <= 4 ? 'H' : 'M';
    if (o >= 2) return d <= 4 ? 'M' : 'L';
    return 'L';
  }
  if (s >= 2) {
    if (o >= 4) return d <= 4 ? 'M' : 'L';
    return 'L';
  }
  return 'L';
}

/**
 * @file riskOptUtils.ts
 * @description RiskOptCellRenderer 공용 유틸리티 함수
 * @created 2026-02-10 RiskOptCellRenderer 1441행 분리
 *
 * 주요 중복 제거:
 * - getMaxSeverity: 기존 6회 반복 → 1 함수
 * - getTargetToL: 기존 3회 반복 → 1 함수
 * - getSafeSODValue: SOD 값 안전 추출 공용화
 */

import type { WorksheetState, WorksheetFailureLink } from '../../constants';

/** L1FailureScope with optional fmId (runtime extension) */
interface FailureScopeWithFmId {
  id: string;
  name: string;
  fmId?: string;
  severity?: number | string;
}
import { HEIGHTS, CELL_STYLE, STEP_DIVIDER, STEP_FIRST_COLUMN_IDS, COMPACT_CELL_STYLE, COMPACT_HEIGHTS, PLACEHOLDER_NA } from './allTabConstants';

// =====================================================
// 스타일 유틸
// =====================================================

/** 셀 스타일 생성 */
export const getCellStyle = (
  globalRowIdx: number,
  cellColor: string,
  cellAltColor: string,
  align: 'left' | 'center' | 'right',
  isClickable = false,
  colId = 0,
  isCompact = false
) => {
  const isStepFirst = STEP_FIRST_COLUMN_IDS.includes(colId);
  const cs = isCompact ? COMPACT_CELL_STYLE : CELL_STYLE;
  return {
    background: globalRowIdx % 2 === 0 ? cellColor : cellAltColor,
    height: isCompact ? undefined : `${HEIGHTS.body}px`,
    minHeight: isCompact ? `${COMPACT_HEIGHTS.body}px` : undefined,
    padding: cs.padding,
    borderTop: '1px solid #ccc',
    borderRight: '1px solid #ccc',
    borderBottom: '1px solid #ccc',
    borderLeft: isStepFirst ? `${STEP_DIVIDER.borderWidth} ${STEP_DIVIDER.borderStyle} ${STEP_DIVIDER.borderColor}` : '1px solid #ccc',
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    textAlign: align,
    verticalAlign: 'middle' as const,
    cursor: isClickable ? 'pointer' : 'default',
    overflow: 'hidden' as const,
    whiteSpace: isCompact ? 'normal' as const : undefined,
    wordBreak: 'break-word' as const,
  };
};

// =====================================================
// AP 계산 (APTable5/6 패널과 동일한 테이블 룩업)
// =====================================================

/** AP 테이블 — AIAG-VDA FMEA 1st Edition 공식 기준. D범위: 7-10, 5-6, 2-4, 1 */
const AP_TABLE: { sMin: number; sMax: number; oMin: number; oMax: number; d: ('H' | 'M' | 'L')[] }[] = [
  { sMin: 9, sMax: 10, oMin: 8, oMax: 10, d: ['H', 'H', 'H', 'H'] },
  { sMin: 9, sMax: 10, oMin: 6, oMax: 7,  d: ['H', 'H', 'H', 'H'] },
  { sMin: 9, sMax: 10, oMin: 4, oMax: 5,  d: ['H', 'H', 'H', 'M'] },
  { sMin: 9, sMax: 10, oMin: 2, oMax: 3,  d: ['H', 'M', 'L', 'L'] },
  { sMin: 9, sMax: 10, oMin: 1, oMax: 1,  d: ['L', 'L', 'L', 'L'] },
  { sMin: 7, sMax: 8,  oMin: 8, oMax: 10, d: ['H', 'H', 'H', 'H'] },
  { sMin: 7, sMax: 8,  oMin: 6, oMax: 7,  d: ['H', 'H', 'H', 'M'] },
  { sMin: 7, sMax: 8,  oMin: 4, oMax: 5,  d: ['H', 'M', 'M', 'M'] },
  { sMin: 7, sMax: 8,  oMin: 2, oMax: 3,  d: ['M', 'M', 'L', 'L'] },
  { sMin: 7, sMax: 8,  oMin: 1, oMax: 1,  d: ['L', 'L', 'L', 'L'] },
  { sMin: 4, sMax: 6,  oMin: 8, oMax: 10, d: ['H', 'H', 'M', 'M'] },
  { sMin: 4, sMax: 6,  oMin: 6, oMax: 7,  d: ['M', 'M', 'M', 'L'] },
  { sMin: 4, sMax: 6,  oMin: 4, oMax: 5,  d: ['M', 'L', 'L', 'L'] },
  { sMin: 4, sMax: 6,  oMin: 2, oMax: 3,  d: ['L', 'L', 'L', 'L'] },
  { sMin: 4, sMax: 6,  oMin: 1, oMax: 1,  d: ['L', 'L', 'L', 'L'] },
  { sMin: 2, sMax: 3,  oMin: 8, oMax: 10, d: ['M', 'M', 'L', 'L'] },
  { sMin: 2, sMax: 3,  oMin: 6, oMax: 7,  d: ['L', 'L', 'L', 'L'] },
  { sMin: 2, sMax: 3,  oMin: 4, oMax: 5,  d: ['L', 'L', 'L', 'L'] },
  { sMin: 2, sMax: 3,  oMin: 2, oMax: 3,  d: ['L', 'L', 'L', 'L'] },
  { sMin: 2, sMax: 3,  oMin: 1, oMax: 1,  d: ['L', 'L', 'L', 'L'] },
];

/** AP 계산 (AP 테이블 룩업 — APTable5/6 패널과 100% 동일) */
export const calcAP = (s: number, o: number, d: number): 'H' | 'M' | 'L' | null => {
  if (s <= 0 || o <= 0 || d <= 0) return null;
  if (s === 1) return 'L';
  // D 범위 인덱스: 7-10 → 0, 5-6 → 1, 2-4 → 2, 1 → 3
  const dIdx = d >= 7 ? 0 : d >= 5 ? 1 : d >= 2 ? 2 : 3;
  for (const row of AP_TABLE) {
    if (s >= row.sMin && s <= row.sMax && o >= row.oMin && o <= row.oMax) {
      return row.d[dIdx];
    }
  }
  return 'L';
};

/** AP 텍스트 색상 */
export const getAPTextColor = (ap: string | undefined | null): string => {
  if (!ap) return '#666';
  if (ap === 'H') return '#c62828';
  if (ap === 'M') return '#f57f17';
  if (ap === 'L') return '#2e7d32';
  return '#333';
};

/** AP 배경색 */
export const getAPColor = (ap: 'H' | 'M' | 'L' | null, cellColor: string, cellAltColor: string, globalRowIdx: number) => {
  if (ap === 'H') return '#ef5350';
  if (ap === 'M') return '#ffeb3b';
  if (ap === 'L') return '#66bb6a';
  return globalRowIdx % 2 === 0 ? cellColor : cellAltColor;
};

// =====================================================
// SOD 유틸
// =====================================================

/** SOD 점수별 텍스트 색상 */
export const getSODTextColor = (val: number): string => {
  if (val <= 0) return '#666';
  if (val <= 3) return '#2e7d32';
  if (val <= 6) return '#f57f17';
  return '#c62828';
};

/** H→L 최단거리 목표값 — AIAG-VDA AP 테이블 L 보장 (O≤3, D≤4) */
export const getTargetToL = (current: number, type: 'O' | 'D' = 'O'): number => {
  if (current <= 1) return 1;
  // 발생도(O): AP=L 보장 → O≤3 (S=9-10에서도 O=2-3,D≤4→L)
  const O_MAP: Record<number, number> = { 10: 3, 9: 3, 8: 3, 7: 3, 6: 3, 5: 3, 4: 2, 3: 1, 2: 1 };
  // 검출도(D): AP=L 보장 → D≤4 (S=9-10에서도 O≤3,D=2-4→L)
  const D_MAP: Record<number, number> = { 10: 4, 9: 4, 8: 4, 7: 4, 6: 4, 5: 3, 4: 3, 3: 2, 2: 1 };
  const map = type === 'O' ? O_MAP : D_MAP;
  return map[current] ?? 1;
};

/** 개선안 텍스트에서 목표 점수 추출 (예: "발생도 3→2 개선" → 2, "검출도 4→3 개선" → 3) */
export function parseTargetFromText(text: string): number {
  if (!text || text === PLACEHOLDER_NA) return 0;
  const match = text.match(/[→>](\d+)/);
  if (match) {
    const n = Number(match[1]);
    return (n >= 1 && n <= 10) ? n : 0;
  }
  return 0;
}

/** riskData에서 SOD 값 안전 추출 (1-10 범위만 허용) */
export function getSafeSODValue(riskData: Record<string, unknown> | undefined, key: string): number {
  const raw = riskData?.[key];
  if (typeof raw === 'number') return (raw >= 1 && raw <= 10) ? raw : 0;
  // ★★★ 2026-02-23: Excel import 시 문자열('3','4') 처리 — 589건 string 타입 대응 ★★★
  if (typeof raw === 'string') {
    const n = Number(raw);
    return (!isNaN(n) && n >= 1 && n <= 10) ? n : 0;
  }
  return 0;
}

// =====================================================
// 데이터 조회 (중복 제거)
// =====================================================

/**
 * FM의 최대 심각도 가져오기 (캐시 적용)
 * ★ 성능 최적화: 동일 state에 대해 fmId별 결과를 캐시
 * - 기존: 매 셀 렌더마다 failureLinks 전체 순회 (500행×40열 = 20,000회)
 * - 개선: 첫 호출 시 전체 Map 빌드 → 이후 O(1) 조회
 */
let _maxSevCache: Map<string, number> | null = null;
let _maxSevFLRef: unknown = null;  // failureLinks 변경 감지용
let _maxSevL1Ref: unknown = null;  // l1 (failureScopes) 변경 감지용

export function getMaxSeverity(fmId: string, state?: WorksheetState): number {
  if (!fmId || !state) return 0;

  // failureLinks/l1 변경 시에만 캐시 무효화 (riskData 변경 시 캐시 유지 → 성능 최적화)
  const flRef = state.failureLinks;
  const l1Ref = state.l1;
  if (_maxSevFLRef !== flRef || _maxSevL1Ref !== l1Ref) {
    _maxSevFLRef = flRef;
    _maxSevL1Ref = l1Ref;
    _maxSevCache = null;
  }

  // 캐시 빌드 (1회만)
  if (!_maxSevCache) {
    _maxSevCache = new Map<string, number>();
    const failureLinks: WorksheetFailureLink[] = state.failureLinks || [];
    const failureScopes: FailureScopeWithFmId[] = (state.l1?.failureScopes as FailureScopeWithFmId[] | undefined) || [];

    // failureLinks에서 fmId별 최대 심각도 (string→number 변환 포함)
    failureLinks.forEach((link: WorksheetFailureLink) => {
      if (link.fmId && link.severity) {
        const sev = typeof link.severity === 'string' ? Number(link.severity) : link.severity;
        if (typeof sev === 'number' && !isNaN(sev)) {
          const prev = _maxSevCache!.get(link.fmId) || 0;
          if (sev > prev) _maxSevCache!.set(link.fmId, sev);
        }
      }
    });

    // failureScopes에서 fmId별 심각도 보강
    // ★★★ 2026-03-17 FIX: fmId 없는 scope도 feId 기반으로 severity 전파 ★★★
    // scope.id = FE.id. failureLinks.feId가 동일한 FE를 참조하므로 feId→fmId 역매핑 가능
    const scopeSevById = new Map<string, number>();
    failureScopes.forEach((scope: FailureScopeWithFmId) => {
      if (scope.fmId) {
        const sev = typeof scope.severity === 'string' ? Number(scope.severity) : scope.severity;
        if (typeof sev === 'number' && !isNaN(sev)) {
          const prev = _maxSevCache!.get(scope.fmId) || 0;
          if (sev > prev) _maxSevCache!.set(scope.fmId, sev);
        }
      }
      // scope.id = feId 기반으로 severity 캐시
      const scopeId = scope.id || (scope as any).feId;
      if (scopeId) {
        const sev = typeof scope.severity === 'string' ? Number(scope.severity) : scope.severity;
        if (typeof sev === 'number' && !isNaN(sev) && sev > 0) {
          scopeSevById.set(scopeId, sev);
        }
      }
    });

    // feId→fmId 역매핑: link.feId의 severity를 link.fmId로 전파
    if (scopeSevById.size > 0) {
      failureLinks.forEach((link: WorksheetFailureLink) => {
        if (link.fmId && link.feId) {
          const feSev = scopeSevById.get(link.feId);
          if (feSev && feSev > 0) {
            const prev = _maxSevCache!.get(link.fmId) || 0;
            if (feSev > prev) _maxSevCache!.set(link.fmId, feSev);
          }
        }
      });
    }
  }

  return _maxSevCache.get(fmId) || 0;
}

/** 개선안 존재 여부 확인 */
export function getImprovementStatus(uniqueKey: string, riskData?: Record<string, unknown>) {
  const hasPreventionOpt = !!(riskData?.[`prevention-opt-${uniqueKey}`] as string)?.trim();
  const hasDetectionOpt = !!(riskData?.[`detection-opt-${uniqueKey}`] as string)?.trim();
  return { hasPreventionOpt, hasDetectionOpt, hasImprovement: hasPreventionOpt || hasDetectionOpt };
}

/** AP=H 또는 M 여부 확인 (개선 필요 여부) */
export function checkNeedsAction(fmId: string, uniqueKey: string, state?: WorksheetState): boolean {
  const s = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-S`) || getMaxSeverity(fmId, state);
  const o = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-O`);
  const d = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-D`);
  const ap = calcAP(s, o, d);
  return ap === 'H' || ap === 'M';
}

/** 특별특성 배지 스타일 — LBS: ★=제품(주황), ◇=공정(청록) + 레거시 CC/SC 호환 */
export const getSpecialCharBadgeStyle = (sc: string | boolean | number | undefined): React.CSSProperties => {
  const s = String(sc || '');
  if (s === '★' || s === 'CC' || s.includes('CC')) return { backgroundColor: '#e65100', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 };
  if (s === '◇' || s === 'SC' || s.includes('SC')) return { backgroundColor: '#00838f', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 };
  return {};
};

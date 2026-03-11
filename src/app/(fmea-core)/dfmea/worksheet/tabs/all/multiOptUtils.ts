/**
 * @file multiOptUtils.ts
 * @description 최적화 6단계 개선안 다중행 관리 유틸리티
 * - FC(고장원인) 1개에 개선안 N행 추가/삭제/조회
 * - 하위호환: Row 0 = suffix 없음 (기존 데이터 100% 호환)
 * - Row 1+ = '#N' suffix (예: prevention-opt-{uk}#1)
 * - S/O/D/AP/RPN: 개선행별 독립 (multi) — 재평가 지원
 * @created 2026-03-01
 * @updated 2026-03-01 — aggregated→multi 전환 (S/O/D/AP/RPN 독립행)
 */

// =====================================================
// ★ Source of Truth: step='최적화' 컬럼 분류 (2026-03-01)
// =====================================================
// INVARIANT: 모든 step='최적화' 컬럼이 여기에 있어야 함.
// 누락 시 optIdx>0 행에서 추가 <td> 생성 → 테이블 레이아웃 파괴.
// 검증: multi-opt-column-guard.test.ts

/**
 * 최적화 컬럼 분류 — 단일 맵에서 MULTI_ROW/AGGREGATED Set 파생
 * - 'multi': 개선행마다 독립 셀 (예방관리개선, S/O/D/AP/RPN 등)
 * - 'aggregated': FC당 1셀, rowSpan 병합 (특별특성만)
 */
export const OPT_COL_CLASSIFICATION: Record<string, 'multi' | 'aggregated'> = {
  // 1. 계획 (multi-row)
  '예방관리개선': 'multi',
  '검출관리개선': 'multi',
  '책임자성명': 'multi',
  '목표완료일자': 'multi',
  '상태': 'multi',
  // 2. 결과 모니터링 (multi-row)
  '개선결과근거': 'multi',
  '완료일자': 'multi',
  // 3. 효과 평가 — 개선행별 독립 재평가 (multi)
  '심각도': 'multi',
  '발생도': 'multi',
  '검출도': 'multi',
  'AP': 'multi',
  'RPN': 'multi',  // optional (showRPN 시에만 존재)
  // 4. 특별특성 — FC 레벨 속성 (aggregated)
  '특별특성': 'aggregated',
  // 비고 (multi-row)
  '비고': 'multi',
};

/** 파생: 다중행 대상 컬럼명 (기존 API 100% 호환) */
export const MULTI_ROW_COL_NAMES = new Set(
  Object.entries(OPT_COL_CLASSIFICATION).filter(([, t]) => t === 'multi').map(([n]) => n)
);

/** 파생: 집계 컬럼명 (기존 API 100% 호환) */
export const AGGREGATED_OPT_COL_NAMES = new Set(
  Object.entries(OPT_COL_CLASSIFICATION).filter(([, t]) => t === 'aggregated').map(([n]) => n)
);

/** 다중행 대상 riskData prefix 목록 (텍스트 필드 suffix 추가 대상) */
const MULTI_ROW_PREFIXES = [
  'prevention-opt-', 'detection-opt-', 'person-opt-', 'targetDate-opt-',
  'status-opt-', 'result-opt-', 'completionDate-opt-', 'note-opt-',
];

/** 재평가 SOD 카테고리 (per-row 키 정리 대상) */
const SOD_CATEGORIES: readonly ('S' | 'O' | 'D')[] = ['S', 'O', 'D'];

// =====================================================
// Dev-Time Assertion: 컬럼 분류 누락 감지
// =====================================================
if (typeof window !== 'undefined') {
  import('./allTabConstants').then(({ COLUMNS_BASE, getColumnsWithRPN }) => {
    const allStep6 = new Set<string>();
    COLUMNS_BASE.filter(c => c.step === '최적화').forEach(c => allStep6.add(c.name));
    getColumnsWithRPN().filter(c => c.step === '최적화').forEach(c => allStep6.add(c.name));
    const classified = new Set(Object.keys(OPT_COL_CLASSIFICATION));
    const missing: string[] = [];
    allStep6.forEach(name => { if (!classified.has(name)) missing.push(name); });
    if (missing.length > 0) {
      console.error(
        `[multiOptUtils] CRITICAL: 최적화 컬럼 미분류 → 테이블 레이아웃 파괴 위험!\n미분류: ${missing.join(', ')}\nOPT_COL_CLASSIFICATION에 추가 필수.`
      );
    }
  }).catch(() => { /* SSR/build 환경 — skip */ });
}

// =====================================================
// 핵심 함수
// =====================================================

/** FC의 개선행 개수 조회 (기본 1) */
export function getOptRowCount(riskData: Record<string, unknown> | undefined, uniqueKey: string): number {
  if (!riskData || !uniqueKey) return 1;
  const val = riskData[`opt-rows-${uniqueKey}`];
  if (typeof val === 'number' && val >= 1) return Math.floor(val);
  if (typeof val === 'string') {
    const n = Number(val);
    if (!isNaN(n) && n >= 1) return Math.floor(n);
  }
  return 1;
}

/** rowIdx에 따른 riskData 키 생성 (0=suffix 없음, 1+='#N') */
export function getOptRowKey(prefix: string, uniqueKey: string, rowIdx: number): string {
  if (rowIdx <= 0) return `${prefix}${uniqueKey}`;
  return `${prefix}${uniqueKey}#${rowIdx}`;
}

/** rowIdx에 따른 재평가 SOD riskData 키 생성
 *  Row 0: `opt-{uk}-{cat}` (하위호환)
 *  Row N: `opt-{uk}#N-{cat}` */
export function getOptSODKey(uniqueKey: string, category: 'S' | 'O' | 'D', rowIdx: number): string {
  if (rowIdx <= 0) return `opt-${uniqueKey}-${category}`;
  return `opt-${uniqueKey}#${rowIdx}-${category}`;
}

/** 개선행 추가 → 업데이트할 riskData 반환 (기본값 일괄 포함) */
export function addOptRow(
  riskData: Record<string, unknown>,
  uniqueKey: string,
): Record<string, string | number> {
  const currentCount = getOptRowCount(riskData, uniqueKey);
  const newIdx = currentCount; // 0-based: 새 행의 인덱스
  const newCount = currentCount + 1;

  const updates: Record<string, string | number> = {
    [`opt-rows-${uniqueKey}`]: newCount,
  };

  // ★ 기본값: 상태 = 'open' (대기)
  updates[getOptRowKey('status-opt-', uniqueKey, newIdx)] = 'open';

  // ★ 기본값: 담당자 = 이전 행 값 승계
  const prevPersonKey = getOptRowKey('person-opt-', uniqueKey, newIdx - 1);
  const prevPerson = (riskData[prevPersonKey] as string) || '';
  if (prevPerson.trim()) {
    updates[getOptRowKey('person-opt-', uniqueKey, newIdx)] = prevPerson;
  }

  // ★ 기본값: SOD = 이전 행의 SOD 값 복사
  for (const cat of SOD_CATEGORIES) {
    const prevSODKey = getOptSODKey(uniqueKey, cat, newIdx - 1);
    const prevVal = riskData[prevSODKey];
    if (typeof prevVal === 'number' && prevVal >= 1 && prevVal <= 10) {
      updates[getOptSODKey(uniqueKey, cat, newIdx)] = prevVal;
    }
  }

  return updates;
}

/** 개선행 삭제 → 업데이트할 riskData 반환 (삭제 키 = '' 빈문자열) */
export function removeOptRow(
  riskData: Record<string, unknown>,
  uniqueKey: string,
  rowIdx: number,
): Record<string, string | number> {
  const currentCount = getOptRowCount(riskData, uniqueKey);
  if (currentCount <= 1 || rowIdx < 0 || rowIdx >= currentCount) return {};

  const updates: Record<string, string | number> = {};

  // 삭제 대상 행의 텍스트 필드 키 제거
  for (const prefix of MULTI_ROW_PREFIXES) {
    updates[getOptRowKey(prefix, uniqueKey, rowIdx)] = '';
  }
  // 삭제 대상 행의 SOD 키 제거
  for (const cat of SOD_CATEGORIES) {
    updates[getOptSODKey(uniqueKey, cat, rowIdx)] = '';
  }

  // 후속 행 번호 재조정: rowIdx+1 → rowIdx, rowIdx+2 → rowIdx+1, ...
  for (let i = rowIdx + 1; i < currentCount; i++) {
    // 텍스트 필드 shift
    for (const prefix of MULTI_ROW_PREFIXES) {
      const fromKey = getOptRowKey(prefix, uniqueKey, i);
      const toKey = getOptRowKey(prefix, uniqueKey, i - 1);
      const val = riskData[fromKey];
      updates[toKey] = val != null ? String(val) : '';
      updates[fromKey] = '';
    }
    // SOD 키 shift
    for (const cat of SOD_CATEGORIES) {
      const fromKey = getOptSODKey(uniqueKey, cat, i);
      const toKey = getOptSODKey(uniqueKey, cat, i - 1);
      const val = riskData[fromKey];
      updates[toKey] = typeof val === 'number' ? val : (val != null ? (Number(val) || '') as unknown as number : '');
      updates[fromKey] = '';
    }
  }

  // 행 개수 업데이트
  const newCount = currentCount - 1;
  updates[`opt-rows-${uniqueKey}`] = newCount <= 1 ? '' as unknown as number : newCount;

  return updates;
}

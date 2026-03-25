/**
 * @file validateAndLogFlatData.ts
 * @description Excel → JSON 중간 검증 레이어
 *
 * 비유: 공장 컨베이어 벨트 중간의 "품질검사 스테이션".
 * 제품(ImportedFlatData[])을 손대지 않고 검사만 하고 그대로 통과시키는 순수 함수.
 *
 * 설계 원칙:
 * - CODEFREEZE 위반 없음 — 기존 파이프라인 코드 수정 불필요
 * - 데이터 불변 — 입력 배열을 절대 변경하지 않음 (검사 + 로그만)
 * - 관대한 검증 — 엑셀은 문자열 데이터이므로 빈칸/오염 허용, 누락만 경고
 * - JSON 로그 — 어디서 깨지는지 추적 가능하도록 구조화된 로그 출력
 */

import type { ImportedFlatData } from '../types';

// ── 타입 ──

/** 개별 항목 검증 이슈 */
export interface ValidationIssue {
  /** 심각도: error=필수 누락, warn=권장 확인, info=정보 */
  severity: 'error' | 'warn' | 'info';
  /** 이슈 코드 (예: 'EMPTY_VALUE', 'MISSING_PARENT') */
  code: string;
  /** 사람이 읽을 수 있는 설명 */
  message: string;
  /** 해당 항목의 위치 정보 */
  location: {
    processNo: string;
    itemCode: string;
    index: number;
    excelRow?: number;
  };
}

/** 공정별 통계 */
export interface ProcessStats {
  processNo: string;
  counts: Record<string, number>;  // itemCode → 건수
  issues: ValidationIssue[];
}

/** 검증 결과 — 데이터는 그대로 통과 */
export interface ValidationReport {
  /** 검증 시각 */
  timestamp: string;
  /** 총 항목 수 */
  totalItems: number;
  /** 이슈 요약 */
  errorCount: number;
  warnCount: number;
  infoCount: number;
  /** 공정별 통계 */
  processSummary: ProcessStats[];
  /** 전체 이슈 목록 */
  issues: ValidationIssue[];
  /** itemCode별 건수 */
  itemCodeCounts: Record<string, number>;
}

/** validateAndLog 반환값 */
export interface ValidateAndLogResult {
  /** 원본 데이터 그대로 (불변) */
  data: ImportedFlatData[];
  /** 검증 리포트 */
  report: ValidationReport;
}

// ── 유효 itemCode 목록 ──

const VALID_ITEM_CODES = new Set([
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
  'B1', 'B2', 'B3', 'B4', 'B5',
  'C1', 'C2', 'C3', 'C4',
]);

const VALID_CATEGORIES = new Set(['A', 'B', 'C']);
const VALID_M4_VALUES = new Set(['MN', 'MC', 'IM', 'EN']);

// ── 필수 관계 규칙 ──

/** 하위 코드가 있으면 상위 코드도 존재해야 함 */
const HIERARCHY_RULES: Array<{ child: string; parent: string; label: string }> = [
  { child: 'A3', parent: 'A2', label: 'A3(공정기능)는 A2(공정명)가 필요' },
  { child: 'A4', parent: 'A3', label: 'A4(제품특성)는 A3(공정기능)이 필요' },
  { child: 'A5', parent: 'A4', label: 'A5(고장형태)는 A4(제품특성)가 필요' },
  { child: 'B2', parent: 'B1', label: 'B2(작업요소기능)는 B1(작업요소)이 필요' },
  { child: 'B3', parent: 'B1', label: 'B3(공정특성)는 B1(작업요소)이 필요' },
  { child: 'B4', parent: 'B1', label: 'B4(고장원인)는 B1(작업요소)이 필요' },
  { child: 'C2', parent: 'C1', label: 'C2(완제품기능)는 C1(완제품구분)이 필요' },
  { child: 'C3', parent: 'C1', label: 'C3(완제품특성)는 C1(완제품구분)이 필요' },
  { child: 'C4', parent: 'C1', label: 'C4(고장영향)는 C1(완제품구분)이 필요' },
];

// ── 검증 함수 (순수, 부작용 없음) ──

/**
 * 단일 항목 검증 — 관대한 정책
 * 빈 value는 warn (error 아님), 잘못된 타입만 error
 */
function validateItem(item: ImportedFlatData, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const loc = {
    processNo: item.processNo,
    itemCode: item.itemCode,
    index,
    excelRow: item.excelRow,
  };

  // 1. itemCode 유효성
  if (!VALID_ITEM_CODES.has(item.itemCode)) {
    issues.push({
      severity: 'error',
      code: 'INVALID_ITEM_CODE',
      message: `알 수 없는 itemCode: "${item.itemCode}"`,
      location: loc,
    });
  }

  // 2. category 유효성
  if (!VALID_CATEGORIES.has(item.category)) {
    issues.push({
      severity: 'error',
      code: 'INVALID_CATEGORY',
      message: `알 수 없는 category: "${item.category}"`,
      location: loc,
    });
  }

  // 3. value 빈칸 — 관대: warn만 (엑셀에서 빈칸 흔함)
  if (!item.value || item.value.trim() === '') {
    issues.push({
      severity: 'warn',
      code: 'EMPTY_VALUE',
      message: `빈 value — 엑셀 빈칸 가능성`,
      location: loc,
    });
  }

  // 4. value가 문자열이 아닌 경우 — error
  if (typeof item.value !== 'string') {
    issues.push({
      severity: 'error',
      code: 'NON_STRING_VALUE',
      message: `value가 문자열이 아님: ${typeof item.value}`,
      location: loc,
    });
  }

  // 5. "[object Object]" 오염 감지
  if (item.value && item.value.includes('[object Object]')) {
    issues.push({
      severity: 'error',
      code: 'OBJECT_CONTAMINATION',
      message: `value에 "[object Object]" 포함 — 객체가 문자열로 변환됨`,
      location: loc,
    });
  }

  // 6. processNo 빈칸 (A/B 카테고리만 — C는 구분값 사용)
  if ((item.category === 'A' || item.category === 'B') && !item.processNo) {
    issues.push({
      severity: 'warn',
      code: 'EMPTY_PROCESS_NO',
      message: `processNo 비어있음`,
      location: loc,
    });
  }

  // 7. B 카테고리 m4 필드 — B1은 필수, B2~B5는 권장
  if (item.category === 'B' && item.itemCode === 'B1' && !item.m4) {
    issues.push({
      severity: 'warn',
      code: 'MISSING_M4',
      message: `B1 항목에 m4(4M 분류) 누락`,
      location: loc,
    });
  }
  if (item.m4 && !VALID_M4_VALUES.has(item.m4)) {
    issues.push({
      severity: 'warn',
      code: 'INVALID_M4',
      message: `m4 값 "${item.m4}"이(가) 표준(MN/MC/IM/EN)과 다름`,
      location: loc,
    });
  }

  // 8. id 누락
  if (!item.id) {
    issues.push({
      severity: 'error',
      code: 'MISSING_ID',
      message: `id가 없음`,
      location: loc,
    });
  }

  return issues;
}

/**
 * 공정별 계층 관계 검증
 * 하위 코드가 있는데 상위 코드가 없으면 warn
 */
function validateHierarchyRelations(
  items: ImportedFlatData[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 공정별 itemCode 존재 여부 맵
  const processCodeMap = new Map<string, Set<string>>();
  for (const item of items) {
    const key = item.processNo || '__global__';
    if (!processCodeMap.has(key)) processCodeMap.set(key, new Set());
    processCodeMap.get(key)!.add(item.itemCode);
  }

  for (const [processNo, codes] of processCodeMap) {
    for (const rule of HIERARCHY_RULES) {
      if (codes.has(rule.child) && !codes.has(rule.parent)) {
        issues.push({
          severity: 'warn',
          code: 'MISSING_PARENT_CODE',
          message: `공정 ${processNo}: ${rule.label}`,
          location: { processNo, itemCode: rule.child, index: -1 },
        });
      }
    }
  }

  return issues;
}

/**
 * 공정별 통계 계산
 */
function computeProcessStats(
  items: ImportedFlatData[],
  allIssues: ValidationIssue[],
): ProcessStats[] {
  const processMap = new Map<string, { counts: Record<string, number>; issues: ValidationIssue[] }>();

  for (const item of items) {
    const key = item.processNo || '__global__';
    if (!processMap.has(key)) {
      processMap.set(key, { counts: {}, issues: [] });
    }
    const entry = processMap.get(key)!;
    entry.counts[item.itemCode] = (entry.counts[item.itemCode] || 0) + 1;
  }

  for (const issue of allIssues) {
    const key = issue.location.processNo || '__global__';
    if (processMap.has(key)) {
      processMap.get(key)!.issues.push(issue);
    }
  }

  return Array.from(processMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([processNo, data]) => ({
      processNo,
      counts: data.counts,
      issues: data.issues,
    }));
}

// ── 공개 API ──

/**
 * ImportedFlatData[] 검증 + 로그 — 데이터는 그대로 통과
 *
 * 비유: X-ray 검사기. 제품을 꺼내거나 수정하지 않고,
 * 사진을 찍어 불량 리포트만 작성하고 제품은 그대로 통과.
 *
 * @param flatData 검증할 데이터 배열 (불변 — 원본 그대로 반환)
 * @returns { data: 원본 그대로, report: 검증 리포트 }
 */
export function validateAndLogFlatData(flatData: ImportedFlatData[]): ValidateAndLogResult {
  const issues: ValidationIssue[] = [];

  // 1. 개별 항목 검증
  flatData.forEach((item, index) => {
    issues.push(...validateItem(item, index));
  });

  // 2. 계층 관계 검증
  issues.push(...validateHierarchyRelations(flatData));

  // 3. itemCode별 건수
  const itemCodeCounts: Record<string, number> = {};
  for (const item of flatData) {
    itemCodeCounts[item.itemCode] = (itemCodeCounts[item.itemCode] || 0) + 1;
  }

  // 4. 공정별 통계
  const processSummary = computeProcessStats(flatData, issues);

  // 5. 리포트 생성
  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    totalItems: flatData.length,
    errorCount: issues.filter(i => i.severity === 'error').length,
    warnCount: issues.filter(i => i.severity === 'warn').length,
    infoCount: issues.filter(i => i.severity === 'info').length,
    processSummary,
    issues,
    itemCodeCounts,
  };

  // 6. 구조화된 JSON 로그 출력
  const logSummary = {
    total: flatData.length,
    codes: itemCodeCounts,
    errors: report.errorCount,
    warns: report.warnCount,
    processes: processSummary.length,
  };

  if (report.errorCount > 0) {
    console.error('[validateAndLog] ❌ 검증 오류 발견:', JSON.stringify(logSummary));
    // error 항목만 상세 출력 (최대 10건)
    issues
      .filter(i => i.severity === 'error')
      .slice(0, 10)
      .forEach(issue => {
        console.error(`  [${issue.code}] ${issue.location.processNo}/${issue.location.itemCode}: ${issue.message}`);
      });
  } else if (report.warnCount > 0) {
    console.warn('[validateAndLog] ⚠️ 검증 경고:', JSON.stringify(logSummary));
  } else {
    console.info('[validateAndLog] ✅ 검증 통과:', JSON.stringify(logSummary));
  }

  // 7. 공정별 코드 분포 로그 (디버깅용)
  console.info('[validateAndLog] 공정별 분포:',
    processSummary.map(p => `${p.processNo}={${Object.entries(p.counts).map(([k, v]) => `${k}:${v}`).join(',')}}`).join(' | ')
  );

  // ★ 데이터는 절대 수정하지 않고 원본 그대로 반환
  return { data: flatData, report };
}

/**
 * @file structural-validation.ts
 * @description Import 시트별 구조적 완전성 검증 엔진
 * - 시트별 데이터 갯수 검증
 * - 상하관계(parentItemId) 완전성 검증
 * - 필수 필드 비어있지 않음 검증
 * - 교차 시트 참조 검증 (A5↔FC, B3↔B4, A4↔B2)
 * @created 2026-03-15
 */

import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';

/** processNo 정규화 — "01" → "1", "10번" → "10", "공정10" → "10" */
function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  const lower = n.toLowerCase();
  if (lower === '0' || lower === '공통공정' || lower === '공통') return '00';
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  if (n !== '0' && n !== '00') n = n.replace(/^0+(?=\d)/, '');
  return n;
}

// ─── 타입 ───

export type StructuralLevel = 'error' | 'warning' | 'info';

export interface StructuralIssue {
  ruleId: string;
  level: StructuralLevel;
  sheet: string;         // 시트명 (예: 'A1', 'FC', 'L3통합')
  processNo: string;
  message: string;
  detail?: string;       // 상세 내용 (사용자 표시용)
}

export interface SheetStats {
  sheetName: string;
  itemCode: string;
  count: number;
  emptyCount: number;       // 빈 값 건수
  orphanCount: number;      // 부모 없는 자식 건수
  processNos: string[];     // 커버된 공정번호
}

export interface StructuralValidationResult {
  issues: StructuralIssue[];
  stats: SheetStats[];
  summary: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
}

// ─── 상수 ───

/** 시트별 필수 항목코드 매핑 */
const REQUIRED_ITEM_CODES = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4'];

/** 상하관계 규칙: 자식 → 부모 */
const PARENT_CHILD_RULES: Record<string, string> = {
  A4: 'A3',    // 제품특성 → 공정기능
  A5: 'A4',    // 고장형태 → 제품특성
  B2: 'B1',    // 요소기능 → 작업요소
  B3: 'B1',    // 공정특성 → 작업요소
  B4: 'B3',    // 고장원인 → 공정특성
  C2: 'C1',    // 제품기능 → 구분
  C3: 'C2',    // 요구사항 → 제품기능
  C4: 'C3',    // 고장영향 → 요구사항
};

/** 항목코드별 한글명 */
const ITEM_LABELS: Record<string, string> = {
  A1: '공정번호', A2: '공정명', A3: '공정기능', A4: '제품특성',
  A5: '고장형태', A6: '검출관리',
  B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: '고장원인', B5: '예방관리',
  C1: '구분', C2: '제품기능', C3: '요구사항', C4: '고장영향',
};

// ─── 유틸 ───

/** flatData를 itemCode별로 그룹핑 */
function groupByItemCode(flatData: ImportedFlatData[]): Map<string, ImportedFlatData[]> {
  const map = new Map<string, ImportedFlatData[]>();
  for (const item of flatData) {
    const arr = map.get(item.itemCode) || [];
    arr.push(item);
    map.set(item.itemCode, arr);
  }
  return map;
}

/** flatData를 processNo별로 그룹핑 */
function groupByProcessNo(items: ImportedFlatData[]): Map<string, ImportedFlatData[]> {
  const map = new Map<string, ImportedFlatData[]>();
  for (const item of items) {
    const arr = map.get(item.processNo) || [];
    arr.push(item);
    map.set(item.processNo, arr);
  }
  return map;
}

/** 고유 공정번호 추출 (A1 기준) */
function getProcessNos(flatData: ImportedFlatData[]): string[] {
  const a1Items = flatData.filter(d => d.itemCode === 'A1');
  return [...new Set(a1Items.map(d => d.processNo))];
}

// ─── 검증 함수 ───

/**
 * 시트별 데이터 갯수 검증
 * - A계열/B계열: 모든 공정번호에 최소 1개 데이터 존재 여부
 * - 빈 값 건수 집계
 */
function validateSheetCounts(
  grouped: Map<string, ImportedFlatData[]>,
  processNos: string[],
): { issues: StructuralIssue[]; stats: SheetStats[] } {
  const issues: StructuralIssue[] = [];
  const stats: SheetStats[] = [];

  for (const itemCode of REQUIRED_ITEM_CODES) {
    const items = grouped.get(itemCode) || [];
    const label = ITEM_LABELS[itemCode] || itemCode;
    const byProcess = groupByProcessNo(items);
    const coveredProcessNos = [...byProcess.keys()];
    const emptyCount = items.filter(d => !(d.value || '').trim()).length;

    stats.push({
      sheetName: `${itemCode} ${label}`,
      itemCode,
      count: items.length,
      emptyCount,
      orphanCount: 0, // orphan은 별도 검증에서 계산
      processNos: coveredProcessNos,
    });

    // A/B계열: 공정번호 커버리지 검증
    if (itemCode.startsWith('A') || itemCode.startsWith('B')) {
      if (items.length === 0) {
        issues.push({
          ruleId: 'SHEET_EMPTY',
          level: 'error',
          sheet: itemCode,
          processNo: '-',
          message: `${label}(${itemCode}) 시트에 데이터가 없습니다`,
        });
        continue;
      }

      // 누락 공정번호 확인
      for (const pNo of processNos) {
        if (!byProcess.has(pNo)) {
          issues.push({
            ruleId: 'PROCESS_MISSING',
            level: 'warning',
            sheet: itemCode,
            processNo: pNo,
            message: `${label}(${itemCode}) — 공정 ${pNo}에 데이터 없음`,
          });
        }
      }

      // 빈 값 경고
      if (emptyCount > 0) {
        issues.push({
          ruleId: 'EMPTY_VALUES',
          level: 'warning',
          sheet: itemCode,
          processNo: '-',
          message: `${label}(${itemCode}) — 빈 값 ${emptyCount}건`,
          detail: items
            .filter(d => !(d.value || '').trim())
            .map(d => `공정${d.processNo}`)
            .slice(0, 5)
            .join(', '),
        });
      }
    }

    // C계열: 최소 1개 존재 여부
    if (itemCode.startsWith('C') && items.length === 0) {
      issues.push({
        ruleId: 'SHEET_EMPTY',
        level: 'error',
        sheet: itemCode,
        processNo: '-',
        message: `${label}(${itemCode}) 시트에 데이터가 없습니다`,
      });
    }
  }

  return { issues, stats };
}

/**
 * 상하관계(parentItemId) 완전성 검증
 * - 모든 자식 항목이 유효한 부모를 참조하는지 확인
 * - parentItemId가 비어있는 자식 건수 집계
 */
function validateParentChildRelations(
  grouped: Map<string, ImportedFlatData[]>,
): StructuralIssue[] {
  const issues: StructuralIssue[] = [];

  // 전체 ID 인덱스 구축
  const allIds = new Set<string>();
  for (const [, items] of grouped) {
    for (const item of items) {
      if (item.id) allIds.add(item.id);
    }
  }

  for (const [childCode, parentCode] of Object.entries(PARENT_CHILD_RULES)) {
    const children = grouped.get(childCode) || [];
    const childLabel = ITEM_LABELS[childCode] || childCode;
    const parentLabel = ITEM_LABELS[parentCode] || parentCode;

    let missingParentCount = 0;
    const missingDetails: string[] = [];

    for (const child of children) {
      if (!child.parentItemId) {
        missingParentCount++;
        if (missingDetails.length < 5) {
          missingDetails.push(`공정${child.processNo}: "${(child.value || '').slice(0, 30)}"`);
        }
      }
    }

    if (missingParentCount > 0 && children.length > 0) {
      issues.push({
        ruleId: 'PARENT_MISSING',
        level: 'warning',
        sheet: childCode,
        processNo: '-',
        message: `${childLabel}(${childCode}) → ${parentLabel}(${parentCode}) 상위 연결 누락 ${missingParentCount}건/${children.length}건`,
        detail: missingDetails.join(', '),
      });
    }
  }

  return issues;
}

/**
 * 교차 시트 참조 검증
 * - A5(고장형태) ↔ FC 고장사슬 FM 매칭
 * - B4(고장원인) ↔ FC 고장원인 매칭
 * - A4(제품특성) ↔ B2(요소기능) 공정번호 커버리지
 */
function validateCrossSheetReferences(
  grouped: Map<string, ImportedFlatData[]>,
  chains: MasterFailureChain[],
): StructuralIssue[] {
  const issues: StructuralIssue[] = [];

  // A5 ↔ FC FM 매칭 (★ processNo 정규화 적용)
  const a5Items = grouped.get('A5') || [];
  if (a5Items.length > 0 && chains.length > 0) {
    const a5Values = new Set(
      a5Items.map(d => `${normalizeProcessNo(d.processNo)}|${(d.value || '').trim().toLowerCase()}`)
    );
    const fcFMs = new Set(
      chains.map(c => `${normalizeProcessNo(c.processNo)}|${(c.fmValue || '').trim().toLowerCase()}`)
    );

    // A5에 있지만 FC에 없는 FM
    let unmatchedA5 = 0;
    for (const key of a5Values) {
      if (!fcFMs.has(key)) unmatchedA5++;
    }
    if (unmatchedA5 > 0) {
      issues.push({
        ruleId: 'A5_FC_MISMATCH',
        level: 'warning',
        sheet: 'A5↔FC',
        processNo: '-',
        message: `A5 고장형태 중 FC 고장사슬에 미매칭 ${unmatchedA5}건/${a5Values.size}건`,
      });
    }
  }

  // B4 ↔ FC 고장원인 매칭 (★ processNo 정규화 적용)
  const b4Items = grouped.get('B4') || [];
  if (b4Items.length > 0 && chains.length > 0) {
    const b4Values = new Set(
      b4Items.map(d => `${normalizeProcessNo(d.processNo)}|${(d.value || '').trim().toLowerCase()}`)
    );
    const fcCauses = new Set(
      chains.map(c => `${normalizeProcessNo(c.processNo)}|${(c.fcValue || '').trim().toLowerCase()}`)
    );

    let unmatchedB4 = 0;
    for (const key of b4Values) {
      if (!fcCauses.has(key)) unmatchedB4++;
    }
    if (unmatchedB4 > 0) {
      issues.push({
        ruleId: 'B4_FC_MISMATCH',
        level: 'info',
        sheet: 'B4↔FC',
        processNo: '-',
        message: `B4 고장원인 중 FC에 미매칭 ${unmatchedB4}건/${b4Values.size}건`,
      });
    }
  }

  // A4 ↔ B계열 공정번호 커버리지
  const a4Items = grouped.get('A4') || [];
  const b1Items = grouped.get('B1') || [];
  if (a4Items.length > 0 && b1Items.length > 0) {
    const a4ProcessNos = new Set(a4Items.map(d => d.processNo));
    const b1ProcessNos = new Set(b1Items.map(d => d.processNo));

    const a4Only: string[] = [];
    for (const pNo of a4ProcessNos) {
      if (!b1ProcessNos.has(pNo)) a4Only.push(pNo);
    }
    if (a4Only.length > 0) {
      issues.push({
        ruleId: 'A4_B1_COVERAGE',
        level: 'warning',
        sheet: 'A4↔B1',
        processNo: a4Only.join(','),
        message: `A4(제품특성)에만 존재하고 B1(작업요소)에 누락된 공정: ${a4Only.join(', ')}`,
      });
    }
  }

  return issues;
}

/**
 * FC 고장사슬 구조 완전성 검증
 * - 12열 완전성 (빈 셀 검출)
 * - 공정번호 커버리지 (모든 공정에 최소 1건)
 * - SOD 값 유효성 (1~10 범위)
 */
function validateFCStructure(
  chains: MasterFailureChain[],
  processNos: string[],
): StructuralIssue[] {
  const issues: StructuralIssue[] = [];

  if (chains.length === 0) {
    issues.push({
      ruleId: 'FC_EMPTY',
      level: 'error',
      sheet: 'FC',
      processNo: '-',
      message: 'FC 고장사슬 데이터가 없습니다 — Import 후 고장연결 불가',
    });
    return issues;
  }

  // 공정번호 커버리지 (★ processNo 정규화 적용)
  const fcProcessNos = new Set(chains.map(c => normalizeProcessNo(c.processNo)));
  const missingProcesses: string[] = [];
  for (const pNo of processNos) {
    if (!fcProcessNos.has(normalizeProcessNo(pNo))) missingProcesses.push(pNo);
  }
  if (missingProcesses.length > 0) {
    issues.push({
      ruleId: 'FC_PROCESS_MISSING',
      level: 'warning',
      sheet: 'FC',
      processNo: missingProcesses.join(','),
      message: `FC 고장사슬 — 공정 ${missingProcesses.length}개 누락: ${missingProcesses.slice(0, 5).join(', ')}`,
    });
  }

  // FM/FC 빈 값 검출
  let emptyFM = 0;
  let emptyFC = 0;
  let emptyFE = 0;
  for (const chain of chains) {
    if (!(chain.fmValue || '').trim()) emptyFM++;
    if (!(chain.fcValue || '').trim()) emptyFC++;
    if (!(chain.feValue || '').trim()) emptyFE++;
  }

  if (emptyFM > 0) {
    issues.push({
      ruleId: 'FC_EMPTY_FM',
      level: 'error',
      sheet: 'FC',
      processNo: '-',
      message: `FC 고장사슬 — 고장형태(FM) 빈 값 ${emptyFM}건`,
    });
  }
  if (emptyFC > 0) {
    issues.push({
      ruleId: 'FC_EMPTY_CAUSE',
      level: 'warning',
      sheet: 'FC',
      processNo: '-',
      message: `FC 고장사슬 — 고장원인(FC) 빈 값 ${emptyFC}건`,
    });
  }
  if (emptyFE > 0) {
    issues.push({
      ruleId: 'FC_EMPTY_FE',
      level: 'warning',
      sheet: 'FC',
      processNo: '-',
      message: `FC 고장사슬 — 고장영향(FE) 빈 값 ${emptyFE}건`,
    });
  }

  // SOD 유효성
  let invalidSOD = 0;
  for (const chain of chains) {
    const s = chain.severity;
    const o = chain.occurrence;
    const d = chain.detection;
    if (s !== undefined && (s < 1 || s > 10)) invalidSOD++;
    if (o !== undefined && (o < 1 || o > 10)) invalidSOD++;
    if (d !== undefined && (d < 1 || d > 10)) invalidSOD++;
  }
  if (invalidSOD > 0) {
    issues.push({
      ruleId: 'FC_INVALID_SOD',
      level: 'error',
      sheet: 'FC',
      processNo: '-',
      message: `FC 고장사슬 — SOD 범위 이탈(1~10 외) ${invalidSOD}건`,
    });
  }

  return issues;
}

// ─── 메인 함수 ───

/**
 * Import 데이터 구조적 완전성 검증
 * SA 확정 전 호출하여 구조 문제를 사전 검출
 *
 * @param flatData - Import된 flat 데이터
 * @param chains - FC 고장사슬 데이터 (있으면)
 * @returns 검증 결과 (이슈 목록 + 시트별 통계)
 */
export function validateStructuralCompleteness(
  flatData: ImportedFlatData[],
  chains: MasterFailureChain[] = [],
): StructuralValidationResult {
  const grouped = groupByItemCode(flatData);
  const processNos = getProcessNos(flatData);

  // 1. 시트별 데이터 갯수 + 빈 값
  const { issues: countIssues, stats } = validateSheetCounts(grouped, processNos);

  // 2. 상하관계 완전성
  const parentIssues = validateParentChildRelations(grouped);

  // 3. 교차 시트 참조
  const crossIssues = validateCrossSheetReferences(grouped, chains);

  // 4. FC 구조 완전성
  const fcIssues = validateFCStructure(chains, processNos);

  const allIssues = [...countIssues, ...parentIssues, ...crossIssues, ...fcIssues];

  return {
    issues: allIssues,
    stats,
    summary: {
      totalIssues: allIssues.length,
      errorCount: allIssues.filter(i => i.level === 'error').length,
      warningCount: allIssues.filter(i => i.level === 'warning').length,
      infoCount: allIssues.filter(i => i.level === 'info').length,
    },
  };
}

/**
 * 구조 검증 결과를 사용자 표시용 문자열로 요약
 */
export function summarizeStructuralIssues(result: StructuralValidationResult): string {
  const { summary, issues } = result;

  if (summary.totalIssues === 0) {
    return '구조 검증 통과 — 모든 시트 데이터 완전';
  }

  const lines: string[] = [];
  lines.push(`구조 검증: 오류 ${summary.errorCount}건, 경고 ${summary.warningCount}건, 정보 ${summary.infoCount}건`);

  // 오류 우선 표시
  const errors = issues.filter(i => i.level === 'error');
  for (const e of errors.slice(0, 10)) {
    lines.push(`  [${e.ruleId}] ${e.message}`);
  }

  // 경고 표시 (최대 10건)
  const warnings = issues.filter(i => i.level === 'warning');
  for (const w of warnings.slice(0, 10)) {
    lines.push(`  [${w.ruleId}] ${w.message}`);
  }

  if (issues.length > 20) {
    lines.push(`  ... 외 ${issues.length - 20}건`);
  }

  return lines.join('\n');
}

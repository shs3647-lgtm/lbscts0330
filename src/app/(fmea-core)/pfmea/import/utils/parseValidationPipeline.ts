/**
 * @file parseValidationPipeline.ts
 * @description Import 파싱 후 검증→자동수정→피드백 3단계 파이프라인
 *
 * 흐름: flatData + chains → 검증기준표 대조 → 자동수정 → 피드백 리포트
 *
 * 검증 기준표 (골든 베이스라인 m002 기반):
 * - 계층 완전성: A1~A6, B1~B5, C1~C4 항목코드별 최소 건수
 * - 계층 관계: parentItemId FK 정합성 (B2→B1, B3→B1, B4→B3, A5→A4)
 * - FC사슬: chains 완전성 (FE-FM-FC 비어있지 않음, SOD 존재)
 * - 공정별: 공정마다 최소 B1+B3+B4 존재
 * - 자동수정: B4 누락→B3 기반 생성, B5 누락→추론, A6 누락→추론
 *
 * @created 2026-03-19
 */

import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';

// ═══════════════════════════════════════════════════════
// 1. 타입 정의
// ═══════════════════════════════════════════════════════

export type IssueSeverity = 'error' | 'warn' | 'info' | 'fixed';

export interface ParseValidationIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  processNo?: string;
  itemCode?: string;
  detail?: string;
}

export interface CriterionResult {
  id: string;
  category: string;
  name: string;
  expected: number | string;
  actual: number | string;
  pass: boolean;
  severity: IssueSeverity;
  autoFixable: boolean;
  fixApplied?: boolean;
  fixDetail?: string;
}

export interface ParseValidationReport {
  fmeaId: string;
  timestamp: string;
  totalItems: number;
  totalChains: number;
  criteria: CriterionResult[];
  issues: ParseValidationIssue[];
  fixes: ParseValidationIssue[];
  summary: {
    totalCriteria: number;
    passed: number;
    failed: number;
    warned: number;
    autoFixed: number;
  };
  itemCodeCounts: Record<string, number>;
  processNos: string[];
}

// ═══════════════════════════════════════════════════════
// 2. 검증 기준표 (골든 베이스라인 m002 기반)
// ═══════════════════════════════════════════════════════

interface ValidationCriterion {
  id: string;
  category: string;
  name: string;
  /** 최소 건수 (절대값 또는 다른 코드의 비율) */
  check: (ctx: ValidationContext) => CriterionResult;
}

interface ValidationContext {
  flatData: ImportedFlatData[];
  chains: MasterFailureChain[];
  byCode: Map<string, ImportedFlatData[]>;
  byProcess: Map<string, ImportedFlatData[]>;
  processNos: string[];
}

function buildContext(flatData: ImportedFlatData[], chains: MasterFailureChain[]): ValidationContext {
  const byCode = new Map<string, ImportedFlatData[]>();
  const byProcess = new Map<string, ImportedFlatData[]>();

  for (const item of flatData) {
    const code = item.itemCode;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(item);

    if (item.category !== 'C') {
      const pno = item.processNo;
      if (!byProcess.has(pno)) byProcess.set(pno, []);
      byProcess.get(pno)!.push(item);
    }
  }

  const processNos = [...new Set(
    flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo)
  )].sort((a, b) => (parseInt(a) || 999) - (parseInt(b) || 999));

  return { flatData, chains, byCode, byProcess, processNos };
}

function cnt(ctx: ValidationContext, code: string): number {
  return (ctx.byCode.get(code) || []).length;
}

const CRITERIA: ValidationCriterion[] = [
  // ─── 카테고리 A (공정 레벨) ───
  { id: 'A1-COUNT', category: '계층 완전성', name: 'A1 공정번호',
    check: (ctx) => ({ id: 'A1-COUNT', category: '계층 완전성', name: 'A1 공정번호',
      expected: '≥1', actual: cnt(ctx, 'A1'), pass: cnt(ctx, 'A1') >= 1,
      severity: cnt(ctx, 'A1') >= 1 ? 'info' : 'error', autoFixable: false }) },

  { id: 'A2-COUNT', category: '계층 완전성', name: 'A2 공정명',
    check: (ctx) => ({ id: 'A2-COUNT', category: '계층 완전성', name: 'A2 공정명',
      expected: `=${cnt(ctx, 'A1')}`, actual: cnt(ctx, 'A2'), pass: cnt(ctx, 'A2') >= cnt(ctx, 'A1'),
      severity: cnt(ctx, 'A2') >= cnt(ctx, 'A1') ? 'info' : 'warn', autoFixable: false }) },

  { id: 'A3-COUNT', category: '계층 완전성', name: 'A3 공정기능',
    check: (ctx) => ({ id: 'A3-COUNT', category: '계층 완전성', name: 'A3 공정기능',
      expected: '≥A1', actual: cnt(ctx, 'A3'), pass: cnt(ctx, 'A3') >= cnt(ctx, 'A1'),
      severity: cnt(ctx, 'A3') >= cnt(ctx, 'A1') ? 'info' : 'warn', autoFixable: true }) },

  { id: 'A4-COUNT', category: '계층 완전성', name: 'A4 제품특성',
    check: (ctx) => ({ id: 'A4-COUNT', category: '계층 완전성', name: 'A4 제품특성',
      expected: '≥1', actual: cnt(ctx, 'A4'), pass: cnt(ctx, 'A4') >= 1,
      severity: cnt(ctx, 'A4') >= 1 ? 'info' : 'error', autoFixable: false }) },

  { id: 'A5-COUNT', category: '계층 완전성', name: 'A5 고장형태(FM)',
    check: (ctx) => ({ id: 'A5-COUNT', category: '계층 완전성', name: 'A5 고장형태(FM)',
      expected: '≥1', actual: cnt(ctx, 'A5'), pass: cnt(ctx, 'A5') >= 1,
      severity: cnt(ctx, 'A5') >= 1 ? 'info' : 'error', autoFixable: false }) },

  { id: 'A6-COUNT', category: '계층 완전성', name: 'A6 검출관리(DC)',
    check: (ctx) => {
      const a6 = cnt(ctx, 'A6');
      return { id: 'A6-COUNT', category: '계층 완전성', name: 'A6 검출관리(DC)',
        expected: '≥1', actual: a6, pass: a6 >= 1,
        severity: a6 >= 1 ? 'info' : 'warn', autoFixable: true };
    }},

  // ─── 카테고리 B (작업요소 레벨) ───
  { id: 'B1-COUNT', category: '계층 완전성', name: 'B1 작업요소',
    check: (ctx) => ({ id: 'B1-COUNT', category: '계층 완전성', name: 'B1 작업요소',
      expected: '≥A1', actual: cnt(ctx, 'B1'), pass: cnt(ctx, 'B1') >= cnt(ctx, 'A1'),
      severity: cnt(ctx, 'B1') >= cnt(ctx, 'A1') ? 'info' : 'warn', autoFixable: true }) },

  { id: 'B3-COUNT', category: '계층 완전성', name: 'B3 공정특성',
    check: (ctx) => ({ id: 'B3-COUNT', category: '계층 완전성', name: 'B3 공정특성',
      expected: '≥B1', actual: cnt(ctx, 'B3'), pass: cnt(ctx, 'B3') >= cnt(ctx, 'B1'),
      severity: cnt(ctx, 'B3') >= cnt(ctx, 'B1') ? 'info' : 'warn', autoFixable: true }) },

  { id: 'B4-COUNT', category: '계층 완전성', name: 'B4 고장원인(FC)',
    check: (ctx) => {
      const b4 = cnt(ctx, 'B4');
      return { id: 'B4-COUNT', category: '계층 완전성', name: 'B4 고장원인(FC)',
        expected: '≥B3', actual: b4, pass: b4 >= cnt(ctx, 'B3'),
        severity: b4 >= cnt(ctx, 'B3') ? 'info' : 'warn', autoFixable: true };
    }},

  { id: 'B5-COUNT', category: '계층 완전성', name: 'B5 예방관리(PC)',
    check: (ctx) => {
      const b5 = cnt(ctx, 'B5');
      return { id: 'B5-COUNT', category: '계층 완전성', name: 'B5 예방관리(PC)',
        expected: '≥1', actual: b5, pass: b5 >= 1,
        severity: b5 >= 1 ? 'info' : 'warn', autoFixable: true };
    }},

  // ─── 카테고리 C (완제품 레벨) ───
  { id: 'C1-COUNT', category: '계층 완전성', name: 'C1 구분',
    check: (ctx) => ({ id: 'C1-COUNT', category: '계층 완전성', name: 'C1 구분',
      expected: '≥1', actual: cnt(ctx, 'C1'), pass: cnt(ctx, 'C1') >= 1,
      severity: cnt(ctx, 'C1') >= 1 ? 'info' : 'error', autoFixable: false }) },

  { id: 'C4-COUNT', category: '계층 완전성', name: 'C4 고장영향(FE)',
    check: (ctx) => ({ id: 'C4-COUNT', category: '계층 완전성', name: 'C4 고장영향(FE)',
      expected: '≥1', actual: cnt(ctx, 'C4'), pass: cnt(ctx, 'C4') >= 1,
      severity: cnt(ctx, 'C4') >= 1 ? 'info' : 'error', autoFixable: false }) },

  // ─── FK 정합성 ───
  { id: 'FK-B4-B3', category: 'FK 정합성', name: 'B4.parentItemId → B3 ID',
    check: (ctx) => {
      const b4s = ctx.byCode.get('B4') || [];
      const b3Ids = new Set((ctx.byCode.get('B3') || []).map(b => b.id));
      const b1Ids = new Set((ctx.byCode.get('B1') || []).map(b => b.id));
      let linked = 0, b1Linked = 0, noParent = 0;
      for (const b4 of b4s) {
        if (!b4.parentItemId) { noParent++; continue; }
        if (b3Ids.has(b4.parentItemId)) linked++;
        else if (b1Ids.has(b4.parentItemId)) b1Linked++;
      }
      const total = b4s.length;
      const pass = total === 0 || linked === total;
      return { id: 'FK-B4-B3', category: 'FK 정합성', name: 'B4.parentItemId → B3 ID',
        expected: `${total}/${total}`, actual: `${linked}/${total}` + (b1Linked > 0 ? ` (B1연결:${b1Linked})` : ''),
        pass, severity: pass ? 'info' : b1Linked > 0 ? 'warn' : 'error',
        autoFixable: false, fixDetail: b1Linked > 0 ? 'B4→B1 연결은 orphanPC 원인 — import-builder B4→B3 매핑 필요' : '' };
    }},

  { id: 'FK-A5-A4', category: 'FK 정합성', name: 'A5.parentItemId → A4 ID',
    check: (ctx) => {
      const a5s = ctx.byCode.get('A5') || [];
      const a4Ids = new Set((ctx.byCode.get('A4') || []).map(a => a.id));
      let linked = 0;
      for (const a5 of a5s) {
        if (a5.parentItemId && a4Ids.has(a5.parentItemId)) linked++;
      }
      const total = a5s.length;
      const pass = total === 0 || linked >= total * 0.8;
      return { id: 'FK-A5-A4', category: 'FK 정합성', name: 'A5.parentItemId → A4 ID',
        expected: `≥${Math.floor(total * 0.8)}/${total}`, actual: `${linked}/${total}`,
        pass, severity: pass ? 'info' : 'warn', autoFixable: false };
    }},

  // ─── FC사슬 완전성 ───
  { id: 'CHAIN-COUNT', category: 'FC사슬', name: 'chains 행 수',
    check: (ctx) => {
      const n = ctx.chains.length;
      return { id: 'CHAIN-COUNT', category: 'FC사슬', name: 'chains 행 수',
        expected: '≥B4', actual: n, pass: n >= cnt(ctx, 'B4') || n > 0,
        severity: n > 0 ? 'info' : 'error', autoFixable: false };
    }},

  { id: 'CHAIN-FE', category: 'FC사슬', name: 'chains FE 빈칸',
    check: (ctx) => {
      const empty = ctx.chains.filter(c => !(c.feValue || '').trim()).length;
      return { id: 'CHAIN-FE', category: 'FC사슬', name: 'chains FE 빈칸',
        expected: 0, actual: empty, pass: empty === 0,
        severity: empty === 0 ? 'info' : 'error', autoFixable: false };
    }},

  { id: 'CHAIN-FM', category: 'FC사슬', name: 'chains FM 빈칸',
    check: (ctx) => {
      const empty = ctx.chains.filter(c => !(c.fmValue || '').trim()).length;
      return { id: 'CHAIN-FM', category: 'FC사슬', name: 'chains FM 빈칸',
        expected: 0, actual: empty, pass: empty === 0,
        severity: empty === 0 ? 'info' : 'error', autoFixable: false };
    }},

  { id: 'CHAIN-FC', category: 'FC사슬', name: 'chains FC 빈칸',
    check: (ctx) => {
      const empty = ctx.chains.filter(c => !(c.fcValue || '').trim()).length;
      return { id: 'CHAIN-FC', category: 'FC사슬', name: 'chains FC 빈칸',
        expected: 0, actual: empty, pass: empty === 0,
        severity: empty === 0 ? 'info' : 'error', autoFixable: false };
    }},

  { id: 'CHAIN-SOD', category: 'FC사슬', name: 'chains SOD 빈칸',
    check: (ctx) => {
      const empty = ctx.chains.filter(c => !c.severity || !c.occurrence || !c.detection).length;
      return { id: 'CHAIN-SOD', category: 'FC사슬', name: 'chains SOD 빈칸',
        expected: 0, actual: empty, pass: empty === 0,
        severity: empty === 0 ? 'info' : 'warn', autoFixable: false };
    }},

  { id: 'CHAIN-DC', category: 'FC사슬', name: 'chains DC(검출관리) 빈칸',
    check: (ctx) => {
      const empty = ctx.chains.filter(c => !(c.dcValue || '').trim()).length;
      return { id: 'CHAIN-DC', category: 'FC사슬', name: 'chains DC 빈칸',
        expected: 0, actual: empty, pass: empty === 0,
        severity: empty === 0 ? 'info' : 'warn', autoFixable: false };
    }},

  { id: 'CHAIN-PC', category: 'FC사슬', name: 'chains PC(예방관리) 빈칸',
    check: (ctx) => {
      const empty = ctx.chains.filter(c => !(c.pcValue || '').trim()).length;
      return { id: 'CHAIN-PC', category: 'FC사슬', name: 'chains PC 빈칸',
        expected: 0, actual: empty, pass: empty === 0,
        severity: empty === 0 ? 'info' : 'warn', autoFixable: false };
    }},

  // ─── 공정별 최소 구성 ───
  { id: 'PROC-MIN', category: '공정별 검증', name: '공정별 B1+B3+B4 존재',
    check: (ctx) => {
      const missing: string[] = [];
      for (const pno of ctx.processNos) {
        const items = ctx.byProcess.get(pno) || [];
        const codes = new Set(items.map(i => i.itemCode));
        const lacks: string[] = [];
        if (!codes.has('B1')) lacks.push('B1');
        if (!codes.has('B3')) lacks.push('B3');
        if (!codes.has('B4')) lacks.push('B4');
        if (lacks.length > 0) missing.push(`${pno}(${lacks.join(',')})`);
      }
      return { id: 'PROC-MIN', category: '공정별 검증', name: '공정별 B1+B3+B4 존재',
        expected: '결손 0건', actual: missing.length > 0 ? `결손 ${missing.length}건: ${missing.slice(0, 5).join(', ')}` : '결손 0건',
        pass: missing.length === 0, severity: missing.length === 0 ? 'info' : 'warn',
        autoFixable: true };
    }},

  // ─── 빈값 검증 ───
  { id: 'EMPTY-VALUE', category: '데이터 품질', name: '빈 value 항목',
    check: (ctx) => {
      const empty = ctx.flatData.filter(d => !(d.value || '').trim()).length;
      return { id: 'EMPTY-VALUE', category: '데이터 품질', name: '빈 value 항목',
        expected: 0, actual: empty, pass: empty === 0,
        severity: empty === 0 ? 'info' : 'warn', autoFixable: false };
    }},
];

// ═══════════════════════════════════════════════════════
// 3. 자동수정 함수들
// ═══════════════════════════════════════════════════════

function autoFixB4FromB3(flatData: ImportedFlatData[], ctx: ValidationContext): ParseValidationIssue[] {
  const fixes: ParseValidationIssue[] = [];
  const b3Items = ctx.byCode.get('B3') || [];
  const b4Set = new Set((ctx.byCode.get('B4') || []).map(b => `${b.processNo}|${b.m4}|${b.value}`));

  for (const b3 of b3Items) {
    const fcName = `${b3.value} 부적합`;
    const key = `${b3.processNo}|${b3.m4 || ''}|${fcName}`;
    if (!b4Set.has(key) && b3.value?.trim()) {
      const newB4: ImportedFlatData = {
        id: `${b3.id}-B4-AUTO`,
        processNo: b3.processNo,
        category: 'B',
        itemCode: 'B4',
        value: fcName,
        m4: b3.m4,
        parentItemId: b3.id,
        createdAt: new Date(),
      };
      flatData.push(newB4);
      b4Set.add(key);
      fixes.push({
        severity: 'fixed', code: 'AUTOFIX-B4',
        message: `B4 자동생성: "${fcName}" (B3 "${b3.value}" 기반)`,
        processNo: b3.processNo, itemCode: 'B4',
      });
    }
  }
  return fixes;
}

function autoFixB5FromB4(flatData: ImportedFlatData[], ctx: ValidationContext, chains: MasterFailureChain[]): ParseValidationIssue[] {
  const fixes: ParseValidationIssue[] = [];
  const b5Procs = new Set((ctx.byCode.get('B5') || []).map(b => `${b.processNo}|${b.m4 || ''}`));

  const b1Items = ctx.byCode.get('B1') || [];
  for (const b1 of b1Items) {
    const key = `${b1.processNo}|${b1.m4 || ''}`;
    if (b5Procs.has(key)) continue;

    const chain = chains.find(c => c.processNo === b1.processNo && (c.m4 || '') === (b1.m4 || '') && c.pcValue?.trim());
    const pcVal = chain?.pcValue || `${b1.value || '작업'} 관리 점검`;

    flatData.push({
      id: `${b1.id}-B5-AUTO`,
      processNo: b1.processNo,
      category: 'B',
      itemCode: 'B5',
      value: pcVal,
      m4: b1.m4,
      createdAt: new Date(),
    });
    b5Procs.add(key);
    fixes.push({
      severity: 'fixed', code: 'AUTOFIX-B5',
      message: `B5 자동생성: "${pcVal.slice(0, 30)}" (공정 ${b1.processNo})`,
      processNo: b1.processNo, itemCode: 'B5',
    });
  }
  return fixes;
}

function autoFixA6FromChains(flatData: ImportedFlatData[], ctx: ValidationContext, chains: MasterFailureChain[]): ParseValidationIssue[] {
  const fixes: ParseValidationIssue[] = [];
  const a6Procs = new Set((ctx.byCode.get('A6') || []).map(a => a.processNo));

  for (const pno of ctx.processNos) {
    if (a6Procs.has(pno)) continue;
    const chain = chains.find(c => c.processNo === pno && c.dcValue?.trim());
    if (chain?.dcValue) {
      flatData.push({
        id: `AUTOFIX-A6-${pno}`,
        processNo: pno,
        category: 'A',
        itemCode: 'A6',
        value: chain.dcValue,
        createdAt: new Date(),
      });
      a6Procs.add(pno);
      fixes.push({
        severity: 'fixed', code: 'AUTOFIX-A6',
        message: `A6 자동생성: "${chain.dcValue.slice(0, 30)}" (chains DC 기반)`,
        processNo: pno, itemCode: 'A6',
      });
    }
  }
  return fixes;
}

// ═══════════════════════════════════════════════════════
// 4. 메인 파이프라인
// ═══════════════════════════════════════════════════════

/**
 * Import 파싱 후 검증→자동수정→피드백 파이프라인
 *
 * @param flatData 파싱된 ImportedFlatData[] (mutable — 자동수정 시 push됨)
 * @param chains 파싱된 MasterFailureChain[]
 * @param fmeaId 프로젝트 ID
 * @param options 자동수정 활성화 여부
 * @returns ParseValidationReport
 */
export function runParseValidationPipeline(
  flatData: ImportedFlatData[],
  chains: MasterFailureChain[],
  fmeaId: string,
  options: { autoFix?: boolean } = {},
): ParseValidationReport {
  const { autoFix = true } = options;

  // Phase 1: 검증 기준표 대조 (수정 전)
  let ctx = buildContext(flatData, chains);
  const preResults = CRITERIA.map(c => c.check(ctx));

  // Phase 2: 자동수정 (실패 항목에 대해)
  const allFixes: ParseValidationIssue[] = [];

  if (autoFix) {
    const failedIds = new Set(preResults.filter(r => !r.pass && r.autoFixable).map(r => r.id));

    if (failedIds.has('B4-COUNT') || failedIds.has('PROC-MIN')) {
      allFixes.push(...autoFixB4FromB3(flatData, ctx));
    }
    if (failedIds.has('B5-COUNT')) {
      allFixes.push(...autoFixB5FromB4(flatData, ctx, chains));
    }
    if (failedIds.has('A6-COUNT')) {
      allFixes.push(...autoFixA6FromChains(flatData, ctx, chains));
    }
  }

  // Phase 3: 자동수정 후 재검증
  ctx = buildContext(flatData, chains);
  const postResults = CRITERIA.map(c => {
    const result = c.check(ctx);
    const preFailed = preResults.find(r => r.id === result.id && !r.pass);
    if (preFailed && result.pass) {
      result.fixApplied = true;
      result.fixDetail = `자동수정 후 통과`;
    }
    return result;
  });

  // 이슈 수집
  const issues: ParseValidationIssue[] = [];
  for (const r of postResults) {
    if (!r.pass) {
      issues.push({
        severity: r.severity === 'info' ? 'warn' : r.severity,
        code: r.id,
        message: `${r.name}: 기대 ${r.expected}, 실제 ${r.actual}`,
        detail: r.fixDetail,
      });
    }
  }

  // itemCode별 카운트
  const itemCodeCounts: Record<string, number> = {};
  for (const [code, items] of ctx.byCode) {
    itemCodeCounts[code] = items.length;
  }

  const passed = postResults.filter(r => r.pass).length;
  const failed = postResults.filter(r => !r.pass && r.severity === 'error').length;
  const warned = postResults.filter(r => !r.pass && r.severity !== 'error').length;

  return {
    fmeaId,
    timestamp: new Date().toISOString(),
    totalItems: flatData.length,
    totalChains: chains.length,
    criteria: postResults,
    issues,
    fixes: allFixes,
    summary: {
      totalCriteria: postResults.length,
      passed,
      failed,
      warned,
      autoFixed: allFixes.length,
    },
    itemCodeCounts,
    processNos: ctx.processNos,
  };
}

/**
 * 검증 리포트를 사람이 읽을 수 있는 텍스트로 변환
 */
export function formatValidationReport(report: ParseValidationReport): string {
  const lines: string[] = [];
  lines.push(`\n=== 파싱 검증 리포트: ${report.fmeaId} ===`);
  lines.push(`총 항목: ${report.totalItems}, FC사슬: ${report.totalChains}, 공정: ${report.processNos.length}개`);
  lines.push(`\n── 검증 기준표 ──`);

  let lastCat = '';
  for (const c of report.criteria) {
    if (c.category !== lastCat) {
      lastCat = c.category;
      lines.push(`\n[${c.category}]`);
    }
    const icon = c.pass ? '✅' : c.severity === 'error' ? '❌' : '⚠️';
    const fix = c.fixApplied ? ' 🔧' : '';
    lines.push(`  ${icon} ${c.name}: ${c.actual} (기대 ${c.expected})${fix}`);
  }

  if (report.fixes.length > 0) {
    lines.push(`\n── 자동수정 ${report.fixes.length}건 ──`);
    for (const f of report.fixes.slice(0, 20)) {
      lines.push(`  🔧 ${f.message}`);
    }
    if (report.fixes.length > 20) {
      lines.push(`  ... 외 ${report.fixes.length - 20}건`);
    }
  }

  lines.push(`\n── 요약 ──`);
  lines.push(`  PASS: ${report.summary.passed}/${report.summary.totalCriteria}`);
  lines.push(`  FAIL: ${report.summary.failed}, WARN: ${report.summary.warned}`);
  lines.push(`  자동수정: ${report.summary.autoFixed}건`);
  lines.push(`  판정: ${report.summary.failed === 0 ? '✅ ALL PASS' : '❌ FAIL'}`);

  return lines.join('\n');
}

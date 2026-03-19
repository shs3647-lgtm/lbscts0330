/**
 * @file parsing-criteria-validator.ts
 * @description 파싱 검증 기준표 + 자동수정 + 피드백 시스템
 *
 * Import Excel → 파싱 완료 후 실행:
 *   1. 기준표 기반 검증 (A1~C4 + FC사슬 + 교차검증)
 *   2. 자동수정 (안전한 항목만)
 *   3. 피드백 리포트 (수정 내역 + 수동 필요 항목)
 *
 * 비유: "출하 전 최종검사 스테이션" — 제품(flatData)을 기준표와 대조하고,
 *       자동교정 가능한 것은 교정, 불가능한 것은 피드백 보고서 발급
 *
 * @created 2026-03-19
 */

import type { ImportedFlatData } from '../types';

// ──────────────────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────────────────

export interface CriteriaRule {
  id: string;
  category: 'count' | 'relation' | 'chain' | 'cross' | 'format';
  name: string;
  check: (ctx: ValidationContext) => CriteriaResult;
  autoFix?: (ctx: ValidationContext) => AutoFixResult;
}

export interface CriteriaResult {
  ruleId: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  actual: number | string;
  expected: number | string;
  message: string;
}

export interface AutoFixResult {
  ruleId: string;
  fixedCount: number;
  description: string;
  addedItems: ImportedFlatData[];
}

export interface MasterChainLike {
  processNo?: string;
  m4?: string;
  workElement?: string;
  fmValue?: string;
  fcValue?: string;
  feValue?: string;
  feScope?: string;
  pcValue?: string;
  dcValue?: string;
  severity?: number;
  occurrence?: number;
  detection?: number;
  processChar?: string;
  l3Function?: string;
}

export interface ValidationContext {
  flatData: ImportedFlatData[];
  chains: MasterChainLike[];
  byCode: Map<string, ImportedFlatData[]>;
  byProcCode: Map<string, ImportedFlatData[]>; // `pno|code` → items
  procNos: string[];
}

export interface ParseValidationReport {
  timestamp: string;
  totalItems: number;
  totalChains: number;
  criteriaResults: CriteriaResult[];
  autoFixes: AutoFixResult[];
  passCount: number;
  warnCount: number;
  failCount: number;
  fixedCount: number;
  allPass: boolean;
  summary: string;
}

// ──────────────────────────────────────────────────────────
// 헬퍼
// ──────────────────────────────────────────────────────────

function buildContext(flatData: ImportedFlatData[], chains: MasterChainLike[]): ValidationContext {
  const byCode = new Map<string, ImportedFlatData[]>();
  const byProcCode = new Map<string, ImportedFlatData[]>();

  for (const item of flatData) {
    const code = item.itemCode;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(item);

    const pk = `${item.processNo}|${code}`;
    if (!byProcCode.has(pk)) byProcCode.set(pk, []);
    byProcCode.get(pk)!.push(item);
  }

  const procNos = [...new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo))];
  return { flatData, chains, byCode, byProcCode, procNos };
}

function itemsOf(ctx: ValidationContext, code: string): ImportedFlatData[] {
  return ctx.byCode.get(code) || [];
}

function procItems(ctx: ValidationContext, pno: string, code: string): ImportedFlatData[] {
  return ctx.byProcCode.get(`${pno}|${code}`) || [];
}

let idCounter = 0;
function genId(prefix: string): string {
  return `AUTOFIX-${prefix}-${Date.now()}-${++idCounter}`;
}

function now(): Date {
  return new Date();
}

// ──────────────────────────────────────────────────────────
// 기준표 정의 (30개 규칙)
// ──────────────────────────────────────────────────────────

const CRITERIA_RULES: CriteriaRule[] = [

  // ═══ 1. 카운트 검증 (필수 항목 존재) ═══

  {
    id: 'CNT-A1',
    category: 'count',
    name: 'A1(공정번호) 존재',
    check: (ctx) => {
      const cnt = itemsOf(ctx, 'A1').length;
      return { ruleId: 'CNT-A1', status: cnt > 0 ? 'PASS' : 'FAIL', actual: cnt, expected: '≥1', message: `A1 공정번호 ${cnt}건` };
    },
  },
  {
    id: 'CNT-A5',
    category: 'count',
    name: 'A5(고장형태) 존재',
    check: (ctx) => {
      const cnt = itemsOf(ctx, 'A5').length;
      return { ruleId: 'CNT-A5', status: cnt > 0 ? 'PASS' : 'FAIL', actual: cnt, expected: '≥1', message: `A5 고장형태 ${cnt}건` };
    },
  },
  {
    id: 'CNT-B1',
    category: 'count',
    name: 'B1(작업요소) 존재',
    check: (ctx) => {
      const cnt = itemsOf(ctx, 'B1').length;
      return { ruleId: 'CNT-B1', status: cnt > 0 ? 'PASS' : 'FAIL', actual: cnt, expected: '≥1', message: `B1 작업요소 ${cnt}건` };
    },
  },
  {
    id: 'CNT-B3',
    category: 'count',
    name: 'B3(공정특성) 존재',
    check: (ctx) => {
      const cnt = itemsOf(ctx, 'B3').length;
      return { ruleId: 'CNT-B3', status: cnt > 0 ? 'PASS' : 'FAIL', actual: cnt, expected: '≥1', message: `B3 공정특성 ${cnt}건` };
    },
  },
  {
    id: 'CNT-B4',
    category: 'count',
    name: 'B4(고장원인) 존재',
    check: (ctx) => {
      const cnt = itemsOf(ctx, 'B4').length;
      return { ruleId: 'CNT-B4', status: cnt > 0 ? 'PASS' : 'FAIL', actual: cnt, expected: '≥1', message: `B4 고장원인 ${cnt}건` };
    },
  },
  {
    id: 'CNT-C4',
    category: 'count',
    name: 'C4(고장영향) 존재',
    check: (ctx) => {
      const cnt = itemsOf(ctx, 'C4').length;
      return { ruleId: 'CNT-C4', status: cnt > 0 ? 'PASS' : 'FAIL', actual: cnt, expected: '≥1', message: `C4 고장영향 ${cnt}건` };
    },
  },
  {
    id: 'CNT-FC',
    category: 'count',
    name: 'FC사슬 존재',
    check: (ctx) => {
      const cnt = ctx.chains.length;
      return { ruleId: 'CNT-FC', status: cnt > 0 ? 'PASS' : 'FAIL', actual: cnt, expected: '≥1', message: `FC 고장사슬 ${cnt}건` };
    },
  },

  // ═══ 2. 공정별 계층 관계 검증 ═══

  {
    id: 'REL-A2-PER-A1',
    category: 'relation',
    name: '모든 A1에 A2(공정명) 존재',
    check: (ctx) => {
      const missing = ctx.procNos.filter(p => procItems(ctx, p, 'A2').length === 0);
      return {
        ruleId: 'REL-A2-PER-A1', status: missing.length === 0 ? 'PASS' : 'WARN',
        actual: ctx.procNos.length - missing.length, expected: ctx.procNos.length,
        message: missing.length === 0 ? 'A2 전수 존재' : `A2 누락 공정: ${missing.slice(0, 5).join(',')}`,
      };
    },
  },
  {
    id: 'REL-B1-PER-A1',
    category: 'relation',
    name: '모든 공정에 B1(작업요소) 존재',
    check: (ctx) => {
      const missing = ctx.procNos.filter(p => procItems(ctx, p, 'B1').length === 0);
      return {
        ruleId: 'REL-B1-PER-A1', status: missing.length === 0 ? 'PASS' : 'WARN',
        actual: ctx.procNos.length - missing.length, expected: ctx.procNos.length,
        message: missing.length === 0 ? 'B1 전수 존재' : `B1 누락 공정: ${missing.slice(0, 5).join(',')}`,
      };
    },
  },
  {
    id: 'REL-B3-GE-B4',
    category: 'relation',
    name: 'B3(공정특성) ≥ B4(고장원인) per 공정+m4',
    check: (ctx) => {
      let violations = 0;
      const details: string[] = [];
      for (const pno of ctx.procNos) {
        const b3 = procItems(ctx, pno, 'B3');
        const b4 = procItems(ctx, pno, 'B4');
        const m4s = new Set([...b3.map(i => i.m4 || ''), ...b4.map(i => i.m4 || '')]);
        for (const m4 of m4s) {
          const b3c = b3.filter(i => (i.m4 || '') === m4).length;
          const b4c = b4.filter(i => (i.m4 || '') === m4).length;
          if (b4c > 0 && b3c < b4c) {
            violations++;
            if (details.length < 3) details.push(`${pno}/${m4}: B3=${b3c}<B4=${b4c}`);
          }
        }
      }
      return {
        ruleId: 'REL-B3-GE-B4', status: violations === 0 ? 'PASS' : 'WARN',
        actual: violations, expected: 0,
        message: violations === 0 ? 'B3≥B4 충족' : `B3<B4 위반 ${violations}건 (${details.join(', ')})`,
      };
    },
    autoFix: (ctx) => {
      const added: ImportedFlatData[] = [];
      for (const pno of ctx.procNos) {
        const b3 = procItems(ctx, pno, 'B3');
        const b4 = procItems(ctx, pno, 'B4');
        // m4가 ''인 경우도 포함 (filter(Boolean) 제거)
        const m4s = new Set(b4.map(i => i.m4 || ''));
        for (const m4 of m4s) {
          const b3m4 = b3.filter(i => (i.m4 || '') === m4);
          const b4m4 = b4.filter(i => (i.m4 || '') === m4);
          if (b4m4.length > b3m4.length) {
            // B3 value 기준으로 이미 존재하는 것은 스킵
            const existingB3Values = new Set(b3m4.map(i => (i.value || '').trim()));
            for (let i = 0; i < b4m4.length; i++) {
              const fcVal = b4m4[i].value || '';
              const pcName = (fcVal.replace(/\s*부적합$/, '') || fcVal).trim();
              const pcFull = pcName + ' 관리 특성';
              if (existingB3Values.has(pcName) || existingB3Values.has(pcFull)) continue;
              existingB3Values.add(pcFull);
              added.push({
                id: genId('B3'),
                processNo: pno,
                category: 'B' as const,
                itemCode: 'B3',
                value: pcFull,
                m4,
                belongsTo: b4m4[i].belongsTo,
                parentItemId: b4m4[i].parentItemId,
                createdAt: now(),
              });
            }
          }
        }
      }
      if (added.length > 0) ctx.flatData.push(...added);
      return { ruleId: 'REL-B3-GE-B4', fixedCount: added.length, description: `B3 자동보충 ${added.length}건 (B4 기반)`, addedItems: added };
    },
  },

  // ═══ 3. B4→B3 parentItemId FK 검증 (orphanPC 근본원인) ═══

  {
    id: 'REL-B4-PARENT-B3',
    category: 'relation',
    name: 'B4.parentItemId → B3 ID 매핑',
    check: (ctx) => {
      const b3Ids = new Set(itemsOf(ctx, 'B3').map(i => i.id));
      const b4s = itemsOf(ctx, 'B4');
      const linked = b4s.filter(b => b.parentItemId && b3Ids.has(b.parentItemId)).length;
      const unlinked = b4s.length - linked;
      return {
        ruleId: 'REL-B4-PARENT-B3', status: unlinked === 0 ? 'PASS' : 'WARN',
        actual: linked, expected: b4s.length,
        message: unlinked === 0 ? `B4→B3 FK ${linked}건 전수 매핑` : `B4→B3 미연결 ${unlinked}건 (순차폴백 → orphanPC 가능)`,
      };
    },
  },

  // ═══ 4. FC사슬 완전성 검증 ═══

  {
    id: 'CHAIN-FM-EXIST',
    category: 'chain',
    name: 'FC사슬 FM 전수 존재',
    check: (ctx) => {
      const empty = ctx.chains.filter(c => !(c.fmValue || '').trim()).length;
      return {
        ruleId: 'CHAIN-FM-EXIST', status: empty === 0 ? 'PASS' : 'FAIL',
        actual: empty, expected: 0, message: empty === 0 ? 'FM 전수 존재' : `FM 빈칸 ${empty}건`,
      };
    },
  },
  {
    id: 'CHAIN-FC-EXIST',
    category: 'chain',
    name: 'FC사슬 FC 전수 존재',
    check: (ctx) => {
      const empty = ctx.chains.filter(c => !(c.fcValue || '').trim()).length;
      return {
        ruleId: 'CHAIN-FC-EXIST', status: empty === 0 ? 'PASS' : 'FAIL',
        actual: empty, expected: 0, message: empty === 0 ? 'FC 전수 존재' : `FC 빈칸 ${empty}건`,
      };
    },
  },
  {
    id: 'CHAIN-FE-EXIST',
    category: 'chain',
    name: 'FC사슬 FE 전수 존재',
    check: (ctx) => {
      const empty = ctx.chains.filter(c => !(c.feValue || '').trim()).length;
      return {
        ruleId: 'CHAIN-FE-EXIST', status: empty === 0 ? 'PASS' : 'FAIL',
        actual: empty, expected: 0, message: empty === 0 ? 'FE 전수 존재' : `FE 빈칸 ${empty}건`,
      };
    },
  },
  {
    id: 'CHAIN-SOD-EXIST',
    category: 'chain',
    name: 'FC사슬 S/O/D 전수 존재',
    check: (ctx) => {
      const sEmpty = ctx.chains.filter(c => !c.severity || c.severity <= 0).length;
      const oEmpty = ctx.chains.filter(c => !c.occurrence || c.occurrence <= 0).length;
      const dEmpty = ctx.chains.filter(c => !c.detection || c.detection <= 0).length;
      const total = sEmpty + oEmpty + dEmpty;
      return {
        ruleId: 'CHAIN-SOD-EXIST',
        status: total === 0 ? 'PASS' : sEmpty > 0 ? 'FAIL' : 'WARN',
        actual: total, expected: 0,
        message: total === 0 ? 'SOD 전수 존재' : `S빈=${sEmpty}, O빈=${oEmpty}, D빈=${dEmpty}`,
      };
    },
  },
  {
    id: 'CHAIN-PC-EXIST',
    category: 'chain',
    name: 'FC사슬 PC(예방관리) 존재',
    check: (ctx) => {
      const empty = ctx.chains.filter(c => !(c.pcValue || '').trim()).length;
      const rate = ctx.chains.length > 0 ? Math.round((1 - empty / ctx.chains.length) * 100) : 0;
      return {
        ruleId: 'CHAIN-PC-EXIST', status: empty === 0 ? 'PASS' : rate >= 80 ? 'WARN' : 'FAIL',
        actual: `${rate}%`, expected: '100%', message: `PC 커버리지 ${rate}% (빈칸 ${empty}건)`,
      };
    },
  },
  {
    id: 'CHAIN-DC-EXIST',
    category: 'chain',
    name: 'FC사슬 DC(검출관리) 존재',
    check: (ctx) => {
      const empty = ctx.chains.filter(c => !(c.dcValue || '').trim()).length;
      const rate = ctx.chains.length > 0 ? Math.round((1 - empty / ctx.chains.length) * 100) : 0;
      return {
        ruleId: 'CHAIN-DC-EXIST', status: empty === 0 ? 'PASS' : rate >= 80 ? 'WARN' : 'FAIL',
        actual: `${rate}%`, expected: '100%', message: `DC 커버리지 ${rate}% (빈칸 ${empty}건)`,
      };
    },
  },

  // ═══ 5. 교차검증 (flatData ↔ FC사슬 일치) ═══

  {
    id: 'CROSS-FE-C4',
    category: 'cross',
    name: 'C4(고장영향) ↔ FC사슬 FE 일치',
    check: (ctx) => {
      const c4Set = new Set(itemsOf(ctx, 'C4').map(i => (i.value || '').trim()).filter(Boolean));
      const chainFeSet = new Set(ctx.chains.map(c => (c.feValue || '').trim()).filter(Boolean));
      const onlyC4 = [...c4Set].filter(v => !chainFeSet.has(v));
      const onlyChain = [...chainFeSet].filter(v => !c4Set.has(v));
      const ok = onlyC4.length === 0 && onlyChain.length === 0;
      return {
        ruleId: 'CROSS-FE-C4', status: ok ? 'PASS' : 'WARN',
        actual: `C4=${c4Set.size}, Chain=${chainFeSet.size}`, expected: '일치',
        message: ok ? `FE ${c4Set.size}건 완전 일치` : `C4에만 ${onlyC4.length}건, Chain에만 ${onlyChain.length}건`,
      };
    },
  },
  {
    id: 'CROSS-FM-A5',
    category: 'cross',
    name: 'A5(고장형태) ↔ FC사슬 FM 일치',
    check: (ctx) => {
      const a5Set = new Set(itemsOf(ctx, 'A5').map(i => (i.value || '').trim()).filter(Boolean));
      const chainFmSet = new Set(ctx.chains.map(c => (c.fmValue || '').trim()).filter(Boolean));
      const onlyA5 = [...a5Set].filter(v => !chainFmSet.has(v));
      const onlyChain = [...chainFmSet].filter(v => !a5Set.has(v));
      const ok = onlyA5.length === 0 && onlyChain.length === 0;
      return {
        ruleId: 'CROSS-FM-A5', status: ok ? 'PASS' : 'WARN',
        actual: `A5=${a5Set.size}, Chain=${chainFmSet.size}`, expected: '일치',
        message: ok ? `FM ${a5Set.size}건 완전 일치` : `A5에만 ${onlyA5.length}건, Chain에만 ${onlyChain.length}건`,
      };
    },
  },
  {
    id: 'CROSS-FC-B4',
    category: 'cross',
    name: 'B4(고장원인) ↔ FC사슬 FC 일치',
    check: (ctx) => {
      const b4Set = new Set(itemsOf(ctx, 'B4').map(i => (i.value || '').trim()).filter(Boolean));
      const chainFcSet = new Set(ctx.chains.map(c => (c.fcValue || '').trim()).filter(Boolean));
      const onlyB4 = [...b4Set].filter(v => !chainFcSet.has(v));
      const onlyChain = [...chainFcSet].filter(v => !b4Set.has(v));
      const ok = onlyB4.length === 0 && onlyChain.length === 0;
      return {
        ruleId: 'CROSS-FC-B4', status: ok ? 'PASS' : 'WARN',
        actual: `B4=${b4Set.size}, Chain=${chainFcSet.size}`, expected: '일치',
        message: ok ? `FC ${b4Set.size}건 완전 일치` : `B4에만 ${onlyB4.length}건, Chain에만 ${onlyChain.length}건`,
      };
    },
    autoFix: (ctx) => {
      const b4Set = new Set(itemsOf(ctx, 'B4').map(i => (i.value || '').trim()));
      const added: ImportedFlatData[] = [];
      for (const ch of ctx.chains) {
        const fc = (ch.fcValue || '').trim();
        if (fc && !b4Set.has(fc)) {
          const pno = ch.processNo || '';
          const m4 = ch.m4 || '';
          const b1Items = itemsOf(ctx, 'B1').filter(b => b.processNo === pno && (b.m4 || '') === m4);
          const b3Items = itemsOf(ctx, 'B3').filter(b => b.processNo === pno && (b.m4 || '') === m4);
          const parentId = b3Items[0]?.id || b1Items[0]?.id || '';
          added.push({
            id: genId('B4'),
            processNo: pno,
            category: 'B' as const,
            itemCode: 'B4',
            value: fc,
            m4,
            parentItemId: parentId,
            createdAt: now(),
          });
          b4Set.add(fc);
        }
      }
      if (added.length > 0) ctx.flatData.push(...added);
      return { ruleId: 'CROSS-FC-B4', fixedCount: added.length, description: `FC사슬 기반 B4 보충 ${added.length}건`, addedItems: added };
    },
  },

  // ═══ 6. A6/B5 보충 검증 + 자동수정 ═══

  {
    id: 'CNT-A6',
    category: 'count',
    name: 'A6(검출관리) 존재',
    check: (ctx) => {
      const cnt = itemsOf(ctx, 'A6').length;
      return {
        ruleId: 'CNT-A6', status: cnt > 0 ? 'PASS' : 'WARN',
        actual: cnt, expected: '≥1', message: `A6 검출관리 ${cnt}건`,
      };
    },
    autoFix: (ctx) => {
      if (itemsOf(ctx, 'A6').length > 0) return { ruleId: 'CNT-A6', fixedCount: 0, description: 'A6 이미 존재', addedItems: [] };
      const added: ImportedFlatData[] = [];
      const dcByProc = new Map<string, string>();
      for (const ch of ctx.chains) {
        const dc = (ch.dcValue || '').trim();
        if (dc && ch.processNo && !dcByProc.has(ch.processNo)) {
          dcByProc.set(ch.processNo, dc);
        }
      }
      for (const [pno, dc] of dcByProc) {
        added.push({ id: genId('A6'), processNo: pno, category: 'A' as const, itemCode: 'A6', value: dc, createdAt: now() });
      }
      if (added.length > 0) ctx.flatData.push(...added);
      return { ruleId: 'CNT-A6', fixedCount: added.length, description: `FC사슬 DC → A6 보충 ${added.length}건`, addedItems: added };
    },
  },
  {
    id: 'CNT-B5',
    category: 'count',
    name: 'B5(예방관리) 존재',
    check: (ctx) => {
      const cnt = itemsOf(ctx, 'B5').length;
      return {
        ruleId: 'CNT-B5', status: cnt > 0 ? 'PASS' : 'WARN',
        actual: cnt, expected: '≥1', message: `B5 예방관리 ${cnt}건`,
      };
    },
    autoFix: (ctx) => {
      if (itemsOf(ctx, 'B5').length > 0) return { ruleId: 'CNT-B5', fixedCount: 0, description: 'B5 이미 존재', addedItems: [] };
      const added: ImportedFlatData[] = [];
      const pcByProcM4 = new Map<string, string>();
      for (const ch of ctx.chains) {
        const pc = (ch.pcValue || '').trim();
        const key = `${ch.processNo}|${ch.m4}`;
        if (pc && !pcByProcM4.has(key)) pcByProcM4.set(key, pc);
      }
      for (const [key, pc] of pcByProcM4) {
        const [pno, m4] = key.split('|');
        added.push({ id: genId('B5'), processNo: pno, category: 'B' as const, itemCode: 'B5', value: pc, m4, createdAt: now() });
      }
      if (added.length > 0) ctx.flatData.push(...added);
      return { ruleId: 'CNT-B5', fixedCount: added.length, description: `FC사슬 PC → B5 보충 ${added.length}건`, addedItems: added };
    },
  },

  // ═══ 7. 포맷 검증 ═══

  {
    id: 'FMT-EMPTY-VALUE',
    category: 'format',
    name: '빈 value 항목',
    check: (ctx) => {
      const empty = ctx.flatData.filter(d => !d.value || d.value.trim() === '').length;
      return {
        ruleId: 'FMT-EMPTY-VALUE', status: empty === 0 ? 'PASS' : 'WARN',
        actual: empty, expected: 0, message: empty === 0 ? '빈값 0건' : `빈 value ${empty}건`,
      };
    },
  },
  {
    id: 'FMT-OBJECT-CONTAMINATION',
    category: 'format',
    name: '[object Object] 오염',
    check: (ctx) => {
      const bad = ctx.flatData.filter(d => d.value && d.value.includes('[object Object]')).length;
      return {
        ruleId: 'FMT-OBJECT-CONTAMINATION', status: bad === 0 ? 'PASS' : 'FAIL',
        actual: bad, expected: 0, message: bad === 0 ? '오염 0건' : `[object Object] 오염 ${bad}건`,
      };
    },
    autoFix: (ctx) => {
      let fixed = 0;
      for (const item of ctx.flatData) {
        if (item.value && item.value.includes('[object Object]')) {
          item.value = item.value.replace(/\[object Object\]/g, '').trim() || '(데이터 오류)';
          fixed++;
        }
      }
      return { ruleId: 'FMT-OBJECT-CONTAMINATION', fixedCount: fixed, description: `[object Object] 제거 ${fixed}건`, addedItems: [] };
    },
  },
  {
    id: 'FMT-DUPLICATE-ID',
    category: 'format',
    name: 'ID 중복',
    check: (ctx) => {
      const idCount = new Map<string, number>();
      for (const d of ctx.flatData) {
        if (d.id) idCount.set(d.id, (idCount.get(d.id) || 0) + 1);
      }
      const dups = [...idCount.entries()].filter(([, c]) => c > 1).length;
      return {
        ruleId: 'FMT-DUPLICATE-ID', status: dups === 0 ? 'PASS' : 'WARN',
        actual: dups, expected: 0, message: dups === 0 ? 'ID 중복 0건' : `ID 중복 ${dups}건`,
      };
    },
  },

  // ═══ 8. A3/A4 보충 검증 + 자동수정 ═══

  {
    id: 'REL-A3-PER-A1',
    category: 'relation',
    name: '모든 공정에 A3(공정기능) 존재',
    check: (ctx) => {
      const missing = ctx.procNos.filter(p => procItems(ctx, p, 'A3').length === 0);
      return {
        ruleId: 'REL-A3-PER-A1', status: missing.length === 0 ? 'PASS' : 'WARN',
        actual: ctx.procNos.length - missing.length, expected: ctx.procNos.length,
        message: missing.length === 0 ? 'A3 전수 존재' : `A3 누락 공정 ${missing.length}건`,
      };
    },
    autoFix: (ctx) => {
      const added: ImportedFlatData[] = [];
      for (const pno of ctx.procNos) {
        if (procItems(ctx, pno, 'A3').length === 0) {
          const a2 = procItems(ctx, pno, 'A2')[0];
          const name = a2?.value || `공정 ${pno}`;
          added.push({
            id: genId('A3'), processNo: pno, category: 'A' as const, itemCode: 'A3',
            value: `${name} 공정 수행`, createdAt: now(),
          });
        }
      }
      if (added.length > 0) ctx.flatData.push(...added);
      return { ruleId: 'REL-A3-PER-A1', fixedCount: added.length, description: `A3 자동생성 ${added.length}건 (A2명 기반)`, addedItems: added };
    },
  },
  {
    id: 'REL-A4-PER-A1',
    category: 'relation',
    name: '모든 공정에 A4(제품특성) 존재',
    check: (ctx) => {
      const missing = ctx.procNos.filter(p => procItems(ctx, p, 'A4').length === 0);
      return {
        ruleId: 'REL-A4-PER-A1', status: missing.length === 0 ? 'PASS' : 'WARN',
        actual: ctx.procNos.length - missing.length, expected: ctx.procNos.length,
        message: missing.length === 0 ? 'A4 전수 존재' : `A4 누락 공정 ${missing.length}건`,
      };
    },
  },

  // ═══ 9. FC사슬 ↔ flatData 수량 교차검증 ═══

  {
    id: 'CROSS-CHAIN-VS-B4',
    category: 'cross',
    name: 'FC사슬 수 ≥ B4 수',
    check: (ctx) => {
      const chainCnt = ctx.chains.length;
      const b4Cnt = itemsOf(ctx, 'B4').length;
      return {
        ruleId: 'CROSS-CHAIN-VS-B4',
        status: chainCnt >= b4Cnt ? 'PASS' : 'WARN',
        actual: `chain=${chainCnt}, B4=${b4Cnt}`, expected: 'chain≥B4',
        message: chainCnt >= b4Cnt ? `FC사슬 ${chainCnt} ≥ B4 ${b4Cnt}` : `FC사슬 ${chainCnt} < B4 ${b4Cnt} (FC시트 불완전)`,
      };
    },
  },
  {
    id: 'CROSS-PROC-COVERAGE',
    category: 'cross',
    name: 'FC사슬 공정 커버리지',
    check: (ctx) => {
      const chainProcNos = new Set(ctx.chains.map(c => c.processNo).filter(Boolean));
      const flatProcNos = new Set(ctx.procNos);
      const uncovered = [...flatProcNos].filter(p => !chainProcNos.has(p));
      const rate = flatProcNos.size > 0 ? Math.round(chainProcNos.size / flatProcNos.size * 100) : 0;
      return {
        ruleId: 'CROSS-PROC-COVERAGE', status: uncovered.length === 0 ? 'PASS' : 'WARN',
        actual: `${rate}%`, expected: '100%',
        message: uncovered.length === 0 ? `전체 ${flatProcNos.size}공정 커버` : `미커버 공정 ${uncovered.length}건: ${uncovered.slice(0, 5).join(',')}`,
      };
    },
  },
];

// ──────────────────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────────────────

/**
 * 파싱 검증 + 자동수정 + 피드백 리포트 생성
 *
 * @param flatData ImportedFlatData[] (수정 가능 — 자동수정 시 push)
 * @param chains FC사슬 배열
 * @returns ParseValidationReport (검증 결과 + 수정 내역 + 피드백)
 */
export function runParsingCriteriaValidation(
  flatData: ImportedFlatData[],
  chains: MasterChainLike[],
): ParseValidationReport {
  const ctx = buildContext(flatData, chains);

  const criteriaResults: CriteriaResult[] = [];
  const autoFixes: AutoFixResult[] = [];

  // 1차: 검증만 실행
  for (const rule of CRITERIA_RULES) {
    criteriaResults.push(rule.check(ctx));
  }

  // 2차: FAIL/WARN인 항목 중 autoFix 있으면 실행
  for (const rule of CRITERIA_RULES) {
    if (!rule.autoFix) continue;
    const result = criteriaResults.find(r => r.ruleId === rule.id);
    if (result && result.status !== 'PASS') {
      const fix = rule.autoFix(ctx);
      if (fix.fixedCount > 0) {
        autoFixes.push(fix);
      }
    }
  }

  // 3차: 자동수정 후 재검증 (context 재구축)
  if (autoFixes.length > 0) {
    const ctx2 = buildContext(flatData, chains);
    criteriaResults.length = 0;
    for (const rule of CRITERIA_RULES) {
      criteriaResults.push(rule.check(ctx2));
    }
  }

  const passCount = criteriaResults.filter(r => r.status === 'PASS').length;
  const warnCount = criteriaResults.filter(r => r.status === 'WARN').length;
  const failCount = criteriaResults.filter(r => r.status === 'FAIL').length;
  const fixedCount = autoFixes.reduce((s, f) => s + f.fixedCount, 0);

  const summary = [
    `검증 ${criteriaResults.length}건: PASS=${passCount} WARN=${warnCount} FAIL=${failCount}`,
    fixedCount > 0 ? `자동수정 ${fixedCount}건` : '',
    failCount === 0 ? '✅ 검증 통과' : `❌ FAIL ${failCount}건 → 수동 확인 필요`,
  ].filter(Boolean).join(' | ');

  console.info(`[ParsingCriteria] ${summary}`);

  return {
    timestamp: new Date().toISOString(),
    totalItems: flatData.length,
    totalChains: chains.length,
    criteriaResults,
    autoFixes,
    passCount,
    warnCount,
    failCount,
    fixedCount,
    allPass: failCount === 0,
    summary,
  };
}

/**
 * 검증 리포트를 사람이 읽을 수 있는 테이블 형태로 변환
 */
export function formatReportAsTable(report: ParseValidationReport): string {
  const lines: string[] = [];
  lines.push('┌─────────────────────────────────────────────────────────────────┐');
  lines.push('│                  파싱 검증 기준표 리포트                          │');
  lines.push('├──────────────────────┬────────┬──────────┬──────────────────────┤');
  lines.push('│ 규칙                 │ 상태   │ 실제값   │ 설명                 │');
  lines.push('├──────────────────────┼────────┼──────────┼──────────────────────┤');

  for (const r of report.criteriaResults) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
    lines.push(`│ ${r.ruleId.padEnd(20)}│ ${icon}${r.status.padEnd(5)}│ ${String(r.actual).padEnd(8)} │ ${r.message.slice(0, 20).padEnd(20)}│`);
  }

  lines.push('├──────────────────────┴────────┴──────────┴──────────────────────┤');

  if (report.autoFixes.length > 0) {
    lines.push('│ 자동수정 내역:                                                  │');
    for (const f of report.autoFixes) {
      lines.push(`│   ${f.ruleId}: ${f.description.slice(0, 50).padEnd(50)}│`);
    }
    lines.push('├──────────────────────────────────────────────────────────────────┤');
  }

  lines.push(`│ 결과: PASS=${report.passCount} WARN=${report.warnCount} FAIL=${report.failCount} 수정=${report.fixedCount}  │`);
  lines.push(`│ ${report.summary.slice(0, 64).padEnd(64)}│`);
  lines.push('└──────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

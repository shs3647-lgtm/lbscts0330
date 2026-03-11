/**
 * @file import-builder.ts
 * @description STEP B 파싱 결과 → ImportedFlatData[] + MasterFailureChain[] 빌드
 * Python build_import_data() 포팅
 *
 * ── 데이터 생성 목적 ──
 * CP 전처리/STEP B Import = "완전한 데이터" 생성이 목표.
 * 부족한 데이터(B3 공정특성 등)를 WE명 기반으로 자동 보충하여,
 * 엔지니어가 사실에 근거한 완벽한 FMEA를 작성할 수 있는 기초자료를 제공한다.
 * ↔ 기존 자료 Import(STEP A)는 원본 사실 데이터를 그대로 보존 (보충/변환 없음)
 *
 * @created 2026-03-05
 */

import { v4 as uuidv4 } from 'uuid';
import type { ImportedFlatData } from '../types';
import type {
  StepBRawRow, StepBBuildData, StepBMasterChain,
  StepBA4Item, StepBB1Item, StepBB2Item, StepBB3Item, StepBB4Item, StepBB5Item,
  StepBC4Item, StepBFCChain, WarningCollector,
} from './types';
import { stripPrefix } from './prefix-utils';
import { inferC2C3, inferChar, getDefaultRuleSet } from './pc-dc-inference';
// 업종별 규칙 셋 자동 등록 (사이드이펙트 import)
import './industry-rules';

/** 유효한 4M 코드 */
const VALID_4M = new Set(['MN', 'MC', 'IM', 'EN']);

/** fc_4m이 유효하지 않으면 기본값 반환 (간소화 엑셀에서 4M 컬럼이 없는 경우) */
function safeM4(raw: string): string {
  const v = raw.trim().toUpperCase();
  return VALID_4M.has(v) ? v : '';
}

/** 공정번호 정렬 키 */
function sortKey(pno: string): number {
  const n = parseInt(pno, 10);
  return isNaN(n) ? 9999 : n;
}

/**
 * 파싱된 행 배열로부터 구조화된 Import 데이터 빌드
 *
 * - 공정마스터 (A1/A2)
 * - A3 공정기능 (없으면 자동생성)
 * - A4 제품특성, A5 고장형태
 * - B1 작업요소, B2 요소기능, B3 공정특성, B4 고장원인
 * - C1 구분, C4 고장영향 (S충돌 → 최대값)
 * - FC 고장사슬
 * - 01번 공통 공정 자동 삽입
 */
export function buildImportData(rows: StepBRawRow[], warn: WarningCollector): StepBBuildData {
  const procMaster = new Map<string, string>();
  const a3Map = new Map<string, { func: string; auto: boolean }>();
  const a4Map = new Map<string, StepBA4Item[]>();
  const a5Map = new Map<string, string[]>();
  const b1Map = new Map<string, StepBB1Item[]>();
  const b2Map = new Map<string, StepBB2Item[]>();
  const b3Map = new Map<string, StepBB3Item[]>();
  const b4Map = new Map<string, StepBB4Item[]>();

  // 중복 방지용 seen 세트
  const seen: Record<string, Set<string>> = {
    a4: new Set(), a5: new Set(), b1: new Set(), b2: new Set(), b3: new Set(), b4: new Set(),
  };

  // 4M 컬럼 유효성 검사: 한 행이라도 유효한 4M이면 4M 컬럼 존재
  const has4mColumn = rows.some(r => VALID_4M.has(r.fc4m.trim().toUpperCase()));

  for (const r of rows) {
    const pno = r.procNo;
    if (!pno) continue;

    // 4M 값: 유효하지 않으면 'MC' 기본값
    // has4mColumn=true여도 개별 행의 4M이 비어있으면 'MC'로 폴백 (B1/B2/B3 gate 통과 보장)
    const rowM4 = safeM4(r.fc4m) || 'MC';
    // WE 값: 간소화 포맷(!has4mColumn)에서는 l1We(작업요소명) 직접 사용
    // (fc_we가 잘못된 컬럼에 매핑될 수 있으므로 weNorm 무시)
    const rowWe = has4mColumn
      ? (r.weNorm || '')
      : (r.l1We.trim() || r.weNorm);

    // A1/A2 공정마스터
    if (!procMaster.has(pno)) {
      const rawName = r.procName;
      const clean = rawName.replace(new RegExp(`^${pno}번[-\\s]*`), '').trim();
      procMaster.set(pno, clean || rawName);
    }

    // A3 공정기능
    if (!a3Map.has(pno)) {
      let func = r.l2Func.trim();
      func = func.replace(new RegExp(`^${pno}번[-\\s]*`), '').trim();
      if (func) {
        a3Map.set(pno, { func, auto: false });
      } else {
        a3Map.set(pno, {
          func: `${procMaster.get(pno)}을(를) 수행하여 품질을 확보한다`,
          auto: true,
        });
        warn.info('A3_AUTO', `공정 ${pno}번 A3 자동생성`);
      }
    }

    // A4 제품특성
    {
      let char = r.l2Func.trim();
      char = char.replace(new RegExp(`^${pno}번[-\\s]*`), '').trim();
      const sc = r.scNorm;
      const key = `${pno}|${char}`;
      if (char && !seen.a4.has(key)) {
        seen.a4.add(key);
        const list = a4Map.get(pno) || [];
        list.push({ char, sc });
        a4Map.set(pno, list);
      }
    }

    // A5 고장형태
    {
      const fm = r.fmNorm;
      const key = `${pno}|${fm}`;
      if (fm && !seen.a5.has(key)) {
        seen.a5.add(key);
        const list = a5Map.get(pno) || [];
        list.push(fm);
        a5Map.set(pno, list);
      }
    }

    // B1 작업요소
    {
      const key = `${pno}|${rowM4}|${rowWe}`;
      if (rowM4 && rowWe && !seen.b1.has(key)) {
        seen.b1.add(key);
        const list = b1Map.get(pno) || [];
        list.push({ m4: rowM4, we: rowWe });
        b1Map.set(pno, list);
      }
    }

    // B2 요소기능 (MC/MN 기능동사 자동분리)
    {
      const key = `${pno}|${rowM4}|${rowWe}`;
      if (rowM4 && rowWe && !seen.b2.has(key)) {
        seen.b2.add(key);
        let rawFunc = r.l2ElemFunc.trim();
        rawFunc = rawFunc.replace(new RegExp(`^${pno}번[-\\s]*`), '').trim();
        let func: string;
        if (rawFunc) {
          func = rawFunc;
        } else if (rowM4 === 'MC') {
          func = `설비가 ${rowWe}을(를) 수행하여 결과를 제공한다`;
        } else {
          func = `작업자가 ${rowWe}을(를) 확인하고 결과를 판정한다`;
        }
        const list = b2Map.get(pno) || [];
        list.push({ m4: rowM4, we: rowWe, func });
        b2Map.set(pno, list);
      }
    }

    // B3 공정특성 — B1/B2와 1:1 보장 (동일 dedup 키: pno|m4|we)
    // B3는 FC/FM 기반 추론 (l2ElemFunc는 B2 기능용, B3 특성과 다름)
    {
      const key = `${pno}|${rowM4}|${rowWe}`;
      if (rowM4 && rowWe && !seen.b3.has(key)) {
        seen.b3.add(key);
        const ruleSet = getDefaultRuleSet();
        const char = inferChar(r.fcNorm, r.fmNorm, rowM4, rowWe, ruleSet);
        const sc = r.scNorm;
        const list = b3Map.get(pno) || [];
        list.push({ m4: rowM4, we: rowWe, char, sc });
        b3Map.set(pno, list);
      }
    }

    // B4 고장원인
    {
      const fc = r.fcNorm;
      const key = `${pno}|${rowM4}|${fc}`;
      if (rowM4 && fc && !seen.b4.has(key)) {
        seen.b4.add(key);
        const list = b4Map.get(pno) || [];
        list.push({ m4: rowM4, fc });
        b4Map.set(pno, list);
      }
    }
  }

  // C1 구분
  const scopeSet = new Set<string>();
  const c1: string[] = [];
  for (const r of rows) {
    const s = r.feScopeNorm;
    if (s && !scopeSet.has(s)) {
      scopeSet.add(s);
      c1.push(s);
    }
  }
  c1.sort((a, b) => {
    const order: Record<string, number> = { YP: 0, SP: 1, USER: 2 };
    return (order[a] ?? 9) - (order[b] ?? 9);
  });

  // C4 고장영향 (S충돌 → 최대값) — C2 추론보다 먼저 빌드 (C4가 C2의 입력)
  const feMap = new Map<string, StepBC4Item>();
  for (const r of rows) {
    const scope = r.feScopeNorm;
    const fe = r.feNorm;
    const s = r.sInt;
    const key = `${scope}|${fe}`;
    const existing = feMap.get(key);
    if (!existing) {
      feMap.set(key, { scope, fe, s });
    } else if (s !== null && (existing.s === null || s > existing.s)) {
      feMap.set(key, { ...existing, s });
    }
  }
  const c4 = [...feMap.values()];

  // C4 빈 FE 값 진단
  const emptyFeRows = rows.filter(r => r.feNorm === '').length;
  if (emptyFeRows > 0) {
    warn.error('FE_EMPTY', `FE 값이 비어있는 행: ${emptyFeRows}건 (stripFECode 후)`, undefined, `전체 ${rows.length}행 중`);
  }
  if (c4.length === 0 && rows.length > 0) {
    warn.error('C4_ZERO', 'C4(고장영향)이 0건 — fe 컬럼 감지 실패 또는 모든 FE 값이 빈 문자열');
  }

  // B3 빈 값 진단
  if (b3Map.size === 0 && rows.length > 0) {
    warn.error('B3_ZERO', 'B3(공정특성)이 0건 — l2_elem_func 컬럼 감지 실패 가능성');
  }

  // B1 vs B3 불일치 진단 — 누락된 WE에 대해 B3 자동 보충
  // ── 목적: CP 전처리는 "완전한 데이터" 생성이 목표.
  //    B1(작업요소)은 있지만 B3(공정특성)이 없으면 WE명 기반으로 보충하여
  //    엔지니어가 사실 기반 FMEA를 작성할 수 있는 완전한 기초자료를 제공한다.
  //    ↔ 기존 자료 Import는 원본 사실 데이터 그대로 보존 (보충 없음)
  for (const [pno, b1Items] of b1Map) {
    const b3Items = b3Map.get(pno) || [];
    const b3Keys = new Set(b3Items.map(b => `${b.m4}|${b.we}`));
    for (const b1 of b1Items) {
      const key = `${b1.m4}|${b1.we}`;
      if (!b3Keys.has(key)) {
        // B1에는 있지만 B3에는 없는 WE → B3 자동 보충
        const list = b3Map.get(pno) || [];
        list.push({ m4: b1.m4, we: b1.we, char: `${b1.we} 관리 특성`, sc: '' });
        b3Map.set(pno, list);
        warn.warn('B3_补充', `공정 ${pno} B3 자동보충: ${b1.we} (B1에만 존재)`);
      }
    }
  }

  // C2 제품기능 — C4 기반 생성 (C2 ≤ C4 계층 보장)
  // 비유: C4(고장영향)가 "증상"이면, C2(제품기능)는 "건강 목표".
  //       증상 하나당 목표 하나를 매핑하므로, 목표 수 ≤ 증상 수가 자연스럽게 보장된다.
  let c2Map = new Map<string, string[]>();
  let c3Map = new Map<string, string[]>();
  const seenC2 = new Set<string>();

  // C4 아이템별 l1Func 룩업 테이블 (scope|fe → l1Func/l2Func)
  const feFuncLookup = new Map<string, { l1Func: string; l2Func: string }>();
  for (const r of rows) {
    const key = `${r.feScopeNorm}|${r.feNorm}`;
    if (!feFuncLookup.has(key)) {
      feFuncLookup.set(key, { l1Func: r.l1Func.trim(), l2Func: r.l2Func.trim() });
    }
  }

  // 1차: C4 기반 l1Func (완제품기능) 매핑
  for (const item of c4) {
    const lookupKey = `${item.scope}|${item.fe}`;
    const funcs = feFuncLookup.get(lookupKey);
    const func = funcs?.l1Func || '';
    if (!func || !item.scope) continue;
    const c2Key = `${item.scope}|${func}`;
    if (!seenC2.has(c2Key)) {
      seenC2.add(c2Key);
      const list = c2Map.get(item.scope) || [];
      list.push(func);
      c2Map.set(item.scope, list);
    }
  }

  // 2차: l1Func 비어있으면 l2Func(공정기능) fallback — C4 기반
  if (c2Map.size === 0) {
    for (const item of c4) {
      const lookupKey = `${item.scope}|${item.fe}`;
      const funcs = feFuncLookup.get(lookupKey);
      const func = funcs?.l2Func || '';
      if (!func || !item.scope) continue;
      const c2Key = `${item.scope}|${func}`;
      if (!seenC2.has(c2Key)) {
        seenC2.add(c2Key);
        const list = c2Map.get(item.scope) || [];
        list.push(func);
        c2Map.set(item.scope, list);
      }
    }
    if (c2Map.size > 0) {
      warn.info('C2_FALLBACK', 'C2: l1_func 비어있음 → l2_func(공정기능)에서 추출');
    }
  }

  // 3차: 업종별 DB + FE→기능 변환 추론 (l1/l2 모두 없을 때)
  if (c2Map.size === 0 && c4.length > 0) {
    const inferred = inferC2C3(c4, warn);
    c2Map = inferred.c2Map;
    c3Map = inferred.c3Map;
  }

  // C3: 1차/2차에서 C2를 찾은 경우 C3 자동생성
  if (c3Map.size === 0 && c2Map.size > 0) {
    for (const [scope, funcs] of c2Map) {
      c3Map.set(scope, funcs.map(f => `${f} 충족`));
    }
  }

  // 01번 공통 공정 자동 삽입
  if (!procMaster.has('01')) {
    // 앞에 삽입 (Map 순서 보존)
    const newPM = new Map<string, string>([['01', '공통']]);
    for (const [k, v] of procMaster) newPM.set(k, v);
    procMaster.clear();
    for (const [k, v] of newPM) procMaster.set(k, v);

    const newA3 = new Map<string, { func: string; auto: boolean }>([
      ['01', { func: '공통 공정 기능 및 요구사항을 관리한다', auto: true }],
    ]);
    for (const [k, v] of a3Map) newA3.set(k, v);
    a3Map.clear();
    for (const [k, v] of newA3) a3Map.set(k, v);

    a4Map.set('01', [
      { char: '제품 ESD 특성', sc: '' },
      { char: '제품 청정도', sc: '' },
    ]);

    // ★ 2026-03-05: A5(고장형태) 자동 삽입 — A4 제품특성 기반
    a5Map.set('01', [
      'ESD 특성 부적합',
      '청정도 부적합',
    ]);

    const commonWE: Array<[string, string, string]> = [
      ['MN', '셋업엔지니어', '설비 조건을 셋업하고 공정 파라미터를 설정하며 초기품을 승인한다'],
      ['MN', '작업자', '작업을 수행하고 기준서를 준수하며 생산품을 이송한다'],
      ['MN', '운반원', '자재 및 제품을 운반한다'],
      ['MN', '보전원', '설비를 유지보수한다'],
      ['MN', '검사원', '품질 검사를 수행한다'],
    ];
    b1Map.set('01', commonWE.map(([m4, we]) => ({ m4, we })));
    b2Map.set('01', commonWE.map(([m4, we, func]) => ({ m4, we, func })));
    // ── 공통공정 B3: WE명 기반 의미있는 공정특성 생성 (전처리 = 완전한 데이터 목표)
    b3Map.set('01', commonWE.map(([m4, we]) => ({
      m4, we, char: `${we} 관리 특성`, sc: '',
    })));

    // ★ 2026-03-05: B4(고장원인) 자동 삽입 — B3 공정특성 기반 (B3≤B4 계층 체인 충족)
    b4Map.set('01', commonWE.map(([m4, we]) => ({
      m4, fc: `${we} 관리 부적합`,
    })));

    warn.info('COMMON_01', '01번 공통 공정 자동 삽입');
  }

  // A3가 있지만 A4가 없는 공정 → 플레이스홀더 A4 자동생성 (계층 체인 A3≤A4 충족)
  for (const [pno, a3Info] of a3Map) {
    if (!a4Map.has(pno) || (a4Map.get(pno) || []).length === 0) {
      const procName = procMaster.get(pno) || pno;
      a4Map.set(pno, [{ char: `${procName} 공정 품질 특성`, sc: '' }]);
      if (a3Info.auto) {
        warn.info('A4_AUTO', `공정 ${pno}번 A4 자동생성 (A3 자동생성에 따른 보완)`);
      }
    }
  }

  // ★ 2026-03-05: A4가 있지만 A5가 없는 공정 → A5 자동생성 (계층 체인 A4≤A5 충족)
  for (const [pno] of a4Map) {
    if (!a5Map.has(pno) || (a5Map.get(pno) || []).length === 0) {
      const a4Items = a4Map.get(pno) || [];
      if (a4Items.length > 0) {
        a5Map.set(pno, a4Items.map(a4 => `${a4.char} 부적합`));
        warn.info('A5_AUTO', `공정 ${pno}번 A5 자동생성 (A4 기반 ${a4Items.length}건)`);
      }
    }
  }

  // ★ 2026-03-05: B3가 있지만 B4가 없는 공정 → B4 자동생성 (계층 체인 B3≤B4 충족)
  for (const [pno] of b3Map) {
    if (!b4Map.has(pno) || (b4Map.get(pno) || []).length === 0) {
      const b3Items = b3Map.get(pno) || [];
      if (b3Items.length > 0) {
        b4Map.set(pno, b3Items.map(b3 => ({ m4: b3.m4, fc: `${b3.char} 부적합` })));
        warn.info('B4_AUTO', `공정 ${pno}번 B4 자동생성 (B3 기반 ${b3Items.length}건)`);
      }
    }
  }

  // FC 고장사슬 (중복제거)
  const fcChains: StepBFCChain[] = [];
  const seenFC = new Set<string>();
  for (const r of rows) {
    const chainM4 = safeM4(r.fc4m) || (has4mColumn ? '' : 'MC');
    // 간소화 포맷에서 fc_we가 잘못 매핑될 수 있으므로 l1We 사용
    const chainWe = has4mColumn
      ? (r.weNorm || '')
      : (r.l1We.trim() || r.weNorm);
    // ★ CRITICAL-1: 빈 FC 가드 — 고장원인이 비어있으면 체인 생성 스킵
    if (!r.fcNorm || r.fcNorm.trim() === '') {
      warn.warn('FC_EMPTY', `공정${r.procNo} FC 비어있음 - 체인 생성 스킵`, undefined, `FM="${r.fmNorm}"`);
      continue;
    }
    const key = `${r.procNo}|${r.feNorm}|${r.fmNorm}|${r.fcNorm}|${chainM4}`;
    if (!seenFC.has(key)) {
      seenFC.add(key);
      fcChains.push({
        procNo: r.procNo,
        m4: chainM4,
        we: chainWe,
        fe: r.feNorm,
        fm: r.fmNorm,
        fc: r.fcNorm,
        pc: r.pc,
        dc: r.dc,
        s: r.sInt,
        o: r.oInt,
        d: r.dInt,
        ap: r.ap,
      });
    }
  }

  // ★ HIGH-1: Step 3/4 분리 — Import 단계(Step 3)에서는 PC/DC 자동추론하지 않음
  // PC/DC는 워크시트에서 사용자가 체인을 확인한 후 별도 시점에 할당
  // (기존: inferMissingPCDC(fcChains, warn) — 제거됨)
  const emptyPcCount = fcChains.filter(ch => !ch.pc).length;
  const emptyDcCount = fcChains.filter(ch => !ch.dc).length;
  if (emptyPcCount > 0 || emptyDcCount > 0) {
    warn.info('PCDC_DEFERRED', `PC ${emptyPcCount}건 / DC ${emptyDcCount}건 미할당 — 워크시트에서 자동추론 예정`);
  }

  // A6 검출관리 + B5 예방관리 — fcChains에서 추출
  const a6Map = new Map<string, string[]>();
  const b5Map = new Map<string, StepBB5Item[]>();
  const seenA6 = new Set<string>();
  const seenB5 = new Set<string>();

  for (const ch of fcChains) {
    // A6 검출관리: procNo + DC (중복 제거)
    if (ch.dc) {
      const dcKey = `${ch.procNo}|${ch.dc}`;
      if (!seenA6.has(dcKey)) {
        seenA6.add(dcKey);
        const list = a6Map.get(ch.procNo) || [];
        list.push(ch.dc);
        a6Map.set(ch.procNo, list);
      }
    }

    // B5 예방관리: procNo + 4M + PC (중복 제거)
    if (ch.pc) {
      const pcKey = `${ch.procNo}|${ch.m4}|${ch.pc}`;
      if (!seenB5.has(pcKey)) {
        seenB5.add(pcKey);
        const list = b5Map.get(ch.procNo) || [];
        list.push({ m4: ch.m4, pc: ch.pc });
        b5Map.set(ch.procNo, list);
      }
    }
  }

  return {
    procMaster, c1, c2: c2Map, c3: c3Map, c4, a3: a3Map,
    a4: a4Map, a5: a5Map, a6: a6Map,
    b1: b1Map, b2: b2Map, b3: b3Map, b4: b4Map, b5: b5Map,
    fcChains,
  };
}

// ══════════════════════════════════════════════════════════════
// ImportedFlatData[] 변환
// ══════════════════════════════════════════════════════════════

/**
 * StepBBuildData → ImportedFlatData[] + StepBMasterChain[] 변환
 * 기존 saveMasterDataset() API와 100% 호환
 */
export function convertToImportFormat(
  data: StepBBuildData,
  warn: WarningCollector,
): { flatData: ImportedFlatData[]; failureChains: StepBMasterChain[] } {
  const flatData: ImportedFlatData[] = [];
  const now = new Date();

  const sortedProcNos = [...data.procMaster.keys()].sort((a, b) => sortKey(a) - sortKey(b));

  // A1 공정번호 + A2 공정명
  for (const pno of sortedProcNos) {
    const name = data.procMaster.get(pno) || '';
    flatData.push({
      id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A1',
      value: pno, createdAt: now,
    });
    flatData.push({
      id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A2',
      value: name, createdAt: now,
    });
  }

  // A3 공정기능
  for (const pno of sortedProcNos) {
    const info = data.a3.get(pno);
    if (info) {
      flatData.push({
        id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A3',
        value: info.func, inherited: info.auto, createdAt: now,
      });
    }
  }

  // A4 제품특성
  for (const pno of sortedProcNos) {
    const items = data.a4.get(pno) || [];
    for (const item of items) {
      flatData.push({
        id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A4',
        value: item.char, specialChar: item.sc || undefined, createdAt: now,
      });
    }
  }

  // A5 고장형태
  for (const pno of sortedProcNos) {
    const fms = data.a5.get(pno) || [];
    for (const fm of fms) {
      flatData.push({
        id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A5',
        value: fm, createdAt: now,
      });
    }
  }

  // A6 검출관리
  for (const pno of sortedProcNos) {
    const items = data.a6.get(pno) || [];
    for (const dc of items) {
      flatData.push({
        id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A6',
        value: dc, createdAt: now,
      });
    }
  }

  // B1 작업요소 — ID를 기록하여 B2/B3에서 parentItemId로 원자성 연결
  const b1IdMap = new Map<string, string>(); // `pno|m4|we` → B1 id
  for (const pno of sortedProcNos) {
    const items = data.b1.get(pno) || [];
    for (const item of items) {
      const b1Id = uuidv4();
      const weKey = `${pno}|${item.m4}|${item.we}`;
      b1IdMap.set(weKey, b1Id);
      flatData.push({
        id: b1Id, processNo: pno, category: 'B', itemCode: 'B1',
        value: item.we, m4: item.m4, createdAt: now,
      });
    }
  }

  // B2 요소기능 — parentItemId(B1 ID)로 원자성 매칭
  for (const pno of sortedProcNos) {
    const items = data.b2.get(pno) || [];
    for (const item of items) {
      const weKey = `${pno}|${item.m4}|${item.we}`;
      // ★ P3: parentItemId undefined 가드 — B1 미연결 시 자동 생성
      let b2ParentId = b1IdMap.get(weKey);
      if (!b2ParentId) {
        b2ParentId = uuidv4();
        b1IdMap.set(weKey, b2ParentId);
        flatData.push({
          id: b2ParentId, processNo: pno, category: 'B', itemCode: 'B1',
          value: item.we || '', m4: item.m4, createdAt: now,
        });
        warn.warn('B2_ORPHAN', `공정${pno} B2 "${item.func}" B1 자동생성 (key=${weKey})`);
      }
      flatData.push({
        id: uuidv4(), processNo: pno, category: 'B', itemCode: 'B2',
        value: item.func, m4: item.m4,
        belongsTo: item.we, parentItemId: b2ParentId,
        createdAt: now,
      });
    }
  }

  // B3 공정특성 — parentItemId(B1 UUID)로 원자성 매칭
  for (const pno of sortedProcNos) {
    const items = data.b3.get(pno) || [];
    for (const item of items) {
      const weKey = `${pno}|${item.m4}|${item.we}`;
      // ★★★ 2026-03-10: B3도 B2와 동일하게 B1 자동생성 (orphan 방지) ★★★
      let b3ParentId = b1IdMap.get(weKey);
      if (!b3ParentId) {
        b3ParentId = uuidv4();
        b1IdMap.set(weKey, b3ParentId);
        flatData.push({
          id: b3ParentId, processNo: pno, category: 'B', itemCode: 'B1',
          value: item.we || '', m4: item.m4, createdAt: now,
        });
        warn.warn('B3_ORPHAN', `공정${pno} B3 "${item.char}" B1 자동생성 (key=${weKey})`);
      }
      flatData.push({
        id: uuidv4(), processNo: pno, category: 'B', itemCode: 'B3',
        value: item.char, m4: item.m4, specialChar: item.sc || undefined,
        belongsTo: item.we, parentItemId: b3ParentId,
        createdAt: now,
      });
    }
  }

  // B4 고장원인 — ★★★ 2026-03-10: parentItemId(B1 UUID) 원자성 연결 추가 ★★★
  for (const pno of sortedProcNos) {
    const items = data.b4.get(pno) || [];
    for (const item of items) {
      const weKey = `${pno}|${item.m4}|${(item as any).we || ''}`;
      let b4ParentId = b1IdMap.get(weKey);
      // B4에 we 정보 없으면 같은 pno+m4의 첫 번째 B1 폴백
      if (!b4ParentId) {
        for (const [k, v] of b1IdMap) {
          if (k.startsWith(`${pno}|${item.m4}|`)) { b4ParentId = v; break; }
        }
      }
      flatData.push({
        id: uuidv4(), processNo: pno, category: 'B', itemCode: 'B4',
        value: item.fc, m4: item.m4,
        parentItemId: b4ParentId || undefined,
        createdAt: now,
      });
    }
  }

  // B5 예방관리
  for (const pno of sortedProcNos) {
    const items = data.b5.get(pno) || [];
    for (const item of items) {
      flatData.push({
        id: uuidv4(), processNo: pno, category: 'B', itemCode: 'B5',
        value: item.pc, m4: item.m4, createdAt: now,
      });
    }
  }

  // C1 구분
  for (const scope of data.c1) {
    flatData.push({
      id: uuidv4(), processNo: scope, category: 'C', itemCode: 'C1',
      value: scope, createdAt: now,
    });
  }

  // C2 제품기능
  for (const scope of data.c1) {
    const funcs = data.c2.get(scope) || [];
    for (const func of funcs) {
      flatData.push({
        id: uuidv4(), processNo: scope, category: 'C', itemCode: 'C2',
        value: func, createdAt: now,
      });
    }
  }

  // C3 요구사항
  for (const scope of data.c1) {
    const reqs = data.c3.get(scope) || [];
    for (const req of reqs) {
      flatData.push({
        id: uuidv4(), processNo: scope, category: 'C', itemCode: 'C3',
        value: req, inherited: true, createdAt: now,
      });
    }
  }

  // C4 고장영향
  for (const item of data.c4) {
    flatData.push({
      id: uuidv4(), processNo: item.scope, category: 'C', itemCode: 'C4',
      value: item.fe, createdAt: now,
    });
  }

  // FC 고장사슬 → StepBMasterChain[] (B1/B2/B3 보조정보 포함)
  const failureChains: StepBMasterChain[] = data.fcChains.map(ch => {
    // B2(요소기능) / B1(작업요소) / B3(공정특성) 조회 — procNo + m4 기반 매칭
    const b2Items = data.b2.get(ch.procNo) || [];
    const b2Match = b2Items.find(b => b.m4 === ch.m4 && b.we === ch.we)
      || b2Items.find(b => b.m4 === ch.m4)
      || b2Items[0];
    const b3Items = data.b3.get(ch.procNo) || [];
    const b3Match = b3Items.find(b => b.m4 === ch.m4 && b.we === ch.we)
      || b3Items.find(b => b.m4 === ch.m4)
      || b3Items[0];

    return {
      processNo: ch.procNo,
      m4: ch.m4,
      fcValue: ch.fc,
      fmValue: ch.fm,
      feValue: ch.fe,
      pcValue: ch.pc || '',
      dcValue: ch.dc || '',
      feScope: data.c4.find(c => c.fe === ch.fe)?.scope || 'YP',
      s: ch.s,
      o: ch.o,
      d: ch.d,
      ap: ch.ap,
      workElement: ch.we || b2Match?.we || undefined,
      l3Function: b2Match?.func || undefined,
      processChar: b3Match?.char || undefined,
    };
  });

  // 자동생성 항목 수 기록
  const autoCount = flatData.filter(d => d.inherited).length;
  if (autoCount > 0) {
    warn.info('AUTO_GENERATED', `자동생성 항목: ${autoCount}건 (적색 표시 대상)`);
  }

  return { flatData, failureChains };
}

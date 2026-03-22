/**
 * @file import-builder.ts
 * @description STEP B 파싱 결과 → ImportedFlatData[] + MasterFailureChain[] 빌드
 * Python build_import_data() 포팅
 *
 * ── 데이터 생성 목적 ──
 * CP 전처리/STEP B Import = "완전한 데이터" 생성이 목표.
 * 부족한 데이터(B3 공정특성 등)를 Master DB 기반으로 보충하여,
 * 엔지니어가 사실에 근거한 완벽한 FMEA를 작성할 수 있는 기초자료를 제공한다.
 * ↔ 기존 자료 Import(STEP A)는 원본 사실 데이터를 그대로 보존 (보충/변환 없음)
 *
 * ★★★ CODEFREEZE v2.0.0 (2026-03-21) ★★★
 * ★ UUID/FK 설계 원칙 — 영구 CODEFREEZE ★
 * ★ 수정 시 반드시 다음 문구로 허락 요청: ★
 * ★ "import-builder.ts의 dedup key를 수정해도 될까요? ★
 * ★  수정 사유: ___ / 영향 범위: ___" ★
 * ★ ★
 * ★ DEDUP KEY 5대 원칙: ★
 * ★ 1. 모든 dedup key에 공정번호(pno) 필수 포함 ★
 * ★ 2. L1 레벨은 구분(scope/category) 필수 포함 ★
 * ★ 3. 동일 텍스트 ≠ 동일 엔티티 (공정이 다르면 별도) ★
 * ★ 4. FK 매칭은 ID 기반만 허용 (텍스트 매칭 금지) ★
 * ★ 5. 폴백 자동생성 금지 — Master DB 조회 or 사용자 입력 ★
 * ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
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
import { enhancePCFormat, enhanceDCFormat } from './pc-dc-inference';
import type { SampleWEData } from '@/lib/sample-data-loader';
import { lookupSampleWE } from '@/lib/sample-data-loader';
// 업종별 규칙 셋 자동 등록 (사이드이펙트 import)
import './industry-rules';
import {
  genA1, genA3, genA4, genA5, genA6,
  genB1, genB2, genB3, genB4,
  genC1, genC2, genC3, genC4,
} from '@/lib/uuid-generator';

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

/** 텍스트 정규화 (UUID 매칭 키 생성용) */
function normalizeText(s: string | undefined): string {
  return (s || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** 공백 완전 제거 정규화 — MAIN시트/FC시트 공백 차이 흡수 */
function normalizeNoSpace(s: string | undefined): string {
  return normalizeText(s).replace(/\s/g, '');
}

/** B1 결정론적 ID에서 m4/b1seq 파싱: PF-L3-040-MC-001 → { m4:'MC', b1seq:1 } */
function parseB1seq(b1Id: string): { m4: string; b1seq: number } {
  const match = b1Id.match(/^[A-Z]+-L3-\d+-([A-Z]+)-(\d+)$/);
  if (match) return { m4: match[1], b1seq: parseInt(match[2]) };
  return { m4: '', b1seq: 1 };
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
export function buildImportData(rows: StepBRawRow[], warn: WarningCollector, sampleData?: SampleWEData[]): StepBBuildData {
  const procMaster = new Map<string, string>();
  const a3Map = new Map<string, { func: string; auto: boolean }>();
  const a4Map = new Map<string, StepBA4Item[]>();
  const a5Map = new Map<string, string[]>();
  const a5ParentA4 = new Map<string, string>(); // `pno|fm` → a4char (A5→A4 부모 매핑)
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
      ? (r.weNorm || '').trim()
      : (r.l1We.trim() || r.weNorm).trim();

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
    // ★ CODEFREEZE: dedup key = pno|char — 공정번호 필수 (Rule 1.7)
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
    // ★ CODEFREEZE: dedup key = pno|fm — 공정번호 필수 (Rule 1.7)
    {
      const fm = r.fmNorm;
      const key = `${pno}|${fm}`;
      if (fm && !seen.a5.has(key)) {
        seen.a5.add(key);
        const list = a5Map.get(pno) || [];
        list.push(fm);
        a5Map.set(pno, list);
        // ★ A5→A4 부모 매핑: 같은 행의 l2Func(제품특성)을 부모로 기록
        let char = r.l2Func.trim();
        char = char.replace(new RegExp(`^${pno}번[-\\s]*`), '').trim();
        if (char) a5ParentA4.set(key, char);
      }
    }

    // B1 작업요소
    // ★ CODEFREEZE: dedup key = pno|m4|we — 공정번호 필수 (Rule 1.7)
    {
      const key = `${pno}|${rowM4}|${rowWe}`;
      if (rowM4 && rowWe && !seen.b1.has(key)) {
        seen.b1.add(key);
        const list = b1Map.get(pno) || [];
        list.push({ m4: rowM4, we: rowWe });
        b1Map.set(pno, list);
      }
    }

    // B2 요소기능 — m066 꽂아넣기 (엑셀에 없을 때 Master DB 데이터 사용)
    // ★ CODEFREEZE: dedup key = pno|m4|we — 공정번호 필수 (Rule 1.7)
    {
      const key = `${pno}|${rowM4}|${rowWe}`;
      if (rowM4 && rowWe && !seen.b2.has(key)) {
        seen.b2.add(key);
        let rawFunc = r.l2ElemFunc.trim();
        rawFunc = rawFunc.replace(new RegExp(`^${pno}번[-\\s]*`), '').trim();
        let func: string;
        if (rawFunc) {
          func = rawFunc;
        } else {
          const sample = sampleData ? lookupSampleWE(sampleData, rowM4, rowWe) : null;
          if (sample && sample.b2.length > 0) {
            func = sample.b2[0];
          } else {
            func = '';
            warn.error('M066_MISSING_B2', `공정 ${pno} B2 누락: ${rowWe}(${rowM4}) — m066 매칭 실패, 사용자 입력 필요`);
          }
        }
        const list = b2Map.get(pno) || [];
        list.push({ m4: rowM4, we: rowWe, func });
        b2Map.set(pno, list);
      }
    }

    // B3 공정특성 — Master DB 꽂아넣기 전용 (fallback 자동생성 금지)
    // ★ CODEFREEZE: dedup key = pno|m4|we — 공정번호 필수 (Rule 1.7)
    {
      const key = `${pno}|${rowM4}|${rowWe}`;
      if (rowM4 && rowWe && !seen.b3.has(key)) {
        seen.b3.add(key);
        const sample = sampleData ? lookupSampleWE(sampleData, rowM4, rowWe) : null;
        let char: string;
        if (sample && sample.b3.length > 0) {
          char = sample.b3[0];
        } else {
          char = '';
          warn.error('M066_MISSING_B3', `공정 ${pno} B3 누락: ${rowWe}(${rowM4}) — m066 매칭 실패, 사용자 입력 필요`);
        }
        const sc = r.scNorm;
        const list = b3Map.get(pno) || [];
        list.push({ m4: rowM4, we: rowWe, char, sc });
        b3Map.set(pno, list);
      }
    }

    // B4 고장원인
    // ★★★ 2026-03-20 ROOT FIX: dedup key에 we+fm 포함 ★★★
    // we 포함: 동일 FC명이라도 다른 WE면 별도 B4 (Cu Target + Ti Target 구분)
    // fm 포함: 동일 FC가 여러 FM에 연결될 때 별도 B4 (1 FC → N FM 패턴 지원)
    //   예: IQA 공정에서 "자재 품질 부적합" FC가 M1, M2 두 FM에 연결 → 2개 B4 생성
    //   FailureCause 엔티티는 migration에서 텍스트 기준 중복제거, B4는 FailureLink 단위
    {
      const fc = r.fcNorm;
      const rowFm = r.fmNorm;
      const key = `${pno}|${rowM4}|${rowWe}|${rowFm}|${fc}`;
      if (rowM4 && rowWe && fc && !seen.b4.has(key)) {
        seen.b4.add(key);
        const list = b4Map.get(pno) || [];
        list.push({ m4: rowM4, we: rowWe, fc, fm: rowFm });
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

  // C4 고장영향 (S충돌 → 최대값) — 공정별 중복제거
  // ★ CODEFREEZE: dedup key = procNo|scope|fe — 공정번호+구분 필수 (Rule 1.7)
  const feMap = new Map<string, StepBC4Item>();
  for (const r of rows) {
    const procNo = r.procNo;
    const scope = r.feScopeNorm;
    const fe = r.feNorm;
    const s = r.sInt;
    const key = `${procNo}|${scope}|${fe}`;
    const existing = feMap.get(key);
    if (!existing) {
      feMap.set(key, { procNo, scope, fe, s });
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
        const list = b3Map.get(pno) || [];
        const sample = sampleData ? lookupSampleWE(sampleData, b1.m4, b1.we) : null;
        if (sample && sample.b3.length > 0) {
          list.push({ m4: b1.m4, we: b1.we, char: sample.b3[0], sc: '' });
          warn.info('B3_M066', `공정 ${pno} B3 m066 꽂아넣기: ${b1.we}(${b1.m4}) → "${sample.b3[0]}"`);
        } else {
          warn.error('M066_MISSING_B3_GAP', `공정 ${pno} B3 누락: ${b1.we}(${b1.m4}) — m066 매칭 실패, 하위요소 없음`);
        }
        b3Map.set(pno, list);
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

  // ★ 2026-03-22: inferC2C3 / C2→"방지 기능" / C3→"충족" 자동생성 전체 제거 (Rule 1.5.2)
  // 엑셀에 C2/C3가 없으면 빈 상태 유지 — 워크시트에서 사용자가 직접 입력
  if (c2Map.size === 0 && c4.length > 0) {
    warn.warn('C2_MISSING', `C2(완제품기능) 없음 — L1 시트 또는 워크시트에서 직접 입력 필요`);
  }
  if (c3Map.size === 0 && c2Map.size > 0) {
    warn.warn('C3_MISSING', `C3(요구사항) 없음 — 워크시트에서 직접 입력 필요`);
  }

  // 01번 공통 공정 자동 삽입
  // ★★★ 2026-03-17 FIX: 정규화된 '1'도 체크 (STEP B 파서가 '01번' → '1'로 정규화)
  const hasCommonProcess = procMaster.has('01') || procMaster.has('1') || procMaster.has('0')
    || [...procMaster.keys()].some(k => k.toLowerCase() === '공통' || k === '00');
  if (!hasCommonProcess) {
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

    // ★ 2026-03-22: A5 자동생성 제거 (Rule 1.5.2) — 워크시트에서 사용자가 직접 입력
    // 이전: a5Map.set('01', ['ESD 특성 부적합', '청정도 부적합'])
    warn.warn('A5_MISSING', '공통공정 01번 A5 없음 — 워크시트에서 직접 입력 필요');

    const commonWE: Array<[string, string, string]> = [
      ['MN', '셋업엔지니어', '설비 조건을 셋업하고 공정 파라미터를 설정하며 초기품을 승인한다'],
      ['MN', '작업자', '작업을 수행하고 기준서를 준수하며 생산품을 이송한다'],
      ['MN', '운반원', '자재 및 제품을 운반한다'],
      ['MN', '보전원', '설비를 유지보수한다'],
      ['MN', '검사원', '품질 검사를 수행한다'],
    ];
    b1Map.set('01', commonWE.map(([m4, we]) => ({ m4, we })));
    b2Map.set('01', commonWE.map(([m4, we, func]) => ({ m4, we, func })));
    // ★ 2026-03-22: B3 자동생성 제거 (Rule 1.5.2) — 빈 문자열, 워크시트에서 직접 입력
    b3Map.set('01', commonWE.map(([m4, we]) => ({
      m4, we, char: '', sc: '',
    })));

    // ★ B4: 공통공정 01번은 placeholder FC 생성하지 않음 — 수동모드에서 사용자가 직접 입력
    warn.info('COMMON_01', '01번 공통 공정 자동 삽입 (B4는 수동 입력 대기)');
  }

  // ★ 2026-03-22: A4 자동생성 제거 (Rule 1.5.2) — 엑셀에 없으면 빈 상태 유지
  for (const [pno] of a3Map) {
    if (!a4Map.has(pno) || (a4Map.get(pno) || []).length === 0) {
      warn.warn('A4_MISSING', `공정 ${pno}번 A4(제품특성) 없음 — 워크시트에서 직접 입력 필요`);
    }
  }

  // ★ 2026-03-22: A5 자동생성 제거 (Rule 1.5.2) — 엑셀에 없으면 빈 상태 유지
  for (const [pno] of a4Map) {
    if (!a5Map.has(pno) || (a5Map.get(pno) || []).length === 0) {
      warn.warn('A5_MISSING', `공정 ${pno}번 A5(고장형태) 없음 — 워크시트에서 직접 입력 필요`);
    }
  }

  // ★ 2026-03-21: B3가 있지만 B4가 없는 공정 → m066에서 실제 데이터 꽂아넣기
  for (const [pno] of b3Map) {
    if (!b4Map.has(pno) || (b4Map.get(pno) || []).length === 0) {
      const b3Items = b3Map.get(pno) || [];
      if (b3Items.length > 0) {
        const injected: StepBB4Item[] = [];
        for (const b3 of b3Items) {
          const sample = sampleData ? lookupSampleWE(sampleData, b3.m4, b3.we) : null;
          if (sample && sample.b4.length > 0) {
            for (const fc of sample.b4) {
              injected.push({ m4: b3.m4, we: b3.we, fc, fm: '' });
            }
            warn.info('B4_M066', `공정 ${pno} B4 m066 꽂아넣기: ${b3.we}(${b3.m4}) → ${sample.b4.length}건`);
          } else {
            // No m066 sample match — skip placeholder FC, WE will have zero FCs (valid for manual mode)
            warn.info('B4_SKIP', `공정 ${pno} B4 skip: ${b3.we} (m066 매칭 실패, placeholder 미생성)`);
          }
        }
        if (injected.length > 0) {
          b4Map.set(pno, injected);
        }
      }
    }
  }

  // ★★★ 2026-03-21: per-WE B4 m066 꽂아넣기 — B3 있지만 같은 m4+we의 B4 없는 경우 보충 ★★★
  for (const [pno, b3Items] of b3Map) {
    const b4Items = b4Map.get(pno) || [];
    const b4WeKeys = new Set(b4Items.map(b => `${b.m4}|${(b as any).we || ''}`));
    const list = b4Map.get(pno) || [];
    let added = 0;
    for (const b3 of b3Items) {
      const weKey = `${b3.m4}|${b3.we}`;
      if (b3.we && !b4WeKeys.has(weKey)) {
        const sample = sampleData ? lookupSampleWE(sampleData, b3.m4, b3.we) : null;
        if (sample && sample.b4.length > 0) {
          for (const fc of sample.b4) {
            list.push({ m4: b3.m4, we: b3.we, fc, fm: '' });
          }
          b4WeKeys.add(weKey);
          added++;
          warn.info('B4_M066_WE', `공정 ${pno} B4 m066 꽂아넣기: ${b3.we}(${b3.m4}) → ${sample.b4.length}건`);
        } else {
          // No m066 sample match — skip placeholder FC, WE will have zero FCs (valid for manual mode)
          b4WeKeys.add(weKey); // Mark as seen to prevent re-processing
          warn.info('B4_SKIP_WE', `공정 ${pno} B4 skip: ${b3.we} (m066 매칭 실패, placeholder 미생성)`);
        }
      }
    }
    if (added > 0) {
      b4Map.set(pno, list);
    }
  }

  // ★ 2026-03-22: B3 자동생성 제거 (Rule 1.5.2) — B4만 있고 B3 없으면 빈 B3 생성 (char='')
  for (const [pno, b4Items] of b4Map) {
    const b3Items = b3Map.get(pno) || [];
    const b3Keys = new Set(b3Items.map(b => `${b.m4}|${b.we}`));
    let added = 0;
    for (const b4 of b4Items) {
      const key = `${b4.m4}|${(b4 as any).we || ''}`;
      if (!b3Keys.has(key)) {
        const list = b3Map.get(pno) || [];
        list.push({ m4: b4.m4, we: (b4 as any).we || '', char: '', sc: '' });
        b3Map.set(pno, list);
        b3Keys.add(key);
        added++;
      }
    }
    if (added > 0) {
      warn.warn('B3_MISSING', `공정 ${pno} B3(공정특성) ${added}건 빈칸 — 워크시트에서 직접 입력 필요`);
    }
  }

  // ★ 2026-03-22: A5 "불량" 자동생성 제거 (Rule 1.5.2) — 엑셀에 없으면 빈 상태 유지
  for (const [pno, b4Items] of b4Map) {
    if (!a5Map.has(pno) || (a5Map.get(pno) || []).length === 0) {
      warn.warn('A5_MISSING', `공정 ${pno} A5(고장형태) 없음 (B4 ${b4Items.length}건 존재) — 워크시트에서 직접 입력 필요`);
    }
  }

  // FC 고장사슬 (중복제거)
  // ★★★ 2026-03-20: 1 FC → N FM 패턴 지원 ★★★
  // ★ CODEFREEZE: FC chain dedup key = procNo|fe|fm|fc|m4 — 공정번호 필수 (Rule 1.7)
  // 동일 FC가 여러 FM에 연결되는 경우 (예: IQA "자재 품질 부적합" → M1, M2):
  //   - FM 있는 행: FM별로 별도 체인 생성 (dedup key에 FM 포함)
  //   - FM 없는 행: 해당 공정의 모든 A5(FM)에 대해 체인 확장
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

    // FE 기본값 결정 (FM과 무관하게 공통)
    let chainFe = r.feNorm;
    if (!chainFe && c4.length > 0) {
      const scopedFE = c4.find(f => f.scope === r.feScopeNorm);
      chainFe = (scopedFE || c4[0])?.fe || '';
    }

    // FM이 있는 경우: 해당 FM으로 1개 체인 생성
    if (r.fmNorm) {
      const key = `${r.procNo}|${r.feNorm}|${r.fmNorm}|${r.fcNorm}|${chainM4}`;
      if (!seenFC.has(key)) {
        seenFC.add(key);
        fcChains.push({
          procNo: r.procNo, m4: chainM4, we: chainWe,
          fe: chainFe, fm: r.fmNorm, fc: r.fcNorm,
          pc: r.pc, dc: r.dc, s: r.sInt, o: r.oInt, d: r.dInt, ap: r.ap,
        });
      }
    } else {
      // FM이 비어있는 경우: 해당 공정의 모든 A5(FM)에 대해 체인 확장
      // L3 통합 시트에는 FM 컬럼이 없어 fm='' → 모든 FM에 연결하여 누락 방지
      const procFMs = a5Map.get(r.procNo) || [];
      const fmsToLink = procFMs.length > 0 ? procFMs : [''];
      for (const fm of fmsToLink) {
        const key = `${r.procNo}|${r.feNorm}|${fm}|${r.fcNorm}|${chainM4}`;
        if (!seenFC.has(key)) {
          seenFC.add(key);
          fcChains.push({
            procNo: r.procNo, m4: chainM4, we: chainWe,
            fe: chainFe, fm, fc: r.fcNorm,
            pc: r.pc, dc: r.dc, s: r.sInt, o: r.oInt, d: r.dInt, ap: r.ap,
          });
        }
      }
      if (procFMs.length > 1) {
        warn.info('FC_MULTI_FM', `공정${r.procNo} FC "${r.fcNorm}" → ${procFMs.length}개 FM에 연결 확장`);
      }
    }
  }

  // ★ 2026-03-22: Import 단계 inferPC/inferDC 추론 제거 (Rule 1.5.2, Rule 0.9)
  // PC/DC가 엑셀에 없으면 빈 상태 유지 → 워크시트에서 산업DB 자동추천 버튼으로 처리
  {
    const emptyPc = fcChains.filter(ch => !ch.pc?.trim()).length;
    const emptyDc = fcChains.filter(ch => !ch.dc?.trim()).length;
    if (emptyPc > 0 || emptyDc > 0) {
      warn.warn('PCDC_EMPTY', `PC ${emptyPc}건 / DC ${emptyDc}건 비어있음 — 워크시트에서 산업DB 자동추천 사용`);
    }
  }

  // ★ v5.6: 기존 Excel PC/DC 값도 SA 적합성 보강 (추론값은 이미 enhance 내장)
  for (const ch of fcChains) {
    if (ch.pc) ch.pc = enhancePCFormat(ch.pc, ch.m4);
    if (ch.dc) ch.dc = enhanceDCFormat(ch.dc);
  }

  // ★★★ 2026-03-17: FC시트 텍스트 → MAIN시트 텍스트 사전 매칭 ★★★
  // ⚠️ 이 매칭은 Import Stage 1 (임시) — FK 확정에 사용 금지 (Rule 1.7.2)
  // 목적: 같은 엑셀의 두 시트 간 텍스트 정규화 (FC시트 ↔ MAIN시트)
  // 결과: matchedFmText/matchedFcText → convertToImportFormat에서 UUID Map key 조회용
  // ★ Stage 3 (rebuild-atomic)에서 최종 FK는 반드시 ID 기반 Map.get()으로 확정
  {
    let fmMatched = 0;
    let fcMatched = 0;
    for (const ch of fcChains) {
      // FM 매칭: FC시트 ch.fm → a5Map MAIN시트 FM
      const a5Items = a5Map.get(ch.procNo) || [];
      if (a5Items.length > 0 && ch.fm) {
        let matchIdx = a5Items.findIndex(a5 => a5 === ch.fm);
        if (matchIdx < 0) matchIdx = a5Items.findIndex(a5 => normalizeText(a5) === normalizeText(ch.fm));
        if (matchIdx < 0) matchIdx = a5Items.findIndex(a5 => normalizeNoSpace(a5) === normalizeNoSpace(ch.fm));
        if (matchIdx < 0) {
          const nfm = normalizeNoSpace(ch.fm);
          matchIdx = a5Items.findIndex(a5 => {
            const na5 = normalizeNoSpace(a5);
            return na5.length > 2 && nfm.length > 2 && (na5.includes(nfm) || nfm.includes(na5));
          });
        }
        if (matchIdx >= 0) { ch.matchedFmText = a5Items[matchIdx]; fmMatched++; }
      }

      // FC 매칭: FC시트 ch.fc → b4Map MAIN시트 FC
      const b4Items = b4Map.get(ch.procNo) || [];
      if (b4Items.length > 0 && ch.fc) {
        let matchIdx = b4Items.findIndex(b4 => b4.fc === ch.fc);
        if (matchIdx < 0) matchIdx = b4Items.findIndex(b4 => normalizeText(b4.fc) === normalizeText(ch.fc));
        if (matchIdx < 0) matchIdx = b4Items.findIndex(b4 => normalizeNoSpace(b4.fc) === normalizeNoSpace(ch.fc));
        if (matchIdx < 0) {
          const nfc = normalizeNoSpace(ch.fc);
          matchIdx = b4Items.findIndex(b4 => {
            const nb4 = normalizeNoSpace(b4.fc);
            return nb4.length > 2 && nfc.length > 2 && (nb4.includes(nfc) || nfc.includes(nb4));
          });
        }
        if (matchIdx >= 0) { ch.matchedFcText = b4Items[matchIdx].fc; fcMatched++; }
      }
    }
    if (fcChains.length > 0) {
      console.info(`[buildImportData] 사전 매칭: FM=${fmMatched}/${fcChains.length}, FC=${fcMatched}/${fcChains.length}`);
    }
  }

  // A6 검출관리 + B5 예방관리 — fcChains에서 추출 + b4/a5 기반 보충
  const a6Map = new Map<string, string[]>();
  const b5Map = new Map<string, StepBB5Item[]>();
  const seenA6 = new Set<string>();
  const seenB5 = new Set<string>();

  // 1차: fcChains에서 추출 (PC/DC는 위에서 이미 추론 완료)
  for (const ch of fcChains) {
    if (ch.dc) {
      const dcKey = `${ch.procNo}|${ch.dc}`;
      if (!seenA6.has(dcKey)) {
        seenA6.add(dcKey);
        const list = a6Map.get(ch.procNo) || [];
        list.push(ch.dc);
        a6Map.set(ch.procNo, list);
      }
    }
    if (ch.pc) {
      // FC 단위 dedup: 같은 PC 텍스트라도 다른 FC면 별도 B5 항목 유지
      // ★ CODEFREEZE: B5 dedup key = procNo|m4|we|fc|pc — 공정번호 필수 (Rule 1.7)
      const pcKey = `${ch.procNo}|${ch.m4}|${ch.we}|${ch.fc}|${ch.pc}`;
      if (!seenB5.has(pcKey)) {
        seenB5.add(pcKey);
        const list = b5Map.get(ch.procNo) || [];
        list.push({ m4: ch.m4, pc: ch.pc });
        b5Map.set(ch.procNo, list);
      }
    }
  }

  // 2차: m066 꽂아넣기 (sampleData 조회만 유지, 추론 fallback 제거 — Rule 1.5.2)
  {
    for (const [pno] of a5Map) {
      if (a6Map.has(pno) && (a6Map.get(pno) || []).length > 0) continue;
      const dcList: string[] = [];
      const b1Items = b1Map.get(pno) || [];
      for (const b1 of b1Items) {
        const sample = sampleData ? lookupSampleWE(sampleData, b1.m4, b1.we) : null;
        if (sample && sample.a6.length > 0) {
          for (const dc of sample.a6) {
            if (!seenA6.has(`${pno}|${dc}`)) {
              seenA6.add(`${pno}|${dc}`);
              dcList.push(dc);
            }
          }
        }
      }
      // ★ 2026-03-22: inferDC fallback 제거 — sampleData에 없으면 빈 상태 유지
      if (dcList.length > 0) {
        a6Map.set(pno, dcList);
      } else {
        warn.warn('A6_MISSING', `공정 ${pno} A6(검출관리) 없음 — 워크시트에서 산업DB 자동추천 사용`);
      }
    }
    for (const [pno] of b4Map) {
      if (b5Map.has(pno) && (b5Map.get(pno) || []).length > 0) continue;
      const pcList: StepBB5Item[] = [];
      const b1Items = b1Map.get(pno) || [];
      for (const b1 of b1Items) {
        const sample = sampleData ? lookupSampleWE(sampleData, b1.m4, b1.we) : null;
        if (sample && sample.b5.length > 0) {
          for (const pc of sample.b5) {
            if (!seenB5.has(`${pno}|${b1.m4}|${b1.we}||${pc}`)) {
              seenB5.add(`${pno}|${b1.m4}|${b1.we}||${pc}`);
              pcList.push({ m4: b1.m4, pc });
            }
          }
        }
      }
      // ★ 2026-03-22: inferPC fallback 제거 — sampleData에 없으면 빈 상태 유지
      if (pcList.length > 0) {
        b5Map.set(pno, pcList);
      } else {
        warn.warn('B5_MISSING', `공정 ${pno} B5(예방관리) 없음 — 워크시트에서 산업DB 자동추천 사용`);
      }
    }
  }

  return {
    procMaster, c1, c2: c2Map, c3: c3Map, c4, a3: a3Map,
    a4: a4Map, a5: a5Map, a5ParentA4, a6: a6Map,
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

  // ★ chain UUID 직접 할당용 Map (텍스트 매칭 완전 제거 목표)
  const a5IdByKey = new Map<string, string>();
  const b4IdByKey = new Map<string, string>();
  const c4IdByKey = new Map<string, string>();

  const sortedProcNos = [...data.procMaster.keys()].sort((a, b) => sortKey(a) - sortKey(b));

  // A1 공정번호 + A2 공정명
  for (const pno of sortedProcNos) {
    const pnoNum = parseInt(pno) || 0;
    const name = data.procMaster.get(pno) || '';
    flatData.push({
      id: genA1('PF', pnoNum), processNo: pno, category: 'A', itemCode: 'A1',
      value: pno, createdAt: now,
    });
    flatData.push({
      id: genA1('PF', pnoNum) + '-N', processNo: pno, category: 'A', itemCode: 'A2',
      value: name, createdAt: now,
    });
  }

  // A3 공정기능
  for (const pno of sortedProcNos) {
    const pnoNum = parseInt(pno) || 0;
    const info = data.a3.get(pno);
    if (info) {
      flatData.push({
        id: genA3('PF', pnoNum, 1), processNo: pno, category: 'A', itemCode: 'A3',
        value: info.func, inherited: info.auto, createdAt: now,
      });
    }
  }

  // A4 제품특성 — ID를 기록하여 A5에서 parentItemId로 참조
  const a4IdLookup = new Map<string, string>(); // `pno|char` → A4 id
  for (const pno of sortedProcNos) {
    const pnoNum = parseInt(pno) || 0;
    const items = data.a4.get(pno) || [];
    let a4seq = 0;
    for (const item of items) {
      a4seq++;
      const a4Id = genA4('PF', pnoNum, a4seq);
      a4IdLookup.set(`${pno}|${item.char}`, a4Id);
      flatData.push({
        id: a4Id, processNo: pno, category: 'A', itemCode: 'A4',
        value: item.char, specialChar: item.sc || undefined, createdAt: now,
      });
    }
  }

  // A5 고장형태 — ★ parentItemId로 A4(제품특성) 원자성 연결
  for (const pno of sortedProcNos) {
    const pnoNum = parseInt(pno) || 0;
    const fms = data.a5.get(pno) || [];
    const a4Items = data.a4.get(pno) || [];
    let a5seq = 0;
    for (let i = 0; i < fms.length; i++) {
      a5seq++;
      const fm = fms[i];
      const a5Id = genA5('PF', pnoNum, a5seq);
      // ★ chain flatId FK 직접 할당용 기록 (exact + normalized + noSpace)
      a5IdByKey.set(`${pno}|${fm}`, a5Id);
      a5IdByKey.set(`${pno}|${normalizeText(fm)}`, a5Id);
      a5IdByKey.set(`${pno}|NS|${normalizeNoSpace(fm)}`, a5Id);
      // 1차: a5ParentA4 매핑 (같은 Excel 행의 A4 텍스트)
      const parentChar = data.a5ParentA4?.get(`${pno}|${fm}`);
      let parentId: string | undefined;
      if (parentChar) {
        parentId = a4IdLookup.get(`${pno}|${parentChar}`);
      }
      // 2차: 위치 기반 1:1 매핑 (A4 수 == A5 수일 때)
      if (!parentId && a4Items.length > 0 && a4Items.length === fms.length) {
        parentId = a4IdLookup.get(`${pno}|${a4Items[i].char}`);
      }
      // 3차: 첫 번째 A4 fallback
      if (!parentId && a4Items.length > 0) {
        parentId = a4IdLookup.get(`${pno}|${a4Items[0].char}`);
      }
      flatData.push({
        id: a5Id, processNo: pno, category: 'A', itemCode: 'A5',
        value: fm, parentItemId: parentId, createdAt: now,
      });
    }
  }

  // A6 검출관리
  for (const pno of sortedProcNos) {
    const pnoNum = parseInt(pno) || 0;
    const items = data.a6.get(pno) || [];
    let a6seq = 0;
    for (const dc of items) {
      a6seq++;
      flatData.push({
        id: genA6('PF', pnoNum, a6seq), processNo: pno, category: 'A', itemCode: 'A6',
        value: dc, createdAt: now,
      });
    }
  }

  // B1 작업요소 — ID를 기록하여 B2/B3/B4에서 parentItemId로 원자성 연결
  const b1IdMap = new Map<string, string>(); // `pno|m4|we` → B1 id
  const b1seqByM4 = new Map<string, number>(); // `pno|m4` → 현재 seq
  for (const pno of sortedProcNos) {
    const pnoNum = parseInt(pno) || 0;
    const items = data.b1.get(pno) || [];
    for (const item of items) {
      const m4Key = `${pno}|${item.m4}`;
      const b1seq = (b1seqByM4.get(m4Key) || 0) + 1;
      b1seqByM4.set(m4Key, b1seq);
      const b1Id = genB1('PF', pnoNum, item.m4, b1seq);
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
    const pnoNum = parseInt(pno) || 0;
    const items = data.b2.get(pno) || [];
    for (const item of items) {
      const weKey = `${pno}|${item.m4}|${item.we}`;
      // ★ P3: parentItemId undefined 가드 — B1 미연결 시 자동 생성
      let b2ParentId = b1IdMap.get(weKey);
      if (!b2ParentId) {
        const m4Key = `${pno}|${item.m4}`;
        const b1seq = (b1seqByM4.get(m4Key) || 0) + 1;
        b1seqByM4.set(m4Key, b1seq);
        b2ParentId = genB1('PF', pnoNum, item.m4, b1seq);
        b1IdMap.set(weKey, b2ParentId);
        flatData.push({
          id: b2ParentId, processNo: pno, category: 'B', itemCode: 'B1',
          value: item.we || '', m4: item.m4, createdAt: now,
        });
        warn.warn('B2_ORPHAN', `공정${pno} B2 "${item.func}" B1 자동생성 (key=${weKey})`);
      }
      const parsed = parseB1seq(b2ParentId);
      flatData.push({
        id: genB2('PF', pnoNum, parsed.m4 || item.m4, parsed.b1seq), processNo: pno, category: 'B', itemCode: 'B2',
        value: item.func, m4: item.m4,
        belongsTo: item.we, parentItemId: b2ParentId,
        createdAt: now,
      });
    }
  }

  // B3 공정특성 — parentItemId(B1 UUID)로 원자성 매칭
  const cseqByB1 = new Map<string, number>(); // B1 ID → 현재 cseq
  const b3IdsByPnoM4We = new Map<string, string[]>(); // `pno|m4|we` → B3 ID 순서 목록 (B4→B3 매핑용)
  for (const pno of sortedProcNos) {
    const pnoNum = parseInt(pno) || 0;
    const items = data.b3.get(pno) || [];
    for (const item of items) {
      const weKey = `${pno}|${item.m4}|${item.we}`;
      let b3ParentId = b1IdMap.get(weKey);
      if (!b3ParentId) {
        const m4Key = `${pno}|${item.m4}`;
        const b1seq = (b1seqByM4.get(m4Key) || 0) + 1;
        b1seqByM4.set(m4Key, b1seq);
        b3ParentId = genB1('PF', pnoNum, item.m4, b1seq);
        b1IdMap.set(weKey, b3ParentId);
        flatData.push({
          id: b3ParentId, processNo: pno, category: 'B', itemCode: 'B1',
          value: item.we || '', m4: item.m4, createdAt: now,
        });
        warn.warn('B3_ORPHAN', `공정${pno} B3 "${item.char}" B1 자동생성 (key=${weKey})`);
      }
      const parsed = parseB1seq(b3ParentId);
      const cseq = (cseqByB1.get(b3ParentId) || 0) + 1;
      cseqByB1.set(b3ParentId, cseq);
      const b3Id = genB3('PF', pnoNum, parsed.m4 || item.m4, parsed.b1seq, cseq);
      flatData.push({
        id: b3Id, processNo: pno, category: 'B', itemCode: 'B3',
        value: item.char, m4: item.m4, specialChar: item.sc || undefined,
        belongsTo: item.we, parentItemId: b3ParentId,
        createdAt: now,
      });
      // ★★★ 2026-03-21 FIX: B3 ID를 pno+m4+we별로 수집 (B4→B3 FK 매핑 정확도 향상) ★★★
      // 이전: pno|m4 → 같은 m4의 다른 WE B3와 혼합 → B4가 잘못된 WE의 B3에 매핑
      // 수정: pno|m4|we → 정확한 WE의 B3에만 매핑
      const b3m4WeKey = `${pno}|${item.m4}|${item.we}`;
      if (!b3IdsByPnoM4We.has(b3m4WeKey)) b3IdsByPnoM4We.set(b3m4WeKey, []);
      b3IdsByPnoM4We.get(b3m4WeKey)!.push(b3Id);
    }
  }

  // ★★★ 2026-03-19 파이프라인 재설계: B4.parentItemId → B3 ID (B1 아님) ★★★
  // 근본원인: B4.parentItemId=B1 → buildWorksheetState에서 pcIdSet.has(parentItemId)=false → 순차폴백 → orphanPC
  // 수정: B4.parentItemId를 동일 pno+m4 그룹의 B3 ID로 설정 (순차 매칭, 초과분은 마지막 B3)
  const kseqByB1 = new Map<string, number>(); // B1 ID → 현재 kseq
  const b4SeqByPnoM4 = new Map<string, number>(); // B4→B3 순차 매핑용 카운터
  for (const pno of sortedProcNos) {
    const pnoNum = parseInt(pno) || 0;
    const items = data.b4.get(pno) || [];
    for (const item of items) {
      const weKey = `${pno}|${item.m4}|${(item as any).we || ''}`;
      let b4B1Id = b1IdMap.get(weKey);
      if (!b4B1Id) {
        for (const [k, v] of b1IdMap) {
          if (k.startsWith(`${pno}|${item.m4}|`)) { b4B1Id = v; break; }
        }
      }
      const parsed = b4B1Id ? parseB1seq(b4B1Id) : { m4: item.m4, b1seq: 1 };
      const kseq = (kseqByB1.get(b4B1Id || '') || 0) + 1;
      kseqByB1.set(b4B1Id || '', kseq);
      const b4Id = genB4('PF', pnoNum, parsed.m4 || item.m4, parsed.b1seq, kseq);
      // ★ chain flatId FK 직접 할당용 기록 (exact + normalized + noSpace)
      b4IdByKey.set(`${pno}|${item.m4}|${item.fc}`, b4Id);
      b4IdByKey.set(`${pno}|${item.m4}|${normalizeText(item.fc)}`, b4Id);
      b4IdByKey.set(`${pno}|${item.m4}|NS|${normalizeNoSpace(item.fc)}`, b4Id);

      // ★★★ 2026-03-21 FIX: B4→B3 FK: pno+m4+we 그룹 우선 → pno+m4 fallback ★★★
      const b3m4WeKey = `${pno}|${item.m4}|${(item as any).we || ''}`;
      let b3Ids = b3IdsByPnoM4We.get(b3m4WeKey) || [];
      // WE 매칭 실패 시 같은 m4의 모든 WE B3로 fallback
      if (b3Ids.length === 0) {
        for (const [k, v] of b3IdsByPnoM4We) {
          if (k.startsWith(`${pno}|${item.m4}|`) && v.length > 0) { b3Ids = v; break; }
        }
      }
      const b4Seq = b4SeqByPnoM4.get(b3m4WeKey) || 0;
      b4SeqByPnoM4.set(b3m4WeKey, b4Seq + 1);
      let b3ParentId = b3Ids.length > 0
        ? b3Ids[Math.min(b4Seq, b3Ids.length - 1)]
        : undefined;

      // ★ 2026-03-22: B3 자동생성 제거 (Rule 1.5.2) — 빈 B3 생성으로 parentItemId 보장
      if (!b3ParentId && !b4B1Id) {
        const autoB3Id = genB3('PF', pnoNum, item.m4, 1, 1);
        if (!flatData.some(d => d.id === autoB3Id)) {
          flatData.push({
            id: autoB3Id, processNo: pno, category: 'B', itemCode: 'B3',
            value: '', m4: item.m4, createdAt: now,
          });
          if (!b3IdsByPnoM4We.has(b3m4WeKey)) b3IdsByPnoM4We.set(b3m4WeKey, []);
          b3IdsByPnoM4We.get(b3m4WeKey)!.push(autoB3Id);
          warn.warn('B3_MISSING', `공정${pno} B4 "${item.fc}" → B3 빈칸 생성 (parentItemId 보장, 직접 입력 필요)`);
        }
        b3ParentId = autoB3Id;
      }

      flatData.push({
        id: b4Id, processNo: pno, category: 'B', itemCode: 'B4',
        value: item.fc, m4: item.m4,
        parentItemId: b3ParentId || b4B1Id,
        createdAt: now,
      });
    }
  }

  // B5 예방관리 — uuidv4 유지 (아직 FK 연결 대상 아님)
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
      id: genC1('PF', scope), processNo: scope, category: 'C', itemCode: 'C1',
      value: scope, createdAt: now,
    });
  }

  // C2 제품기능
  const c2seqByScope = new Map<string, number>(); // scope → 현재 c2seq
  for (const scope of data.c1) {
    const funcs = data.c2.get(scope) || [];
    for (const func of funcs) {
      const c2seq = (c2seqByScope.get(scope) || 0) + 1;
      c2seqByScope.set(scope, c2seq);
      flatData.push({
        id: genC2('PF', scope, c2seq), processNo: scope, category: 'C', itemCode: 'C2',
        value: func, createdAt: now,
      });
    }
  }

  // C3 요구사항
  for (const scope of data.c1) {
    const c2seq = c2seqByScope.get(scope) || 1;
    const reqs = data.c3.get(scope) || [];
    let c3seq = 0;
    for (const req of reqs) {
      c3seq++;
      flatData.push({
        id: genC3('PF', scope, c2seq, c3seq), processNo: scope, category: 'C', itemCode: 'C3',
        value: req, inherited: true, createdAt: now,
      });
    }
  }

  // C4 고장영향 — processNo는 scope(YP/SP/USER) 유지 (buildWorksheetState C1 필터 호환)
  const c4seqByScope = new Map<string, number>(); // scope → 현재 c4seq
  for (const item of data.c4) {
    const div = item.scope === 'USER' ? 'US' : (item.scope || 'YP');
    const c2seq = c2seqByScope.get(item.scope) || 1;
    const c3seqVal = 1; // C4는 첫 번째 C3 하위
    const c4seq = (c4seqByScope.get(item.scope) || 0) + 1;
    c4seqByScope.set(item.scope, c4seq);
    const c4Id = genC4('PF', div, c2seq, c3seqVal, c4seq);
    // ★ chain flatId FK 직접 할당용 기록 (exact + normalized + noSpace)
    c4IdByKey.set(`${item.scope}|${item.fe}`, c4Id);
    c4IdByKey.set(`${item.scope}|${normalizeText(item.fe)}`, c4Id);
    c4IdByKey.set(`${item.scope}|NS|${normalizeNoSpace(item.fe)}`, c4Id);
    flatData.push({
      id: c4Id, processNo: item.scope, category: 'C', itemCode: 'C4',
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
      feScope: data.c4.find(c => c.procNo === ch.procNo && c.fe === ch.fe)?.scope || 'YP',
      s: ch.s,
      o: ch.o,
      d: ch.d,
      ap: ch.ap,
      workElement: ch.we || b2Match?.we || undefined,
      l3Function: b2Match?.func || undefined,
      processChar: b3Match?.char || undefined,
    };
  });

  // ★★★ 2026-03-17: flatData ID 직접 할당 — 8단계 결정론적 매칭 ★★★
  // 사전매칭(matchedFmText) 우선 → exact → normalized → noSpace fallback
  // buildWorksheetState에서 flatId→entityId 매핑으로 최종 확정

  // Side-channel: buildImportData 사전매칭 결과 (index 기반)
  const srcChains = data.fcChains;

  let fmAssigned = 0;
  let fcAssigned = 0;
  let feAssigned = 0;
  for (let i = 0; i < failureChains.length; i++) {
    const ch = failureChains[i];
    const npNo = String(parseInt(ch.processNo) || 0);
    const src = i < srcChains.length ? srcChains[i] : undefined;

    // FM: 8단계 매칭 (사전매칭 → exact → normalized → noSpace)
    if (!ch.fmId && ch.fmValue) {
      let fmId: string | undefined;
      // 0차: 사전매칭 결과 (MAIN시트 원본 텍스트 — exact hit 보장)
      if (!fmId && src?.matchedFmText) {
        fmId = a5IdByKey.get(`${ch.processNo}|${src.matchedFmText}`)
          || a5IdByKey.get(`${npNo}|${src.matchedFmText}`);
      }
      // 1~4차: FC시트 원본 텍스트 매칭
      if (!fmId) {
        fmId = a5IdByKey.get(`${ch.processNo}|${ch.fmValue}`)
          || a5IdByKey.get(`${npNo}|${ch.fmValue}`)
          || a5IdByKey.get(`${ch.processNo}|${normalizeText(ch.fmValue)}`)
          || a5IdByKey.get(`${npNo}|${normalizeText(ch.fmValue)}`);
      }
      // 5~6차: noSpace fallback (공백 차이 흡수)
      if (!fmId) {
        fmId = a5IdByKey.get(`${ch.processNo}|NS|${normalizeNoSpace(ch.fmValue)}`)
          || a5IdByKey.get(`${npNo}|NS|${normalizeNoSpace(ch.fmValue)}`);
      }
      if (fmId) { ch.fmId = fmId; ch.fmFlatId = fmId; fmAssigned++; }
    }

    // FC: 8단계 매칭 (사전매칭 → exact → normalized → noSpace)
    if (!ch.fcId && ch.fcValue) {
      let fcId: string | undefined;
      // 0차: 사전매칭 결과
      if (!fcId && src?.matchedFcText) {
        fcId = b4IdByKey.get(`${ch.processNo}|${ch.m4}|${src.matchedFcText}`)
          || b4IdByKey.get(`${npNo}|${ch.m4}|${src.matchedFcText}`);
      }
      // 1~4차: FC시트 원본 텍스트 매칭
      if (!fcId) {
        fcId = b4IdByKey.get(`${ch.processNo}|${ch.m4}|${ch.fcValue}`)
          || b4IdByKey.get(`${npNo}|${ch.m4}|${ch.fcValue}`)
          || b4IdByKey.get(`${ch.processNo}|${ch.m4}|${normalizeText(ch.fcValue)}`)
          || b4IdByKey.get(`${npNo}|${ch.m4}|${normalizeText(ch.fcValue)}`);
      }
      // 5~6차: noSpace fallback
      if (!fcId) {
        fcId = b4IdByKey.get(`${ch.processNo}|${ch.m4}|NS|${normalizeNoSpace(ch.fcValue)}`)
          || b4IdByKey.get(`${npNo}|${ch.m4}|NS|${normalizeNoSpace(ch.fcValue)}`);
      }
      if (fcId) { ch.fcId = fcId; ch.fcFlatId = fcId; fcAssigned++; }
    }

    // FE: 4단계 매칭 (exact → normalized → noSpace)
    if (!ch.feId && ch.feValue) {
      const scope = ch.feScope || 'YP';
      const feId = c4IdByKey.get(`${scope}|${ch.feValue}`)
        || c4IdByKey.get(`${scope}|${normalizeText(ch.feValue)}`)
        || c4IdByKey.get(`${scope}|NS|${normalizeNoSpace(ch.feValue)}`);
      if (feId) { ch.feId = feId; ch.feFlatId = feId; feAssigned++; }
    }
  }
  const totalChains = failureChains.length;
  console.info(`[import-builder] flatId FK 직접 할당: FM=${fmAssigned}/${totalChains}, FC=${fcAssigned}/${totalChains}, FE=${feAssigned}/${totalChains}`);
  warn.info('UUID_FK_ASSIGN', `flatId FK 직접 할당: FM=${fmAssigned}/${totalChains}, FC=${fcAssigned}/${totalChains}, FE=${feAssigned}/${totalChains}`);

  // ★ 미매칭 chain 진단 로그 (0건이어야 정상)
  const unmatched = failureChains.filter(c => !c.fmId || !c.fcId || !c.feId);
  if (unmatched.length > 0) {
    console.warn(`[import-builder] ⚠️ ${unmatched.length}건 미매칭 chain 존재:`);
    for (const c of unmatched.slice(0, 10)) {
      const parts: string[] = [];
      if (!c.fmId) parts.push(`FM="${(c.fmValue || '').slice(0, 30)}"`);
      if (!c.fcId) parts.push(`FC="${(c.fcValue || '').slice(0, 30)}"`);
      if (!c.feId) parts.push(`FE="${(c.feValue || '').slice(0, 30)}"`);
      console.warn(`  proc=${c.processNo} m4=${c.m4 || '-'} ${parts.join(' ')}`);
    }
    warn.warn('UUID_FK_UNMATCHED', `${unmatched.length}건 chain UUID 미매칭 — 텍스트 차이 확인 필요`);
  }

  // 자동생성 항목 수 기록
  const autoCount = flatData.filter(d => d.inherited).length;
  if (autoCount > 0) {
    warn.info('AUTO_GENERATED', `자동생성 항목: ${autoCount}건 (적색 표시 대상)`);
  }

  // ★ FE:FM:FC 매칭 검증 — Import 파싱 시점에 즉시 검증 (사후 FAVerificationBar 전에 경고)
  {
    // C4(FE) vs FC시트(chains) 교차 검증
    const c4FeTexts = new Set(flatData.filter(d => d.itemCode === 'C4' && d.value?.trim()).map(d => d.value.trim()));
    const chainFeTexts = new Set(failureChains.filter(c => c.feValue?.trim()).map(c => c.feValue!.trim()));
    const a5FmTexts = new Set(flatData.filter(d => d.itemCode === 'A5' && d.value?.trim()).map(d => d.value.trim()));
    const chainFmTexts = new Set(failureChains.filter(c => c.fmValue?.trim()).map(c => c.fmValue!.trim()));
    const b4FcTexts = new Set(flatData.filter(d => d.itemCode === 'B4' && d.value?.trim()).map(d => d.value.trim()));
    const chainFcTexts = new Set(failureChains.filter(c => c.fcValue?.trim()).map(c => c.fcValue!.trim()));

    // FE: C4에 있지만 FC시트에 없는 FE
    const unmatchedFE = [...c4FeTexts].filter(v => !chainFeTexts.has(v));
    if (unmatchedFE.length > 0) {
      const sample = unmatchedFE.slice(0, 3).map(v => `"${v.slice(0, 30)}"`).join(', ');
      warn.error('FE_UNMATCHED', `C4(고장영향) ${unmatchedFE.length}건이 FC시트에 없음 → 고장연결 누락 예상 (예: ${sample})`, undefined,
        `C4=${c4FeTexts.size}건, FC시트FE=${chainFeTexts.size}건`);
    }

    // FM: A5에 있지만 FC시트에 없는 FM
    const unmatchedFM = [...a5FmTexts].filter(v => !chainFmTexts.has(v));
    if (unmatchedFM.length > 0) {
      const sample = unmatchedFM.slice(0, 3).map(v => `"${v.slice(0, 30)}"`).join(', ');
      warn.warn('FM_UNMATCHED', `A5(고장형태) ${unmatchedFM.length}건이 FC시트에 없음 (예: ${sample})`, undefined,
        `A5=${a5FmTexts.size}건, FC시트FM=${chainFmTexts.size}건`);
    }

    // FC: B4에 있지만 FC시트에 없는 FC
    const unmatchedFC = [...b4FcTexts].filter(v => !chainFcTexts.has(v));
    if (unmatchedFC.length > 0) {
      const sample = unmatchedFC.slice(0, 3).map(v => `"${v.slice(0, 30)}"`).join(', ');
      warn.warn('FC_UNMATCHED', `B4(고장원인) ${unmatchedFC.length}건이 FC시트에 없음 (예: ${sample})`, undefined,
        `B4=${b4FcTexts.size}건, FC시트FC=${chainFcTexts.size}건`);
    }

    // 역방향: FC시트에만 있고 메인시트에 없는 항목
    const reverseUnmatchedFE = [...chainFeTexts].filter(v => !c4FeTexts.has(v));
    if (reverseUnmatchedFE.length > 0) {
      warn.warn('FE_ONLY_IN_FC', `FC시트 FE ${reverseUnmatchedFE.length}건이 C4시트에 없음 — 템플릿 C4 데이터 보충 필요`);
    }

    // 종합 정합성 리포트
    const feOk = unmatchedFE.length === 0 && reverseUnmatchedFE.length === 0;
    const fmOk = unmatchedFM.length === 0;
    const fcOk = unmatchedFC.length === 0;
    if (feOk && fmOk && fcOk) {
      warn.info('FC_MATCH_OK', `FE:FM:FC 매칭 100% — C4=${c4FeTexts.size}, A5=${a5FmTexts.size}, B4=${b4FcTexts.size}, FC시트=${failureChains.length}행`);
    } else {
      warn.error('FC_MATCH_NG', `FE:FM:FC 매칭 불일치 — FE미매칭=${unmatchedFE.length}, FM미매칭=${unmatchedFM.length}, FC미매칭=${unmatchedFC.length} → 엑셀 수정 후 재Import 필요`);
    }
  }

  return { flatData, failureChains };
}

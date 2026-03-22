/**
 * @file buildAtomicDB.ts
 * @description ImportedFlatData[] → FMEAWorksheetDB 직접 변환
 *
 * buildWorksheetState() + migrateToAtomicDB() 2단계를 1단계로 통합.
 * 모든 엔티티의 UUID를 1회 확정하고, FK를 같은 함수 스코프 내에서 할당.
 *
 * 3축 잠금 원리:
 *   processNo → L2 행 (어떤 공정)
 *   m4        → L3 행 (어떤 작업요소)
 *   itemCode  → 열   (어떤 데이터 컬럼)
 *
 * Phase 1 (구조): A1/A2→L2Structure, B1+4M→L3Structure, C1→L1Structure
 * Phase 2 (기능+고장): A3/A4→L2Function+ProcessProductChar, A5→FM,
 *          B2/B3→L3Function, B4→FC, C2/C3→L1Function, C4→FE
 * Phase 3 (확정 상태): confirmed 플래그 설정
 *
 * ★ CRITICAL RULES:
 *   1. A4(ProductChar)는 공정 단위 1회 생성 — 카테시안 복제 절대 금지
 *   2. uid()는 처음 생성 시에만 호출 — 재생성 절대 금지
 *   3. 모든 FK가 같은 함수 내에서 확정됨 — 외부 조회 불필요
 *   4. processNo 정규화: normalizeProcessNo() 사용
 *   5. specialChar 전파: A4의 specialChar → 모든 참조 엔티티에 복사
 *
 * @created 2026-03-15
 */

import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type {
  FMEAWorksheetDB,
  L1Structure,
  L2Structure,
  L3Structure,
  L1Function,
  L2Function,
  L3Function,
  FailureEffect,
  FailureMode,
  FailureCause,
} from '@/app/(fmea-core)/pfmea/worksheet/schema';
import { uid } from '@/app/(fmea-core)/pfmea/worksheet/schema';
// uuid-generator 삭제됨 (2026-03-22) — uid() 기반 stub
const pad3 = (n: number) => String(n).padStart(3, '0');
const genC1 = (doc: string, div: string) => `${doc}-L1-${div}`;
const genC2 = (doc: string, div: string, seq: number) => `${doc}-L1-${div}-${pad3(seq)}`;
const genC3 = (doc: string, div: string, c2: number, c3: number) => `${doc}-L1-${div}-${pad3(c2)}-${pad3(c3)}`;
const genC4 = (doc: string, div: string, c2: number, c3: number, c4: number) => `${doc}-L1-${div}-${pad3(c2)}-${pad3(c3)}-${pad3(c4)}`;
const genA1 = (doc: string, pno: number) => `${doc}-L2-${pad3(pno)}`;
const genA3 = (doc: string, pno: number, seq: number) => `${doc}-L2-${pad3(pno)}-F-${pad3(seq)}`;
const genA4 = (doc: string, pno: number, seq: number) => `${doc}-L2-${pad3(pno)}-P-${pad3(seq)}`;
const genA5 = (doc: string, pno: number, seq: number) => `${doc}-L2-${pad3(pno)}-M-${pad3(seq)}`;
const genB1 = (doc: string, pno: number, m4: string, seq: number) => `${doc}-L3-${pad3(pno)}-${m4}-${pad3(seq)}`;
const genB2 = (doc: string, pno: number, m4: string, seq: number, fi?: number) => `${doc}-L3-${pad3(pno)}-${m4}-${pad3(seq)}-G${fi && fi > 1 ? `-${pad3(fi)}` : ''}`;
const genB3 = (doc: string, pno: number, m4: string, b1: number, cs: number) => `${doc}-L3-${pad3(pno)}-${m4}-${pad3(b1)}-C-${pad3(cs)}`;
const genB4 = (doc: string, pno: number, m4: string, b1: number, ks: number) => `${doc}-L3-${pad3(pno)}-${m4}-${pad3(b1)}-K-${pad3(ks)}`;
import {
  isCommonProcessNo,
  byCode,
  groupByM4,
  groupByProcessNo,
  mapC1Category,
} from './buildAtomicHelpers';
import type { ProcessProductCharRecord, B1IdMapping } from './buildAtomicHelpers';

// ════════════════════════════════════════════
// Types
// ════════════════════════════════════════════

/** 빌드 진단 통계 */
export interface AtomicBuildDiagnostics {
  l2Count: number;
  l3Count: number;
  l1FuncCount: number;
  l2FuncCount: number;
  l3FuncCount: number;
  pcCount: number;    // ProcessProductChar
  fmCount: number;
  fcCount: number;
  feCount: number;
  warnings: string[];
}

/** 빌드 결과 */
export interface AtomicBuildResult {
  success: boolean;
  db: FMEAWorksheetDB;
  diagnostics: AtomicBuildDiagnostics;
}

// ════════════════════════════════════════════
// Phase 1: 구조 빌드 (L1/L2/L3 Structure)
// ════════════════════════════════════════════

/** L1 완제품 공정 구조 생성 (단일 엔티티) */
function buildL1Structure(fmeaId: string, l1Name: string): L1Structure {
  return {
    id: genC1('PF', 'YP'), fmeaId, name: l1Name || '', confirmed: false,
    rowIndex: 0, colIndex: 0, rowSpan: 1, colSpan: 1,
  };
}

interface L2BuildResult {
  l2Structures: L2Structure[];
  l3Structures: L3Structure[];
  procToL2Id: Map<string, string>;
  procToL3s: Map<string, L3Structure[]>;
  b1IdMaps: Map<string, B1IdMapping>;
}

/**
 * A1/A2 → L2Structure, B1+4M → L3Structure 생성
 * 비유: 공장의 공정라인(L2)과 각 공정의 작업 스테이션(L3)을 등록
 */
function buildStructures(
  fmeaId: string, l1Id: string, byProcess: Map<string, ImportedFlatData[]>,
): L2BuildResult {
  const l2Structures: L2Structure[] = [];
  const l3Structures: L3Structure[] = [];
  const procToL2Id = new Map<string, string>();
  const procToL3s = new Map<string, L3Structure[]>();
  const b1IdMaps = new Map<string, B1IdMapping>();

  // processNo → processName 수집
  const processMap = new Map<string, string>();
  for (const [pNo, items] of byProcess) {
    const a1 = byCode(items, 'A1');
    const a2 = byCode(items, 'A2');
    const b1 = byCode(items, 'B1');
    if (a1.length > 0 || a2.length > 0 || b1.length > 0) {
      const name = a2.length > 0 ? a2[0].value : '';
      if (!processMap.has(pNo)) processMap.set(pNo, name);
      else if (!processMap.get(pNo) && name) processMap.set(pNo, name);
    }
  }

  // processNo 숫자 정렬
  const sorted = [...processMap.entries()].sort((a, b) => {
    const na = parseInt(a[0]) || 0;
    const nb = parseInt(b[0]) || 0;
    return na - nb || a[0].localeCompare(b[0]);
  });

  // L2/L3 생성
  sorted.forEach(([pNo, pName], idx) => {
    const pnoNum = parseInt(pNo) || (idx + 1) * 10;
    const l2Id = genA1('PF', pnoNum);
    const order = pnoNum;
    l2Structures.push({
      id: l2Id, fmeaId, l1Id, no: pNo, name: pName, order,
      rowIndex: idx, colIndex: 1, rowSpan: 1, colSpan: 1,
    });
    procToL2Id.set(pNo, l2Id);

    // B1 → L3Structure (4M 순서 정렬)
    const items = byProcess.get(pNo) || [];
    const b1Items = byCode(items, 'B1');
    const b1IdToL3Id: B1IdMapping = new Map();
    const l3List: L3Structure[] = [];

    if (b1Items.length === 0) {
      // 수동모드 placeholder
      l3List.push({
        id: genB1('PF', pnoNum, '', 1), fmeaId, l1Id, l2Id,
        m4: '' as L3Structure['m4'], name: '', order: 10,
        rowIndex: 0, colIndex: 3, rowSpan: 1, colSpan: 1,
      });
    } else {
      const m4Order: Record<string, number> = { MN: 0, MC: 1, IM: 2, EN: 3 };
      const sortedB1 = [...b1Items].sort((a, b) =>
        (m4Order[a.m4 || ''] ?? 4) - (m4Order[b.m4 || ''] ?? 4)
      );
      // m4별 seq 카운터
      const m4SeqCounter = new Map<string, number>();
      sortedB1.forEach((b1, i) => {
        const m4 = b1.m4 || '';
        const b1seq = (m4SeqCounter.get(m4) || 0) + 1;
        m4SeqCounter.set(m4, b1seq);
        const l3Id = genB1('PF', pnoNum, m4, b1seq);
        if (b1.id) b1IdToL3Id.set(b1.id, l3Id);
        l3List.push({
          id: l3Id, fmeaId, l1Id, l2Id,
          m4: (b1.m4 || '') as L3Structure['m4'], name: b1.value,
          order: (i + 1) * 10, rowIndex: i, colIndex: 3, rowSpan: 1, colSpan: 1,
        });
      });
    }

    l3Structures.push(...l3List);
    procToL3s.set(pNo, l3List);
    b1IdMaps.set(pNo, b1IdToL3Id);
  });

  return { l2Structures, l3Structures, procToL2Id, procToL3s, b1IdMaps };
}

// ════════════════════════════════════════════
// Phase 2: 기능 + 고장 엔티티 빌드
// ════════════════════════════════════════════

/**
 * C2(기능) + C3(요구사항) → L1Function[], C4(고장영향) → FailureEffect[]
 * L1은 글로벌 레벨: 구분(YP/SP/USER)별로 기능/요구사항/고장영향 관리
 */
function buildL1Entities(
  fmeaId: string, l1StructId: string, cItems: ImportedFlatData[],
): { l1Functions: L1Function[]; failureEffects: FailureEffect[] } {
  const l1Functions: L1Function[] = [];
  const failureEffects: FailureEffect[] = [];

  const c1Values = byCode(cItems, 'C1').map(i => i.value).filter(Boolean);
  const allCategories = [...new Set([...c1Values, 'YP', 'SP', 'USER'])];

  for (const cat of allCategories) {
    const div = cat === 'USER' ? 'US' : cat;
    const category = mapC1Category(cat) as L1Function['category'];
    const c2Items = cItems.filter(i => i.itemCode === 'C2' && i.processNo === cat);
    const c3Items = cItems.filter(i => i.itemCode === 'C3' && i.processNo === cat);
    const c4Items = cItems.filter(i => i.itemCode === 'C4' && i.processNo === cat);

    // seq 카운터: C2→c2seq, C3→c3seq (C2 변경 시 리셋), C4→c4seq (C3 변경 시 리셋)
    let c2seq = 0;
    let c3seq = 0;
    let c4seq = 0;

    // ── C2+C3 → L1Function ──
    const funcIds: string[] = [];
    if (c2Items.length === 0 && c3Items.length === 0) {
      c2seq++;
      const funcId = genC2('PF', div, c2seq);
      funcIds.push(funcId);
      l1Functions.push({ id: funcId, fmeaId, l1StructId, category, functionName: '', requirement: '' });
    } else if (c2Items.length === 0) {
      // C3만 있으면 각각 별도 function
      c2seq++;
      c3seq = 0;
      c3Items.forEach(c3 => {
        c3seq++;
        const funcId = genC3('PF', div, c2seq, c3seq);
        funcIds.push(funcId);
        l1Functions.push({ id: funcId, fmeaId, l1StructId, category, functionName: '', requirement: c3.value });
      });
      if (c3Items.length === 0) {
        const funcId = genC2('PF', div, c2seq);
        funcIds.push(funcId);
        l1Functions.push({ id: funcId, fmeaId, l1StructId, category, functionName: '', requirement: '' });
      }
    } else {
      // ★★★ 2026-03-16 FIX: parentItemId UUID 기반 매칭만 사용 (하드코딩/배분 금지)
      c2Items.forEach((c2, i) => {
        c2seq++;
        c3seq = 0;
        const myC3 = c3Items.filter(c3 => c3.parentItemId === `C2-${cat}-${i}`);
        if (myC3.length === 0) {
          const funcId = genC2('PF', div, c2seq);
          funcIds.push(funcId);
          l1Functions.push({ id: funcId, fmeaId, l1StructId, category, functionName: c2.value, requirement: '' });
        } else {
          myC3.forEach(c3 => {
            c3seq++;
            const funcId = genC3('PF', div, c2seq, c3seq);
            funcIds.push(funcId);
            l1Functions.push({ id: funcId, fmeaId, l1StructId, category, functionName: c2.value, requirement: c3.value });
          });
        }
      });

      // orphan C3 (parentItemId 미설정 또는 매칭 안 되는)
      {
        const allParents = new Set(c2Items.map((_, i) => `C2-${cat}-${i}`));
        c3Items.filter(c3 => !c3.parentItemId || !allParents.has(c3.parentItemId)).forEach(c3 => {
          c3seq++;
          const funcId = genC3('PF', div, c2seq, c3seq);
          funcIds.push(funcId);
          l1Functions.push({
            id: funcId, fmeaId, l1StructId, category,
            functionName: c2Items[c2Items.length - 1]?.value || '', requirement: c3.value,
          });
        });
      }
    }

    // ── C4 → FailureEffect (funcIds에 1:1 매칭) ──
    c4seq = 0;
    if (funcIds.length > 0 && c4Items.length > 0) {
      const matched = Math.min(funcIds.length, c4Items.length);
      for (let ri = 0; ri < matched; ri++) {
        c4seq++;
        failureEffects.push({
          id: genC4('PF', div, c2seq, c3seq > 0 ? ri + 1 : 1, c4seq), fmeaId, l1FuncId: funcIds[ri],
          category: category as FailureEffect['category'], effect: c4Items[ri].value, severity: 0,
        });
      }
      // 남은 C4 → 마지막 func
      for (let ei = funcIds.length; ei < c4Items.length; ei++) {
        c4seq++;
        failureEffects.push({
          id: genC4('PF', div, c2seq, c3seq > 0 ? funcIds.length : 1, c4seq), fmeaId, l1FuncId: funcIds[funcIds.length - 1],
          category: category as FailureEffect['category'], effect: c4Items[ei].value, severity: 0,
        });
      }
    }
  }

  return { l1Functions, failureEffects };
}

/**
 * A3→L2Function, A4→ProcessProductChar (공정 단위 1회!), A5→FailureMode
 * ★ CRITICAL: A4는 공정 단위로 1회만 생성 (카테시안 복제 금지)
 */
function buildL2Entities(
  fmeaId: string, l2StructId: string, processItems: ImportedFlatData[],
): { l2Functions: L2Function[]; processProductChars: ProcessProductCharRecord[]; failureModes: FailureMode[] } {
  const l2Functions: L2Function[] = [];
  const processProductChars: ProcessProductCharRecord[] = [];
  const failureModes: FailureMode[] = [];
  const a3Items = byCode(processItems, 'A3');
  const a4Items = byCode(processItems, 'A4');
  const a5Items = byCode(processItems, 'A5');

  // l2StructId에서 공정번호 추출 (PF-L2-040 → 40)
  const pnoMatch = l2StructId.match(/PF-L2-(\d+)/);
  const pnoNum = pnoMatch ? parseInt(pnoMatch[1]) : 0;

  // ★ A4 → ProcessProductChar — 공정 단위 1회 생성 (카테시안 방지)
  const sharedPCs: ProcessProductCharRecord[] = a4Items.map((a4, i) => ({
    id: genA4('PF', pnoNum, i + 1), fmeaId, l2StructId, name: a4.value,
    specialChar: a4.specialChar || '', orderIndex: i,
  }));
  processProductChars.push(...sharedPCs);

  // A3 → L2Function (★ productChars를 embed — route.ts 662행이 func.productChars에서 PC 추출)
  if (a3Items.length > 0) {
    a3Items.forEach((a3, i) => {
      l2Functions.push({
        id: genA3('PF', pnoNum, i + 1), fmeaId, l2StructId, functionName: a3.value,
        productChar: a4Items.length > 0 ? a4Items[0].value : '',
        specialChar: a4Items.length > 0 ? (a4Items[0].specialChar || '') : '',
        productChars: sharedPCs.map(pc => ({ id: pc.id, name: pc.name, specialChar: pc.specialChar, orderIndex: pc.orderIndex })),
      } as L2Function & { productChars: { id: string; name: string; specialChar: string; orderIndex: number }[] });
    });
  } else if (a4Items.length > 0) {
    l2Functions.push({
      id: genA3('PF', pnoNum, 1), fmeaId, l2StructId, functionName: '',
      productChar: a4Items[0].value, specialChar: a4Items[0].specialChar || '',
      productChars: sharedPCs.map(pc => ({ id: pc.id, name: pc.name, specialChar: pc.specialChar, orderIndex: pc.orderIndex })),
    } as L2Function & { productChars: { id: string; name: string; specialChar: string; orderIndex: number }[] });
  }

  // ★★★ 2026-03-16 FIX: A5 → FailureMode (parentItemId FK 기반 꽂아넣기)
  const l2FuncId = l2Functions.length > 0 ? l2Functions[0].id : '';
  let a5seq = 0;
  if (sharedPCs.length > 0 && a5Items.length > 0) {
    // parentItemId가 A4의 id와 일치하면 해당 PC에 연결, 미매칭 시 첫 PC
    const a4IdToPC = new Map<string, ProcessProductCharRecord>();
    a4Items.forEach((a4, i) => {
      if (a4.id && i < sharedPCs.length) a4IdToPC.set(a4.id, sharedPCs[i]);
    });
    for (const a5 of a5Items) {
      a5seq++;
      let targetPC = sharedPCs[0]; // fallback
      if (a5.parentItemId) {
        const mapped = a4IdToPC.get(a5.parentItemId);
        if (mapped) targetPC = mapped;
      }
      failureModes.push({
        id: genA5('PF', pnoNum, a5seq), fmeaId, l2FuncId, l2StructId,
        productCharId: targetPC.id, mode: a5.value, specialChar: Boolean(targetPC.specialChar),
      });
    }
    // ★★★ 2026-03-16 FIX: FM 없는 PC → placeholder는 A5가 0건일 때만 생성
    if (a5Items.length === 0) {
      for (const pc of sharedPCs) {
        a5seq++;
        failureModes.push({
          id: genA5('PF', pnoNum, a5seq), fmeaId, l2FuncId, l2StructId,
          productCharId: pc.id, mode: `${pc.name} 부적합`, specialChar: Boolean(pc.specialChar),
        });
      }
    }
  } else {
    a5Items.forEach(a5 => {
      a5seq++;
      failureModes.push({ id: genA5('PF', pnoNum, a5seq), fmeaId, l2FuncId, l2StructId, mode: a5.value });
    });
  }

  return { l2Functions, processProductChars, failureModes };
}

/**
 * B2→L3Function, B3→processChar, B4→FailureCause
 * parentItemId 기반 WE 매칭 → 폴백: 첫 WE에 전부 꽂아넣기
 */
function buildL3Entities(
  fmeaId: string, l2StructId: string, l3Structures: L3Structure[],
  processItems: ImportedFlatData[], b1IdToL3Id: B1IdMapping,
): { l3Functions: L3Function[]; failureCauses: FailureCause[] } {
  const l3Functions: L3Function[] = [];
  const failureCauses: FailureCause[] = [];
  const b2Items = byCode(processItems, 'B2');
  const b3Items = byCode(processItems, 'B3');
  const b4Items = byCode(processItems, 'B4');

  // L3 UUID → index 룩업
  const l3IdToIdx = new Map<string, number>();
  l3Structures.forEach((l3, idx) => l3IdToIdx.set(l3.id, idx));

  // parentItemId 기반 분류
  function splitByParentId(dataItems: ImportedFlatData[]) {
    const matched = new Map<number, ImportedFlatData[]>();
    const unmatched: ImportedFlatData[] = [];
    for (const item of dataItems) {
      if (item.parentItemId && b1IdToL3Id) {
        const l3Id = b1IdToL3Id.get(item.parentItemId);
        if (l3Id) {
          const l3Idx = l3IdToIdx.get(l3Id);
          if (l3Idx !== undefined) {
            if (!matched.has(l3Idx)) matched.set(l3Idx, []);
            matched.get(l3Idx)!.push(item);
            continue;
          }
        }
      }
      unmatched.push(item);
    }
    return { matched, unmatched };
  }

  const b2Split = splitByParentId(b2Items);
  const b3Split = splitByParentId(b3Items);

  // m4별 WE 그룹핑
  const weByM4 = new Map<string, { l3: L3Structure; globalIdx: number }[]>();
  l3Structures.forEach((l3, idx) => {
    const key = l3.m4 || '';
    if (!weByM4.has(key)) weByM4.set(key, []);
    weByM4.get(key)!.push({ l3, globalIdx: idx });
  });

  const b2ByM4Unmatched = groupByM4(b2Split.unmatched);
  const b3ByM4Unmatched = groupByM4(b3Split.unmatched);

  // processChar 기록 (B4 → processCharId 연결용)
  const pcRecords: { id: string; name: string; l3Idx: number; m4: string }[] = [];

  // l2StructId에서 공정번호 추출 (PF-L2-040 → 40)
  const l2PnoMatch = l2StructId.match(/PF-L2-(\d+)/);
  const l2PnoNum = l2PnoMatch ? parseInt(l2PnoMatch[1]) : 0;

  // L3 → B2(function) seq 카운터 (l3Id별)
  const l3FuncSeqMap = new Map<string, number>();
  // L3 → B3(processChar) seq 카운터 (l3Id별)
  const l3CharSeqMap = new Map<string, number>();

  /** l3.id에서 m4, b1seq 파싱 — PF-L3-040-MC-001 → { m4: 'MC', b1seq: 1 } */
  function parseL3Id(l3Id: string): { m4: string; b1seq: number } {
    const match = l3Id.match(/PF-L3-\d+-([A-Z]*)-(\d+)/);
    if (match) return { m4: match[1], b1seq: parseInt(match[2]) };
    return { m4: '', b1seq: 1 };
  }

  /** L3Function 생성 + processChar 기록 헬퍼 */
  function addL3Func(l3: L3Structure, globalIdx: number, funcName: string, chars: { id: string; name: string; specialChar: string }[]) {
    const { m4, b1seq } = parseL3Id(l3.id);
    // ★★★ 2026-03-16 FIX: B3 자동 생성 제거 — Import 원본만 저장 (통계 일치 원칙)
    const firstChar = chars[0] || { name: '', specialChar: '' };
    l3Functions.push({
      id: genB2('PF', l2PnoNum, m4, b1seq), fmeaId, l3StructId: l3.id, l2StructId,
      functionName: funcName, processChar: firstChar.name, specialChar: firstChar.specialChar,
    });
    chars.slice(1).forEach(ch => {
      const fseq = (l3FuncSeqMap.get(l3.id) || 1) + 1;
      l3FuncSeqMap.set(l3.id, fseq);
      l3Functions.push({
        id: `${genB1('PF', l2PnoNum, m4, b1seq)}-G-${String(fseq).padStart(3, '0')}`, fmeaId, l3StructId: l3.id, l2StructId,
        functionName: funcName, processChar: ch.name, specialChar: ch.specialChar,
      });
    });
    chars.forEach(ch => pcRecords.push({ id: ch.id, name: ch.name, l3Idx: globalIdx, m4: l3.m4 || '' }));
  }

  // ── 각 L3(WE)별 L3Function 생성 ──
  for (const [m4Key, wes] of weByM4) {
    const m4B2Unmatched = b2ByM4Unmatched.get(m4Key) || [];
    const m4B3Unmatched = b3ByM4Unmatched.get(m4Key) || [];
    // parentItemId 매칭 + unmatched는 첫 WE에 꽂기
    wes.forEach(({ l3, globalIdx }, weIdx) => {
      const parentB2 = b2Split.matched.get(globalIdx) || [];
      const parentB3 = b3Split.matched.get(globalIdx) || [];
      // unmatched는 첫 WE에만 할당
      const myB2 = weIdx === 0 ? [...parentB2, ...m4B2Unmatched] : [...parentB2];
      const myB3 = weIdx === 0 ? [...parentB3, ...m4B3Unmatched] : [...parentB3];

      const { m4: weM4, b1seq: weB1seq } = parseL3Id(l3.id);
      if (myB2.length > 0) {
        if (myB2.length === 1) {
          const chars = myB3.map((b3, ci) => {
            const cseq = (l3CharSeqMap.get(l3.id) || 0) + 1;
            l3CharSeqMap.set(l3.id, cseq);
            return { id: genB3('PF', l2PnoNum, weM4, weB1seq, cseq), name: b3.value, specialChar: b3.specialChar || '' };
          });
          addL3Func(l3, globalIdx, myB2[0].value, chars);
        } else {
          // 여러 B2: 첫 B2에 모든 B3 꽂기
          myB2.forEach((b2, fIdx) => {
            const chars = fIdx === 0
              ? myB3.map((b3, ci) => {
                  const cseq = (l3CharSeqMap.get(l3.id) || 0) + 1;
                  l3CharSeqMap.set(l3.id, cseq);
                  return { id: genB3('PF', l2PnoNum, weM4, weB1seq, cseq), name: b3.value, specialChar: b3.specialChar || '' };
                })
              : [];
            addL3Func(l3, globalIdx, b2.value, chars);
          });
        }
      } else if (myB3.length > 0) {
        const chars = myB3.map((b3, ci) => {
          const cseq = (l3CharSeqMap.get(l3.id) || 0) + 1;
          l3CharSeqMap.set(l3.id, cseq);
          return { id: genB3('PF', l2PnoNum, weM4, weB1seq, cseq), name: b3.value, specialChar: b3.specialChar || '' };
        });
        addL3Func(l3, globalIdx, '', chars);
      } else {
        // placeholder
        l3Functions.push({
          id: genB2('PF', l2PnoNum, weM4, weB1seq), fmeaId, l3StructId: l3.id, l2StructId,
          functionName: '', processChar: '',
        });
        // ★★★ 2026-03-16 FIX: B3 자동 생성 제거 — Import 원본만 저장
      }
    });
  }

  // ── B4 → FailureCause (parentItemId FK 기반 꽂아넣기) ──
  const b4ByM4 = groupByM4(b4Items);
  const pcByM4 = new Map<string, typeof pcRecords>();
  for (const pc of pcRecords) {
    if (!pcByM4.has(pc.m4)) pcByM4.set(pc.m4, []);
    pcByM4.get(pc.m4)!.push(pc);
  }

  // B4 kseq 카운터 (l3Id별)
  const b4KseqMap = new Map<string, number>();

  const unmatchedB4: ImportedFlatData[] = [];
  for (const [m4Key, m4B4] of b4ByM4) {
    const m4PCs = pcByM4.get(m4Key) || [];
    if (m4PCs.length > 0 && m4B4.length > 0) {
      const pcIdSet = new Set(m4PCs.map(pc => pc.id));
      for (let bi = 0; bi < m4B4.length; bi++) {
        const b4 = m4B4[bi];
        let targetPc = m4PCs[Math.min(bi, m4PCs.length - 1)];
        if (b4.parentItemId && pcIdSet.has(b4.parentItemId)) {
          targetPc = m4PCs.find(pc => pc.id === b4.parentItemId) || targetPc;
        }
        const l3ForPc = l3Structures[targetPc.l3Idx];
        const l3FuncForPc = l3Functions.find(f => f.l3StructId === l3ForPc?.id);
        const l3Id = l3ForPc?.id || '';
        const { m4: fcM4, b1seq: fcB1seq } = parseL3Id(l3Id);
        const kseq = (b4KseqMap.get(l3Id) || 0) + 1;
        b4KseqMap.set(l3Id, kseq);
        failureCauses.push({
          id: genB4('PF', l2PnoNum, fcM4, fcB1seq, kseq), fmeaId, l3FuncId: l3FuncForPc?.id || '',
          l3StructId: l3Id, l2StructId,
          processCharId: targetPc.id, cause: b4.value, occurrence: 0,
        });
      }
    } else if (m4PCs.length === 0 && m4B4.length > 0) {
      unmatchedB4.push(...m4B4);
    }
  }

  // ★★★ 2026-03-16 FIX: m4 불일치 B4 → 첫 PC에 전부 꽂아넣기 (배분 금지)
  if (unmatchedB4.length > 0 && pcRecords.length > 0) {
    const firstPc = pcRecords[0];
    const l3ForPc = l3Structures[firstPc.l3Idx];
    const l3FuncForPc = l3Functions.find(f => f.l3StructId === l3ForPc?.id);
    const l3Id = l3ForPc?.id || '';
    const { m4: umM4, b1seq: umB1seq } = parseL3Id(l3Id);
    for (const b4 of unmatchedB4) {
      const kseq = (b4KseqMap.get(l3Id) || 0) + 1;
      b4KseqMap.set(l3Id, kseq);
      failureCauses.push({
        id: genB4('PF', l2PnoNum, umM4, umB1seq, kseq), fmeaId, l3FuncId: l3FuncForPc?.id || '',
        l3StructId: l3Id, l2StructId,
        processCharId: firstPc.id, cause: b4.value, occurrence: 0,
      });
    }
  } else if (unmatchedB4.length > 0) {
    const firstL3 = l3Structures[0];
    const firstL3Func = l3Functions.find(f => f.l3StructId === firstL3?.id);
    const l3Id = firstL3?.id || '';
    const { m4: umM4, b1seq: umB1seq } = parseL3Id(l3Id);
    for (const b4 of unmatchedB4) {
      const kseq = (b4KseqMap.get(l3Id) || 0) + 1;
      b4KseqMap.set(l3Id, kseq);
      failureCauses.push({
        id: genB4('PF', l2PnoNum, umM4, umB1seq, kseq), fmeaId, l3FuncId: firstL3Func?.id || '',
        l3StructId: l3Id, l2StructId, cause: b4.value, occurrence: 0,
      });
    }
  }

  // ★★★ 2026-03-16 FIX: orphan processChar → placeholder FC는 B4가 0건일 때만 생성
  // B4 항목이 존재하나 parentItemId 미설정으로 첫 PC에 몰린 경우,
  // 나머지 PC에 거짓 placeholder FC 생성하면 안 됨
  const linkedPcIds = new Set(failureCauses.map(fc => fc.processCharId).filter(Boolean));
  if (b4Items.length === 0) {
  for (const pc of pcRecords) {
    if (pc.name && !linkedPcIds.has(pc.id)) {
      const l3ForPc = l3Structures[pc.l3Idx];
      const l3FuncForPc = l3Functions.find(f => f.l3StructId === l3ForPc?.id);
      const l3Id = l3ForPc?.id || '';
      const { m4: phM4, b1seq: phB1seq } = parseL3Id(l3Id);
      const kseq = (b4KseqMap.get(l3Id) || 0) + 1;
      b4KseqMap.set(l3Id, kseq);
      failureCauses.push({
        id: genB4('PF', l2PnoNum, phM4, phB1seq, kseq), fmeaId, l3FuncId: l3FuncForPc?.id || '',
        l3StructId: l3Id, l2StructId,
        processCharId: pc.id, cause: `${pc.name} 부적합`, occurrence: 0,
      });
    }
  } // if (b4Items.length === 0)
  }

  return { l3Functions, failureCauses };
}

// ════════════════════════════════════════════
// Main: buildAtomicDB
// ════════════════════════════════════════════

/**
 * ImportedFlatData[] → FMEAWorksheetDB 직접 변환
 *
 * 비유: 엑셀 데이터를 DB 테이블 레코드로 직접 변환하는 "원스톱 공장".
 *       중간 가공(WorksheetState)을 거치지 않고, 원자 DB 레코드를 바로 생산.
 *
 * @param flatData - Import된 flat 데이터 배열
 * @param fmeaId - FMEA 프로젝트 ID
 * @param _chains - (선택) 고장사슬 데이터 — 현재 미사용, 호출측에서 별도 처리
 * @returns AtomicBuildResult — FMEAWorksheetDB + 진단 통계
 */
export function buildAtomicDB(
  flatData: ImportedFlatData[],
  fmeaId: string,
  _chains?: MasterFailureChain[],
): AtomicBuildResult {
  const warnings: string[] = [];
  const emptyDB: FMEAWorksheetDB = {
    fmeaId, savedAt: new Date().toISOString(),
    l1Structure: null, l2Structures: [], l3Structures: [],
    l1Functions: [], l2Functions: [], l3Functions: [],
    processProductChars: [],
    failureEffects: [], failureModes: [], failureCauses: [],
    failureLinks: [], failureAnalyses: [], riskAnalyses: [], optimizations: [],
    confirmed: {
      structure: false, l1Function: false, l2Function: false, l3Function: false,
      l1Failure: false, l2Failure: false, l3Failure: false,
      failureLink: false, risk: false, optimization: false,
    },
  };

  if (flatData.length === 0) {
    return {
      success: false, db: emptyDB,
      diagnostics: {
        l2Count: 0, l3Count: 0, l1FuncCount: 0, l2FuncCount: 0,
        l3FuncCount: 0, pcCount: 0, fmCount: 0, fcCount: 0, feCount: 0,
        warnings: ['데이터 없음'],
      },
    };
  }

  // ── 공통공정 조건부 필터 ──
  const commonItems = flatData.filter(d => isCommonProcessNo(d.processNo || ''));
  const hasRealCommon = commonItems.some(d =>
    d.itemCode === 'A5' || d.itemCode === 'B4' || d.itemCode === 'A3' || d.itemCode === 'B2'
  );
  const filtered = hasRealCommon
    ? flatData
    : flatData.filter(d => !isCommonProcessNo(d.processNo || ''));

  const byProcess = groupByProcessNo(filtered);
  const cItems = filtered.filter(i => i.category === 'C');

  // ══════ Phase 1: 구조 빌드 ══════
  const l1 = buildL1Structure(fmeaId, '');
  const { l2Structures, l3Structures, procToL2Id, procToL3s, b1IdMaps } =
    buildStructures(fmeaId, l1.id, byProcess);

  if (l2Structures.length === 0) warnings.push('공정 데이터(A1/A2)가 없습니다');

  // ══════ Phase 2: 기능 + 고장 엔티티 빌드 ══════
  const { l1Functions, failureEffects } = buildL1Entities(fmeaId, l1.id, cItems);

  const allL2Funcs: L2Function[] = [];
  const allL3Funcs: L3Function[] = [];
  const allFMs: FailureMode[] = [];
  const allFCs: FailureCause[] = [];
  const allPCs: ProcessProductCharRecord[] = [];

  for (const [pNo] of byProcess) {
    const l2Id = procToL2Id.get(pNo);
    if (!l2Id) continue;
    const processItems = byProcess.get(pNo) || [];
    const l3sForProc = procToL3s.get(pNo) || [];
    const b1Map = b1IdMaps.get(pNo) || new Map();

    const { l2Functions, processProductChars, failureModes } = buildL2Entities(fmeaId, l2Id, processItems);
    allL2Funcs.push(...l2Functions);
    allPCs.push(...processProductChars);
    allFMs.push(...failureModes);

    const { l3Functions, failureCauses } = buildL3Entities(fmeaId, l2Id, l3sForProc, processItems, b1Map);
    allL3Funcs.push(...l3Functions);
    allFCs.push(...failureCauses);
  }

  // ══════ Phase 3: 확정 상태 + DB 조립 ══════
  const db: FMEAWorksheetDB = {
    fmeaId, savedAt: new Date().toISOString(),
    l1Structure: l1, l2Structures, l3Structures,
    l1Functions, l2Functions: allL2Funcs, l3Functions: allL3Funcs,
    failureEffects, failureModes: allFMs, failureCauses: allFCs,
    processProductChars: [], // 제품특성 — 호출측에서 별도 처리
    failureLinks: [],       // chains 기반 → 호출측에서 별도 처리
    failureAnalyses: [],    // 워크시트에서 고장연결 후 생성
    riskAnalyses: [], optimizations: [],
    confirmed: {
      structure: l2Structures.length > 0,
      l1Function: l1Functions.some(f => f.functionName || f.requirement),
      l2Function: allL2Funcs.some(f => f.functionName),
      l3Function: allL3Funcs.some(f => f.functionName || f.processChar),
      l1Failure: failureEffects.some(fe => fe.effect),
      l2Failure: allFMs.some(fm => fm.mode),
      l3Failure: allFCs.some(fc => fc.cause),
      failureLink: false, risk: false, optimization: false,
    },
  };

  return {
    success: true, db,
    diagnostics: {
      l2Count: l2Structures.length, l3Count: l3Structures.length,
      l1FuncCount: l1Functions.length, l2FuncCount: allL2Funcs.length,
      l3FuncCount: allL3Funcs.length, pcCount: allPCs.length,
      fmCount: allFMs.length, fcCount: allFCs.length, feCount: failureEffects.length,
      warnings,
    },
  };
}

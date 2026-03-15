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
import {
  isCommonProcessNo,
  byCode,
  groupByM4,
  groupByProcessNo,
  distribute,
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
    id: uid(), fmeaId, name: l1Name || '', confirmed: false,
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
    const l2Id = uid();
    const order = parseInt(pNo) || (idx + 1) * 10;
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
        id: uid(), fmeaId, l1Id, l2Id,
        m4: '' as L3Structure['m4'], name: '', order: 10,
        rowIndex: 0, colIndex: 3, rowSpan: 1, colSpan: 1,
      });
    } else {
      const m4Order: Record<string, number> = { MN: 0, MC: 1, IM: 2, EN: 3 };
      const sortedB1 = [...b1Items].sort((a, b) =>
        (m4Order[a.m4 || ''] ?? 4) - (m4Order[b.m4 || ''] ?? 4)
      );
      sortedB1.forEach((b1, i) => {
        const l3Id = uid();
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
    const category = mapC1Category(cat) as L1Function['category'];
    const c2Items = cItems.filter(i => i.itemCode === 'C2' && i.processNo === cat);
    const c3Items = cItems.filter(i => i.itemCode === 'C3' && i.processNo === cat);
    const c4Items = cItems.filter(i => i.itemCode === 'C4' && i.processNo === cat);

    // ── C2+C3 → L1Function ──
    const funcIds: string[] = [];
    if (c2Items.length === 0 && c3Items.length === 0) {
      const funcId = uid();
      funcIds.push(funcId);
      l1Functions.push({ id: funcId, fmeaId, l1StructId, category, functionName: '', requirement: '' });
    } else if (c2Items.length === 0) {
      // C3만 있으면 각각 별도 function
      c3Items.forEach(c3 => {
        const funcId = uid();
        funcIds.push(funcId);
        l1Functions.push({ id: funcId, fmeaId, l1StructId, category, functionName: '', requirement: c3.value });
      });
      if (c3Items.length === 0) {
        const funcId = uid();
        funcIds.push(funcId);
        l1Functions.push({ id: funcId, fmeaId, l1StructId, category, functionName: '', requirement: '' });
      }
    } else {
      // C2 + C3 parentItemId 기반 매칭 → 폴백 distribute
      const hasParentIds = c3Items.some(c3 => c3.parentItemId && c3.parentItemId !== `C2-${cat}-0`);
      const c3Dist = distribute(c3Items, c2Items.length);

      c2Items.forEach((c2, i) => {
        const myC3 = hasParentIds
          ? c3Items.filter(c3 => c3.parentItemId === `C2-${cat}-${i}`)
          : (c3Dist[i] || []);
        if (myC3.length === 0) {
          const funcId = uid();
          funcIds.push(funcId);
          l1Functions.push({ id: funcId, fmeaId, l1StructId, category, functionName: c2.value, requirement: '' });
        } else {
          myC3.forEach(c3 => {
            const funcId = uid();
            funcIds.push(funcId);
            l1Functions.push({ id: funcId, fmeaId, l1StructId, category, functionName: c2.value, requirement: c3.value });
          });
        }
      });

      // orphan C3 (parentItemId 매칭 안 되는)
      if (hasParentIds) {
        const allParents = new Set(c2Items.map((_, i) => `C2-${cat}-${i}`));
        c3Items.filter(c3 => !allParents.has(c3.parentItemId || '')).forEach(c3 => {
          const funcId = uid();
          funcIds.push(funcId);
          l1Functions.push({
            id: funcId, fmeaId, l1StructId, category,
            functionName: c2Items[c2Items.length - 1]?.value || '', requirement: c3.value,
          });
        });
      }
    }

    // ── C4 → FailureEffect (funcIds에 1:1 매칭) ──
    if (funcIds.length > 0 && c4Items.length > 0) {
      const matched = Math.min(funcIds.length, c4Items.length);
      for (let ri = 0; ri < matched; ri++) {
        failureEffects.push({
          id: uid(), fmeaId, l1FuncId: funcIds[ri],
          category: category as FailureEffect['category'], effect: c4Items[ri].value, severity: 0,
        });
      }
      // 남은 C4 → 마지막 func
      for (let ei = funcIds.length; ei < c4Items.length; ei++) {
        failureEffects.push({
          id: uid(), fmeaId, l1FuncId: funcIds[funcIds.length - 1],
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

  // ★ A4 → ProcessProductChar — 공정 단위 1회 생성 (카테시안 방지)
  const sharedPCs: ProcessProductCharRecord[] = a4Items.map((a4, i) => ({
    id: uid(), fmeaId, l2StructId, name: a4.value,
    specialChar: a4.specialChar || '', orderIndex: i,
  }));
  processProductChars.push(...sharedPCs);

  // A3 → L2Function
  if (a3Items.length > 0) {
    a3Items.forEach(a3 => {
      l2Functions.push({
        id: uid(), fmeaId, l2StructId, functionName: a3.value,
        productChar: a4Items.length > 0 ? a4Items[0].value : '',
        specialChar: a4Items.length > 0 ? (a4Items[0].specialChar || '') : '',
      });
    });
  } else if (a4Items.length > 0) {
    l2Functions.push({
      id: uid(), fmeaId, l2StructId, functionName: '',
      productChar: a4Items[0].value, specialChar: a4Items[0].specialChar || '',
    });
  }

  // A5 → FailureMode (A4 제품특성에 균등 배분)
  const l2FuncId = l2Functions.length > 0 ? l2Functions[0].id : '';
  if (sharedPCs.length > 0 && a5Items.length > 0) {
    const a5Dist = distribute(a5Items, sharedPCs.length);
    sharedPCs.forEach((pc, i) => {
      a5Dist[i].forEach(a5 => {
        failureModes.push({
          id: uid(), fmeaId, l2FuncId, l2StructId,
          productCharId: pc.id, mode: a5.value, specialChar: Boolean(pc.specialChar),
        });
      });
    });
    // FM 없는 PC → placeholder
    const linkedPCIds = new Set(failureModes.map(fm => fm.productCharId).filter(Boolean));
    for (const pc of sharedPCs) {
      if (pc.name && !linkedPCIds.has(pc.id)) {
        failureModes.push({
          id: uid(), fmeaId, l2FuncId, l2StructId,
          productCharId: pc.id, mode: `${pc.name} 부적합`, specialChar: Boolean(pc.specialChar),
        });
      }
    }
  } else {
    a5Items.forEach(a5 => {
      failureModes.push({ id: uid(), fmeaId, l2FuncId, l2StructId, mode: a5.value });
    });
  }

  return { l2Functions, processProductChars, failureModes };
}

/**
 * B2→L3Function, B3→processChar, B4→FailureCause
 * parentItemId 기반 WE 매칭 → 폴백: m4 기반 distribute
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

  /** L3Function 생성 + processChar 기록 헬퍼 */
  function addL3Func(l3: L3Structure, globalIdx: number, funcName: string, chars: { id: string; name: string; specialChar: string }[]) {
    if (chars.length === 0 && l3.name) {
      chars.push({ id: uid(), name: `${l3.name} 관리 특성`, specialChar: '' });
    }
    const firstChar = chars[0] || { name: '', specialChar: '' };
    l3Functions.push({
      id: uid(), fmeaId, l3StructId: l3.id, l2StructId,
      functionName: funcName, processChar: firstChar.name, specialChar: firstChar.specialChar,
    });
    chars.slice(1).forEach(ch => {
      l3Functions.push({
        id: uid(), fmeaId, l3StructId: l3.id, l2StructId,
        functionName: funcName, processChar: ch.name, specialChar: ch.specialChar,
      });
    });
    chars.forEach(ch => pcRecords.push({ id: ch.id, name: ch.name, l3Idx: globalIdx, m4: l3.m4 || '' }));
  }

  // ── 각 L3(WE)별 L3Function 생성 ──
  for (const [m4Key, wes] of weByM4) {
    const m4B2Unmatched = b2ByM4Unmatched.get(m4Key) || [];
    const m4B3Unmatched = b3ByM4Unmatched.get(m4Key) || [];
    const b2Dist = m4B2Unmatched.length > 0
      ? distribute(m4B2Unmatched, wes.length) : Array.from({ length: wes.length }, () => [] as ImportedFlatData[]);
    const b3Dist = m4B3Unmatched.length > 0
      ? distribute(m4B3Unmatched, wes.length) : Array.from({ length: wes.length }, () => [] as ImportedFlatData[]);

    wes.forEach(({ l3, globalIdx }, weIdx) => {
      const parentB2 = b2Split.matched.get(globalIdx) || [];
      const parentB3 = b3Split.matched.get(globalIdx) || [];
      const myB2 = [...parentB2, ...b2Dist[weIdx]];
      const myB3 = [...parentB3, ...b3Dist[weIdx]];

      if (myB2.length > 0) {
        if (myB2.length === 1) {
          const chars = myB3.map(b3 => ({ id: uid(), name: b3.value, specialChar: b3.specialChar || '' }));
          addL3Func(l3, globalIdx, myB2[0].value, chars);
        } else {
          const b3PerFunc = distribute(myB3, myB2.length);
          myB2.forEach((b2, fIdx) => {
            const chars = b3PerFunc[fIdx].map(b3 => ({ id: uid(), name: b3.value, specialChar: b3.specialChar || '' }));
            addL3Func(l3, globalIdx, b2.value, chars);
          });
        }
      } else if (myB3.length > 0) {
        const chars = myB3.map(b3 => ({ id: uid(), name: b3.value, specialChar: b3.specialChar || '' }));
        addL3Func(l3, globalIdx, '', chars);
      } else {
        // placeholder
        l3Functions.push({
          id: uid(), fmeaId, l3StructId: l3.id, l2StructId,
          functionName: '', processChar: '',
        });
        if (l3.name) pcRecords.push({ id: uid(), name: `${l3.name} 관리 특성`, l3Idx: globalIdx, m4: l3.m4 || '' });
      }
    });
  }

  // ── B4 → FailureCause (processChar에 균등 배분) ──
  const b4ByM4 = groupByM4(b4Items);
  const pcByM4 = new Map<string, typeof pcRecords>();
  for (const pc of pcRecords) {
    if (!pcByM4.has(pc.m4)) pcByM4.set(pc.m4, []);
    pcByM4.get(pc.m4)!.push(pc);
  }

  const unmatchedB4: ImportedFlatData[] = [];
  for (const [m4Key, m4B4] of b4ByM4) {
    const m4PCs = pcByM4.get(m4Key) || [];
    if (m4PCs.length > 0 && m4B4.length > 0) {
      const b4Dist = distribute(m4B4, m4PCs.length);
      m4PCs.forEach((pc, i) => {
        b4Dist[i].forEach(b4 => {
          const l3ForPc = l3Structures[pc.l3Idx];
          const l3FuncForPc = l3Functions.find(f => f.l3StructId === l3ForPc?.id);
          failureCauses.push({
            id: uid(), fmeaId, l3FuncId: l3FuncForPc?.id || '',
            l3StructId: l3ForPc?.id || '', l2StructId,
            processCharId: pc.id, cause: b4.value, occurrence: 0,
          });
        });
      });
    } else if (m4PCs.length === 0 && m4B4.length > 0) {
      unmatchedB4.push(...m4B4);
    }
  }

  // m4 불일치 B4 → 전체 processChars에 재배분
  if (unmatchedB4.length > 0 && pcRecords.length > 0) {
    const b4Fallback = distribute(unmatchedB4, pcRecords.length);
    pcRecords.forEach((pc, i) => {
      b4Fallback[i].forEach(b4 => {
        const l3ForPc = l3Structures[pc.l3Idx];
        const l3FuncForPc = l3Functions.find(f => f.l3StructId === l3ForPc?.id);
        failureCauses.push({
          id: uid(), fmeaId, l3FuncId: l3FuncForPc?.id || '',
          l3StructId: l3ForPc?.id || '', l2StructId,
          processCharId: pc.id, cause: b4.value, occurrence: 0,
        });
      });
    });
  } else if (unmatchedB4.length > 0) {
    const firstL3 = l3Structures[0];
    const firstL3Func = l3Functions.find(f => f.l3StructId === firstL3?.id);
    for (const b4 of unmatchedB4) {
      failureCauses.push({
        id: uid(), fmeaId, l3FuncId: firstL3Func?.id || '',
        l3StructId: firstL3?.id || '', l2StructId, cause: b4.value, occurrence: 0,
      });
    }
  }

  // orphan processChar → placeholder FC 자동생성
  const linkedPcIds = new Set(failureCauses.map(fc => fc.processCharId).filter(Boolean));
  for (const pc of pcRecords) {
    if (pc.name && !linkedPcIds.has(pc.id)) {
      const l3ForPc = l3Structures[pc.l3Idx];
      const l3FuncForPc = l3Functions.find(f => f.l3StructId === l3ForPc?.id);
      failureCauses.push({
        id: uid(), fmeaId, l3FuncId: l3FuncForPc?.id || '',
        l3StructId: l3ForPc?.id || '', l2StructId,
        processCharId: pc.id, cause: `${pc.name} 부적합`, occurrence: 0,
      });
    }
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

/**
 * @status CODEFREEZE L4 (Pipeline Protection) u{1F512}
 * @freeze_level L4 (Critical - DFMEA Pre-Development Snapshot)
 * @frozen_date 2026-03-30
 * @snapshot_tag codefreeze-v5.0-pre-dfmea-20260330
 * @allowed_changes NONE ???ъ슜??紐낆떆???뱀씤 + full test pass ?꾩닔
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 */
/**
 * @file cellid-to-atomic.ts
 * @description CellId 파싱 결과 → AtomicDB(기존 Prisma 스키마) 변환
 *
 * 기존 스키마(L1Structure, L2Structure, L3Structure, L3Function, FailureMode, FailureCause,
 * FailureEffect, FailureLink, RiskAnalysis)를 유지하면서,
 * CellId를 각 엔티티의 id 필드에 직접 사용한다.
 *
 * 설계 원칙:
 *   - 기존 Prisma 스키마 구조 유지 (마이그레이션 불필요) 
 *   - cellId를 id 필드에 할당 (기존 UUID 대체)
 *   - FK는 cellId 기반 (문자열 명칭 비교 금지)
 *
 * @created 2026-03-25
 */

import type { CellRecord, FCRecord } from './cellid-parser';
import { normalizeProcNo } from './cell-id';
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
  FailureLink,
  RiskAnalysis,
} from '../../app/(fmea-core)/pfmea/worksheet/schema';

// ============================================================
// 변환 함수
// ============================================================

export interface CellIdAtomicParams {
  fmeaId: string;
  l1Name?: string;

  // IL2 파싱 결과
  a1Rows: CellRecord[];
  a4Rows: Array<CellRecord & { charName: string; ccFlag?: string }>;
  a5Rows: Array<CellRecord & { fmText: string; linkedA4CellId: string }>;
  a6Rows: Array<CellRecord & { dcMethod: string }>;

  // IL3 파싱 결과
  b1Rows: Array<CellRecord & { weName: string; category4M: string }>;
  b2Rows: Array<CellRecord & { functionText: string }>;
  b3Rows: Array<CellRecord & { charName: string }>;
  b4Rows: Array<CellRecord & { causeText: string }>;
  b5Rows: Array<CellRecord & { pcMethod: string }>;

  // IL1 파싱 결과
  c1Rows: Array<CellRecord & { c1Category: string }>;
  c4Rows: Array<CellRecord & { effectText: string }>;

  // FC 파싱 결과
  fcRows: FCRecord[];

  // FA 파싱 결과 (SOD/AP)
  faData?: Array<{ fcCellId: string; severity: number; occurrence: number; detection: number; ap: string }>;
}

/**
 * CellId 파싱 결과 → FMEAWorksheetDB (기존 AtomicDB 호환)
 *
 * 기존 스키마의 id 필드에 cellId를 할당하여 위치 인코딩 ID를 사용.
 */
export function cellIdToAtomicDB(params: CellIdAtomicParams): CellIdAtomicResult {
  const { fmeaId, l1Name } = params;

  // ── L1Structure ──────────────────────────────────────
  const l1Id = 'PF-L1-CELLID';
  const l1Structure: L1Structure = {
    id: l1Id,
    fmeaId,
    name: l1Name || '완제품 공정',
  };

  // ── L2Structure (A1: 공정번호) ──────────────────────
  const l2Structures: L2Structure[] = params.a1Rows.map((a1, i) => ({
    id: a1.cellId,
    fmeaId,
    l1Id,
    no: a1.procNo,
    name: a1.value,
    order: i,
  }));

  // ── L3Structure (B1: 작업요소) ──────────────────────
  const l3Structures: L3Structure[] = params.b1Rows.map((b1, i) => {
    // B1의 parentCellId = A1의 cellId = L2Structure.id
    const l2Id = b1.parentCellId;
    return {
      id: b1.cellId,
      fmeaId,
      l1Id,
      l2Id,
      m4: b1.category4M as L3Structure['m4'],
      name: b1.weName,
      order: i,
    };
  });

  // ── L1Function (C4: 고장영향 → L1Function) ─────────
  // C1 category → L1Function.category 매핑
  const scopeToCategory = (cat: string): string => {
    const upper = cat.toUpperCase();
    if (upper === 'YP' || upper.includes('완제품')) return 'YP';
    if (upper === 'SP' || upper.includes('후')) return 'SP';
    return 'USER';
  };

  const l1Functions: L1Function[] = params.c4Rows.map(c4 => {
    // c4.parentCellId = C1의 cellId → c1Category 역추적
    const c1Row = params.c1Rows.find(c1 => c1.cellId === c4.parentCellId);
    const category = c1Row ? scopeToCategory(c1Row.c1Category) : 'USER';
    return {
      id: c4.cellId,
      fmeaId,
      l1StructId: l1Id,
      category,
      functionName: c4.effectText,
      requirement: '',
    };
  });

  // ── L2Function (A4: 제품특성) ──────────────────────
  const l2Functions: L2Function[] = params.a4Rows.map(a4 => ({
    id: a4.cellId,
    fmeaId,
    l2StructId: a4.parentCellId, // A1 cellId = L2Structure.id
    functionName: '', // A3 기능은 별도
    productChar: a4.charName,
    specialChar: a4.ccFlag || '',
  }));

  // ── L3Function (B2+B3: 요소기능+공정특성) ──────────
  // B2와 B3를 같은 WE(B1) 내에서 순서 매칭
  const b2ByB1 = new Map<string, Array<CellRecord & { functionText: string }>>();
  for (const b2 of params.b2Rows) {
    const b1Id = b2.parentCellId;
    if (!b2ByB1.has(b1Id)) b2ByB1.set(b1Id, []);
    b2ByB1.get(b1Id)!.push(b2);
  }
  const b3ByB1 = new Map<string, Array<CellRecord & { charName: string }>>();
  for (const b3 of params.b3Rows) {
    const b1Id = b3.parentCellId;
    if (!b3ByB1.has(b1Id)) b3ByB1.set(b1Id, []);
    b3ByB1.get(b1Id)!.push(b3);
  }

  const l3Functions: L3Function[] = [];
  for (const b1 of params.b1Rows) {
    const b2List = b2ByB1.get(b1.cellId) || [];
    const b3List = b3ByB1.get(b1.cellId) || [];
    const l3StructId = b1.cellId; // B1 cellId = L3Structure.id
    const l2StructId = b1.parentCellId; // A1 cellId = L2Structure.id

    // B3 기준 페어링 (buildAtomicFromFlat와 동일 패턴)
    for (let i = 0; i < b3List.length; i++) {
      const b3 = b3List[i];
      const b2 = i < b2List.length ? b2List[i] : b2List[b2List.length - 1];
      l3Functions.push({
        id: b3.cellId,
        fmeaId,
        l3StructId,
        l2StructId,
        functionName: b2?.value || '',
        processChar: b3.charName,
        specialChar: '',
      });
    }
    // B3보다 B2가 많을 때
    for (let i = b3List.length; i < b2List.length; i++) {
      const b2 = b2List[i];
      l3Functions.push({
        id: b2.cellId,
        fmeaId,
        l3StructId,
        l2StructId,
        functionName: b2.value,
        processChar: '',
        specialChar: '',
      });
    }
  }

  // ── FailureEffect (C4 → FE) ────────────────────────
  const failureEffects: FailureEffect[] = params.c4Rows.map(c4 => {
    const c1Row = params.c1Rows.find(c1 => c1.cellId === c4.parentCellId);
    const category = c1Row ? scopeToCategory(c1Row.c1Category) : 'USER';
    return {
      id: c4.cellId,
      fmeaId,
      l1FuncId: c4.cellId, // L1Function.id = C4.cellId
      category,
      effect: c4.effectText,
      severity: 1,
    };
  });

  // ── FailureMode (A5 → FM) ─────────────────────────
  const failureModes: FailureMode[] = params.a5Rows.map(a5 => ({
    id: a5.cellId,
    fmeaId,
    l2FuncId: a5.linkedA4CellId || a5.parentCellId,
    l2StructId: a5.parentCellId.startsWith('A1_') ? a5.parentCellId : '',
    productCharId: a5.linkedA4CellId || '',
    mode: a5.fmText,
  }));

  // ── FailureCause (B4 → FC) ────────────────────────
  const failureCauses: FailureCause[] = params.b4Rows.map(b4 => {
    // B4의 parentCellId = B1 cellId = L3Structure.id
    const l3StructId = b4.parentCellId;
    // B1의 parentCellId = A1 cellId = L2Structure.id
    const b1Row = params.b1Rows.find(b => b.cellId === l3StructId);
    const l2StructId = b1Row?.parentCellId || '';
    return {
      id: b4.cellId,
      fmeaId,
      l3FuncId: b4.cellId, // ★ B4 자신의 cellId (l3FuncId는 b3 cellId여야 하지만 임시)
      l3StructId,
      l2StructId,
      processCharId: b4.cellId,
      cause: b4.causeText,
    };
  });

  // ── FailureLink (FC → FL) ─────────────────────────
  const failureLinks: FailureLink[] = params.fcRows.map(fc => ({
    id: fc.cellId,
    fmeaId,
    fmId: fc.fmCellId,
    feId: fc.feCellId,
    fcId: fc.causeCellId,
  }));

  // ── RiskAnalysis (FA → RA) ────────────────────────
  const riskAnalyses: RiskAnalysis[] = [];
  if (params.faData) {
    for (const fa of params.faData) {
      const fl = failureLinks.find(l => l.id === fa.fcCellId);
      if (fl) {
        riskAnalyses.push({
          id: `RA_${fa.fcCellId}`,
          fmeaId,
          linkId: fl.id,
          severity: fa.severity,
          occurrence: fa.occurrence,
          detection: fa.detection,
          ap: fa.ap as 'H' | 'M' | 'L',
          preventionControl: '',
          detectionControl: '',
        });
      }
    }
  }

  // ★ 기존 FMEAWorksheetDB와 분리된 CellId 전용 AtomicDB 반환
  // save-position-import에서 사용하는 구조와 호환
  return {
    fmeaId,
    l1Structure,
    l2Structures,
    l3Structures,
    l1Functions,
    l2Functions,
    l3Functions,
    failureEffects,
    failureModes,
    failureCauses,
    failureLinks,
    riskAnalyses,
  };
}

/** cellIdToAtomicDB의 반환 타입 */
export interface CellIdAtomicResult {
  fmeaId: string;
  l1Structure: L1Structure;
  l2Structures: L2Structure[];
  l3Structures: L3Structure[];
  l1Functions: L1Function[];
  l2Functions: L2Function[];
  l3Functions: L3Function[];
  failureEffects: FailureEffect[];
  failureModes: FailureMode[];
  failureCauses: FailureCause[];
  failureLinks: FailureLink[];
  riskAnalyses: RiskAnalysis[];
}

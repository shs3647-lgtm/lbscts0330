/**
 * @file position-parser.ts
 * @description 위치기반 Import 파서 — 5시트 JSON/Excel → PositionAtomicData 직접 반환
 *
 * UUID = 셀 위치. FK = 크로스시트 행번호 직접 참조.
 * flatData/chains 중간계층 없이 DB Atomic 테이블 1:1 매핑.
 *
 * 시트 구조 (m102-position-based.json 기준):
 *   L1: C1(구분), C2(제품기능), C3(요구사항), C4(고장영향)
 *   L2: A1(공정번호), A2(공정명), A3(공정기능), A4(제품특성), SC, A5(고장형태), A6(검출관리)
 *   L3: processNo, m4, B1(작업요소), B2(요소기능), B3(공정특성), SC, B4(고장원인), B5(예방관리)
 *   FC: FE_scope, FE, processNo, FM, m4, WE, FC, PC, DC, S, O, D, AP, L1_origRow, L2_origRow, L3_origRow
 *
 * @created 2026-03-22
 */

import { positionUUID, type SheetCode } from './position-uuid';
import { CrossSheetResolver } from './cross-sheet-resolver';
import type {
  PositionAtomicData,
  PosL1Structure,
  PosL1Function,
  PosL2Structure,
  PosL2Function,
  PosL3Structure,
  PosL3Function,
  PosProcessProductChar,
  PosFailureEffect,
  PosFailureMode,
  PosFailureCause,
  PosFailureLink,
  PosRiskAnalysis,
} from '@/types/position-import';

// ─── JSON 입력 타입 ───

interface SheetRow {
  excelRow: number;
  posId: string;
  cells: Record<string, string>;
  fk?: Record<string, string>;
}

interface SheetData {
  sheetName: string;
  headers: string[];
  rows: SheetRow[];
}

interface PositionBasedJSON {
  sourceId?: string;
  targetId?: string;
  sheets: Record<string, SheetData>;
}

// ─── UUID 컬럼 상수 (시트별 논리 컬럼 번호) ───

/** L1: C4 = 고장영향 = 4번째 컬럼 */
const L1_FE_COL = 4;
/** L1: C2 = 제품기능 = 2번째 컬럼 */
const L1_FUNC_COL = 2;
/** L2: A5 = 고장형태 = 6번째 컬럼 (A1=1,A2=2,A3=3,A4=4,SC=5,A5=6) */
const L2_FM_COL = 6;
/** L2: A3+A4 = 공정기능 = 4번째 컬럼 */
const L2_FUNC_COL = 4;
/** L2: A4 = 제품특성 = 5번째 컬럼 (ProductChar) */
const L2_PC_COL = 5;
/** L3: B4 = 고장원인 = 7번째 컬럼 (pno=1,m4=2,B1=3,B2=4,B3=5,SC=6,B4=7) */
const L3_FC_COL = 7;
/** L3: B2 = 요소기능 = 5번째 컬럼 */
const L3_FUNC_COL = 5;

// ─── 메인 파서 ───

/**
 * 위치기반 JSON → PositionAtomicData 변환
 * @param json m102-position-based.json 형식
 * @returns DB Atomic 테이블 1:1 매핑 데이터
 */
export function parsePositionBasedJSON(json: PositionBasedJSON): PositionAtomicData {
  const fmeaId = json.targetId || json.sourceId || '';
  const l1Sheet = json.sheets['L1'];
  const l2Sheet = json.sheets['L2'];
  const l3Sheet = json.sheets['L3'];
  const fcSheet = json.sheets['FC'];

  if (!l1Sheet || !l2Sheet || !l3Sheet || !fcSheet) {
    throw new Error(`Missing required sheets: L1=${!!l1Sheet} L2=${!!l2Sheet} L3=${!!l3Sheet} FC=${!!fcSheet}`);
  }

  const resolver = new CrossSheetResolver();
  const l1StructId = 'L1-STRUCT';

  // ═══════════════════════════════════════════
  // Sheet 1: L1 (C1-C4) → L1Function + FailureEffect
  // ═══════════════════════════════════════════

  const l1Functions: PosL1Function[] = [];
  const failureEffects: PosFailureEffect[] = [];
  const seenC2: Map<string, string> = new Map(); // C2 text → L1Function id

  for (const row of l1Sheet.rows) {
    const rn = row.excelRow;
    const c1 = row.cells['C1']?.trim() || '';
    const c2 = row.cells['C2']?.trim() || '';
    const c3 = row.cells['C3']?.trim() || '';
    const c4 = row.cells['C4']?.trim() || '';

    // L1Function: 같은 C2 텍스트의 첫 행만 생성
    const c2Key = `${c1}|${c2}`;
    let l1FuncId: string;
    if (!seenC2.has(c2Key)) {
      l1FuncId = positionUUID('L1', rn, L1_FUNC_COL);
      seenC2.set(c2Key, l1FuncId);
      l1Functions.push({
        id: l1FuncId,
        fmeaId,
        l1StructId,
        category: c1,
        functionName: c2,
        requirement: c3,
      });
    } else {
      l1FuncId = seenC2.get(c2Key)!;
    }

    // FailureEffect: 행마다 독립 (C4가 비어있으면 스킵)
    if (c4) {
      const feId = positionUUID('L1', rn, L1_FE_COL);
      failureEffects.push({
        id: feId,
        fmeaId,
        l1FuncId,
        category: c1,
        effect: c4,
        severity: 0, // FC시트에서 채움
      });
      resolver.registerFE(rn, feId, c4, c1);
    }
  }

  // ═══════════════════════════════════════════
  // Sheet 2: L2 (A1-A6) → L2Structure + L2Function + ProductChar + FailureMode
  // ═══════════════════════════════════════════

  const l2Structures: PosL2Structure[] = [];
  const l2Functions: PosL2Function[] = [];
  const processProductChars: PosProcessProductChar[] = [];
  const failureModes: PosFailureMode[] = [];

  const seenPno: Map<string, string> = new Map(); // 공정번호 → L2Structure id
  let l2Order = 0;
  let pcOrderIndex = 0;

  for (const row of l2Sheet.rows) {
    const rn = row.excelRow;
    const a1 = row.cells['A1']?.trim() || '';
    const a2 = row.cells['A2']?.trim() || '';
    const a3 = row.cells['A3']?.trim() || '';
    const a4 = row.cells['A4']?.trim() || '';
    const sc = row.cells['SC']?.trim() || '';
    const a5 = row.cells['A5']?.trim() || '';

    if (!a1) continue;

    // L2Structure: 공정번호별 1개
    let l2Id: string;
    if (!seenPno.has(a1)) {
      l2Id = positionUUID('L2', rn);
      seenPno.set(a1, l2Id);
      l2Structures.push({
        id: l2Id,
        fmeaId,
        l1Id: l1StructId,
        no: a1,
        name: a2,
        order: l2Order++,
      });
    } else {
      l2Id = seenPno.get(a1)!;
    }

    // L2Function: 행마다 독립
    const l2FuncId = positionUUID('L2', rn, L2_FUNC_COL);
    l2Functions.push({
      id: l2FuncId,
      fmeaId,
      l2StructId: l2Id,
      functionName: a3,
      productChar: a4,
      specialChar: sc || undefined,
    });

    // ProcessProductChar: 행마다 독립
    if (a4) {
      const pcId = positionUUID('L2', rn, L2_PC_COL);
      processProductChars.push({
        id: pcId,
        fmeaId,
        l2StructId: l2Id,
        name: a4,
        specialChar: sc || undefined,
        orderIndex: pcOrderIndex++,
      });

      // FailureMode: A5가 있으면 생성
      if (a5) {
        const fmId = positionUUID('L2', rn, L2_FM_COL);
        failureModes.push({
          id: fmId,
          fmeaId,
          l2FuncId,
          l2StructId: l2Id,
          productCharId: pcId,
          mode: a5,
        });
        resolver.registerFM(rn, fmId, a5, a1);
      }
    }
  }

  // ═══════════════════════════════════════════
  // Sheet 3: L3 (B1-B5) → L3Structure + L3Function + FailureCause
  // ═══════════════════════════════════════════

  const l3Structures: PosL3Structure[] = [];
  const l3Functions: PosL3Function[] = [];
  const failureCauses: PosFailureCause[] = [];
  let l3Order = 0;

  for (const row of l3Sheet.rows) {
    const rn = row.excelRow;
    const pno = row.cells['processNo']?.trim() || '';
    const m4 = row.cells['m4']?.trim() || '';
    const b1 = row.cells['B1']?.trim() || '';
    const b2 = row.cells['B2']?.trim() || '';
    const b3 = row.cells['B3']?.trim() || '';
    const sc = row.cells['SC']?.trim() || '';
    const b4 = row.cells['B4']?.trim() || '';

    if (!pno) continue;

    // L3Structure: 행마다 독립
    const l2Id = seenPno.get(pno) || '';
    const l3Id = positionUUID('L3', rn);
    l3Structures.push({
      id: l3Id,
      fmeaId,
      l1Id: l1StructId,
      l2Id,
      m4: m4 || undefined,
      name: b1,
      order: l3Order++,
    });

    // L3Function: 행마다 독립
    const l3FuncId = positionUUID('L3', rn, L3_FUNC_COL);
    l3Functions.push({
      id: l3FuncId,
      fmeaId,
      l3StructId: l3Id,
      l2StructId: l2Id,
      functionName: b2,
      processChar: b3,
      specialChar: sc || undefined,
    });

    // FailureCause: B4가 있으면 생성
    if (b4) {
      const fcId = positionUUID('L3', rn, L3_FC_COL);
      failureCauses.push({
        id: fcId,
        fmeaId,
        l3FuncId,
        l3StructId: l3Id,
        l2StructId: l2Id,
        cause: b4,
      });
      resolver.registerFC(rn, fcId, b4, pno, m4, b1);
    }
  }

  // ═══════════════════════════════════════════
  // Sheet 4: FC (고장사슬) → FailureLink + RiskAnalysis
  // ═══════════════════════════════════════════

  const failureLinks: PosFailureLink[] = [];
  const riskAnalyses: PosRiskAnalysis[] = [];

  // FE severity 업데이트용 Map
  const feSeverityMap = new Map<string, number>();

  for (const row of fcSheet.rows) {
    const rn = row.excelRow;
    const c = row.cells;

    const l1Row = parseInt(c['L1_origRow'] || '', 10) || 0;
    const l2Row = parseInt(c['L2_origRow'] || '', 10) || 0;
    const l3Row = parseInt(c['L3_origRow'] || '', 10) || 0;

    const { feId, fmId, fcId } = resolver.resolve({
      l1Row,
      l2Row,
      l3Row,
      feText: c['FE'] || '',
      fmText: c['FM'] || '',
      fcText: c['FC'] || '',
      processNo: c['processNo'] || '',
      m4: c['m4'] || '',
      workElement: c['WE'] || '',
    });

    const severity = parseInt(c['S'] || '0', 10) || 0;
    const occurrence = parseInt(c['O'] || '0', 10) || 0;
    const detection = parseInt(c['D'] || '0', 10) || 0;
    const ap = c['AP']?.trim() || '';

    // FailureLink
    const flId = positionUUID('FC', rn);
    failureLinks.push({
      id: flId,
      fmeaId,
      fmId,
      feId,
      fcId,
      fmText: c['FM'] || undefined,
      feText: c['FE'] || undefined,
      fcText: c['FC'] || undefined,
      feScope: c['FE_scope'] || undefined,
      fmProcess: c['processNo'] || undefined,
      fcWorkElem: c['WE'] || undefined,
      fcM4: c['m4'] || undefined,
    });

    // RiskAnalysis
    riskAnalyses.push({
      id: `${flId}-RA`,
      fmeaId,
      linkId: flId,
      severity,
      occurrence,
      detection,
      ap,
      preventionControl: c['PC'] || undefined,
      detectionControl: c['DC'] || undefined,
    });

    // FE severity 추적 (최대값)
    if (feId && severity > (feSeverityMap.get(feId) || 0)) {
      feSeverityMap.set(feId, severity);
    }
  }

  // FE severity 업데이트
  for (const fe of failureEffects) {
    fe.severity = feSeverityMap.get(fe.id) || 0;
  }

  // ─── 통계 ───

  const stats: Record<string, number> = {
    l1Functions: l1Functions.length,
    l2Structures: l2Structures.length,
    l3Structures: l3Structures.length,
    l2Functions: l2Functions.length,
    l3Functions: l3Functions.length,
    processProductChars: processProductChars.length,
    failureEffects: failureEffects.length,
    failureModes: failureModes.length,
    failureCauses: failureCauses.length,
    failureLinks: failureLinks.length,
    riskAnalyses: riskAnalyses.length,
    brokenFE: failureLinks.filter(fl => !fl.feId).length,
    brokenFM: failureLinks.filter(fl => !fl.fmId).length,
    brokenFC: failureLinks.filter(fl => !fl.fcId).length,
  };

  return {
    fmeaId,
    l1Structure: { id: l1StructId, fmeaId, name: '' },
    l1Functions,
    l2Structures,
    l2Functions,
    l3Structures,
    l3Functions,
    processProductChars,
    failureEffects,
    failureModes,
    failureCauses,
    failureLinks,
    riskAnalyses,
    stats,
  };
}

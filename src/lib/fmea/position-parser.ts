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
 * **L1/L2/L3_origRow / 각 시트 `excelRow`**: 워크시트 **엑셀 물리 행(1-based)** (= ExcelJS rowNumber, =ROW()).
 * 데이터 전용 0-based 인덱스가 아님.
 *
 * **정답 흐름**: Import 시 엑셀 행을 **기준행**으로 잡아 L1/L2/L3 엔티티를 행 단위로 맵핑하고,
 * FC는 `L1/L2/L3_origRow`로 그 기준행들만 가리켜 **관계(FE–FM–FC 링크)** 만 형성한다.
 *
 * @created 2026-03-22
 */
/**
 * ██████████████████████████████████████████████████████████████████████████
 * ██  CODEFREEZE — 이 파일의 parentId 설정 라인을 절대 제거하지 마세요!  ██
 * ██                                                                     ██
 * ██  모든 엔티티에 parentId: xxxId 형태로 부모 FK가 설정되어 있습니다.  ██
 * ██  이 FK가 DB에 저장되어야 워크시트 렌더링이 100% 동작합니다.        ██
 * ██                                                                     ██
 * ██  수정이 필요하면 사용자 승인 필수.                                  ██
 * ██████████████████████████████████████████████████████████████████████████
 */

import type { Row, Workbook, Worksheet } from 'exceljs';
import { positionUUID, type SheetCode } from './position-uuid';
import { CrossSheetResolver } from './cross-sheet-resolver';
import { normalizeScope } from '@/lib/fmea/scope-constants';
import type {
  PositionAtomicData,
  PosL1Structure,
  PosL1Function,
  PosL1Requirement,
  PosL1Scope,
  PosL2Structure,
  PosL2Function,
  PosL2ProcessNo,
  PosL2ProcessName,
  PosL2SpecialChar,
  PosL3Structure,
  PosL3Function,
  PosL3ProcessChar,
  PosL3ProcessNo,
  PosL3FourM,
  PosL3WorkElement,
  PosL3SpecialChar,
  PosProcessProductChar,
  PosFailureEffect,
  PosFailureMode,
  PosFailureCause,
  PosFailureLink,
  PosRiskAnalysis,
  FmWithoutFailureLinkDiagnostic,
  FcWithoutFailureLinkDiagnostic,
  PositionImportDiagnostics,
} from '@/types/position-import';

// ─── JSON 입력 타입 ───

interface SheetRow {
  /** 워크시트 엑셀 물리 행(1-based). L1/L2/L3 원본행 컬럼 값과 동일 기준이어야 FK가 맞는다. */
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

// ─── Import AutoFix 유틸 ───

interface AutoFixLog { code: string; message: string; row?: number }

/**
 * 파싱 진단 로그 게이트 (Phase 1-2 최적화).
 * - Production(`NODE_ENV=production`)에서는 기본 **무출력** (서버 로그 노이즈 감소).
 * - `POSITION_PARSER_VERBOSE=1` 이면 환경 무관 출력.
 */
function positionParserVerboseLogsEnabled(): boolean {
  if (typeof process === 'undefined') return false;
  if (process.env.POSITION_PARSER_VERBOSE === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

function ppLog(...args: unknown[]): void {
  if (positionParserVerboseLogsEnabled()) console.log(...args);
}

function ppWarn(...args: unknown[]): void {
  if (positionParserVerboseLogsEnabled()) console.warn(...args);
}

/**
 * FC 시트 L1/L2/L3 원본행이 **해당 시트에 실제 존재하는 excelRow 범위**인지 검증 (Phase 3-1).
 * 실패 시 0 → CrossSheetResolver가 빈 FK 반환(기존 FL 진단 흐름과 동일).
 */
function validateFcOrigRow(
  raw: number,
  maxOnSheet: number,
  label: 'L1' | 'L2' | 'L3',
  fcExcelRow: number,
): number {
  if (!raw) return 0;
  if (raw < 2) {
    ppWarn(`[position-parser] FC R${fcExcelRow}: invalid ${label}_origRow=${raw} (expect ≥2, 헤더 제외)`);
    return 0;
  }
  if (maxOnSheet > 0 && raw > maxOnSheet) {
    ppWarn(
      `[position-parser] FC R${fcExcelRow}: ${label}_origRow=${raw} exceeds ${label} sheet max excelRow=${maxOnSheet}`,
    );
    return 0;
  }
  return raw;
}

// C1 scope 정규화 — normalizeScope from @/lib/fmea/scope-constants (상단 import)

/** 4M 자동정규화 — ★v5: MT(Material) 추가, IM→MT 호환 매핑 */
function normalizeM4(raw: string): string {
  const u = raw.toUpperCase().trim();
  if (u === 'MN' || u === 'MAN' || u.includes('사람') || u.includes('작업자')) return 'MN';
  if (u === 'MC' || u === 'MACHINE' || u.includes('설비') || u.includes('기계')) return 'MC';
  if (u === 'EN' || u === 'ENVIRONMENT' || u.includes('환경')) return 'EN';
  if (u === 'MT' || u === 'IM' || u === 'MATERIAL' || u.includes('재료') || u.includes('자재')) return 'MT';
  return u || 'MN';
}

/** 공정번호 자동정규화 — 선행0 유지, 숫자만 추출 */
function normalizeProcessNo(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // 숫자만 포함된 경우 그대로 반환 (선행0 유지)
  if (/^\d+$/.test(trimmed)) return trimmed;
  // 숫자 추출
  const nums = trimmed.match(/\d+/);
  return nums ? nums[0] : trimmed;
}

/**
 * L2 시트 병합셀 대응: 빈 A1·A2…A6은 동일 공정 블록 내 이전 행 값을 상속 (L3·FC carry와 동일 계열).
 * 공정번호(A1)가 바뀌면 A2~A6 carry 버킷을 리셋해 이전 공정의 검출관리 등이 새 공정으로 새지 않게 함.
 * 통계의 excelA* 는 호출부에서 **carry 전 원본 행**으로 계산해야 물리 셀 수와 일치함.
 */
function applyL2RowCarryForward(rows: SheetRow[]): SheetRow[] {
  let prevL2Pno = '';
  let prevA2 = '';
  let prevA3 = '';
  let prevA4 = '';
  let prevL2SC = '';
  let prevA5 = '';
  let prevA6 = '';
  const l2CarryCount = { a1: 0, a2: 0, a3: 0, a4: 0, sc: 0, a5: 0, a6: 0 };
  const out: SheetRow[] = [];

  for (const row of rows) {
    const rawA1 = row.cells.A1?.trim() || '';
    if (rawA1) {
      const np = normalizeProcessNo(rawA1);
      if (prevL2Pno && np !== prevL2Pno) {
        prevA2 = '';
        prevA3 = '';
        prevA4 = '';
        prevL2SC = '';
        prevA5 = '';
        prevA6 = '';
      }
      prevL2Pno = np;
    }

    const a1 = rawA1
      ? normalizeProcessNo(rawA1)
      : (prevL2Pno ? (l2CarryCount.a1++, prevL2Pno) : '');
    if (!a1) continue;

    const rawA2 = row.cells.A2?.trim() || '';
    const rawA3 = row.cells.A3?.trim() || '';
    const rawA4 = row.cells.A4?.trim() || '';
    const rawSC = row.cells.SC?.trim() || '';
    const rawA5 = row.cells.A5?.trim() || '';
    const rawA6 = row.cells.A6?.trim() || '';

    const a2 = rawA2 || (prevA2 ? (l2CarryCount.a2++, prevA2) : '');
    const a3 = rawA3 || (prevA3 ? (l2CarryCount.a3++, prevA3) : '');
    const a4 = rawA4 || (prevA4 ? (l2CarryCount.a4++, prevA4) : '');
    const sc = rawSC || (prevL2SC ? (l2CarryCount.sc++, prevL2SC) : '');
    const a5 = rawA5 || (prevA5 ? (l2CarryCount.a5++, prevA5) : '');
    const a6 = rawA6 || (prevA6 ? (l2CarryCount.a6++, prevA6) : '');

    if (rawA2) prevA2 = rawA2;
    if (rawA3) prevA3 = rawA3;
    if (rawA4) prevA4 = rawA4;
    if (rawSC) prevL2SC = rawSC;
    if (rawA5) prevA5 = rawA5;
    if (rawA6) prevA6 = rawA6;

    out.push({
      excelRow: row.excelRow,
      posId: row.posId,
      cells: { A1: a1, A2: a2, A3: a3, A4: a4, SC: sc, A5: a5, A6: a6 },
      fk: row.fk,
    });
  }

  const totalL2Carry =
    l2CarryCount.a1 +
    l2CarryCount.a2 +
    l2CarryCount.a3 +
    l2CarryCount.a4 +
    l2CarryCount.sc +
    l2CarryCount.a5 +
    l2CarryCount.a6;
  if (totalL2Carry > 0) {
    ppLog(
      `[position-parser] ✅ L2 carry-forward ${totalL2Carry}건:`,
      `A1=${l2CarryCount.a1} A2=${l2CarryCount.a2} A3=${l2CarryCount.a3} A4=${l2CarryCount.a4} SC=${l2CarryCount.sc} A5=${l2CarryCount.a5} A6=${l2CarryCount.a6}`,
    );
  }
  return out;
}

/** 빈값/대시 판별 — "-", "—", "~", "." 등을 빈값으로 취급 */
function isEmptyValue(v: string): boolean {
  return !v || /^[-–—~·.]+$/.test(v.trim());
}

/** AP 자동정규화 — H/M/L만 허용 */
function normalizeAP(raw: string): string {
  const u = raw.toUpperCase().trim();
  if (u === 'H' || u === 'HIGH') return 'H';
  if (u === 'M' || u === 'MEDIUM' || u === 'MED') return 'M';
  if (u === 'L' || u === 'LOW') return 'L';
  return u;
}

// ─── UUID 컬럼 상수 (시트별 논리 컬럼 번호) ───

/** L1: C1 = 구분(scope) = 1번째 컬럼 (★v4: PosL1Scope 독립 UUID) */
const L1_SCOPE_COL = 1;
/** L1: C2 = 제품기능 = 2번째 컬럼 */
const L1_FUNC_COL = 2;
/** L1: C3 = 요구사항 = 3번째 컬럼 (★v4: PosL1Requirement 독립 UUID) */
const L1_REQ_COL = 3;
/** L1: C4 = 고장영향 = 4번째 컬럼 */
const L1_FE_COL = 4;
/** L2: A1 = 공정번호 = 1번째 컬럼 (★v4: PosL2ProcessNo 독립 UUID) */
const L2_PNO_COL = 1;
/** L2: A2 = 공정명 = 2번째 컬럼 (★v4: PosL2ProcessName 독립 UUID) */
const L2_PNAME_COL = 2;
/** L2: A3+A4 = 공정기능 = 4번째 컬럼 */
const L2_FUNC_COL = 4;
/** L2: A4 = 제품특성 = 5번째 컬럼 (ProductChar) */
const L2_PC_COL = 5;
/** L2: A5 = 고장형태 = 6번째 컬럼 (A1=1,A2=2,A3=3,A4=4,SC=5,A5=6) */
const L2_FM_COL = 6;
/** L2: SC = 특별특성 = 7번째 컬럼 (★v4: PosL2SpecialChar 독립 UUID) */
const L2_SC_COL = 7;
/** L3: processNo = 공정번호 = 1번째 컬럼 (★v4: PosL3ProcessNo 독립 UUID) */
const L3_PNO_COL = 1;
/** L3: m4 = 4M = 2번째 컬럼 (★v4: PosL3FourM 독립 UUID) */
const L3_FM4_COL = 2;
/** L3: B1 = 작업요소 = 3번째 컬럼 (★v4: PosL3WorkElement 독립 UUID) */
const L3_WE_COL = 3;
/** L3: B2 = 요소기능 = 5번째 컬럼 */
const L3_FUNC_COL = 5;
/** L3: B3 = 공정특성 = 6번째 컬럼 (★v4: PosL3ProcessChar 독립 UUID) */
const L3_PC_COL = 6;
/** L3: B4 = 고장원인 = 7번째 컬럼 (pno=1,m4=2,B1=3,B2=4,B3=5,SC=6,B4=7) */
const L3_FC_COL = 7;
/** L3: SC = 특별특성 = 8번째 컬럼 (★v4: PosL3SpecialChar 독립 UUID) */
const L3_SC_COL = 8;

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
  const l1Requirements: PosL1Requirement[] = []; // ★v4: C3 독립 엔티티
  const l1Scopes: PosL1Scope[] = [];             // ★v4: C1 구분 독립 엔티티
  const failureEffects: PosFailureEffect[] = [];
  // ★v5: C4 텍스트만으로 FE 중복제거 — 20행=20UUID (지침서 Section 3)
  const seenFE: Map<string, string> = new Map(); // C4 → FE id
  // ★ C1+C2+C3 조합으로 중복제거 — 같은 C2라도 다른 C3 = 다른 L1Function (요구사항 누락 방지)
  const seenC2C3: Map<string, string> = new Map(); // C1|C2|C3 → L1Function id
  let l1ReqOrderIndex = 0;

  const autoFixes: AutoFixLog[] = [];

  for (const row of l1Sheet.rows) {
    const rn = row.excelRow;
    const rawC1 = row.cells['C1']?.trim() || '';
    const c1 = normalizeScope(rawC1); // ★ AutoFix: scope 정규화
    if (c1 !== rawC1 && rawC1) autoFixes.push({ code: 'L1_SCOPE', message: `R${rn}: "${rawC1}"→"${c1}"`, row: rn });
    const c2 = row.cells['C2']?.trim() || '';
    const c3 = row.cells['C3']?.trim() || '';
    const c4 = row.cells['C4']?.trim() || '';

    // ★v4: L1Scope — C1(구분) 독립 엔티티 (c1이 있으면 항상 생성, c2 스킵과 무관)
    if (c1) {
      l1Scopes.push({
        id: positionUUID('L1', rn, L1_SCOPE_COL),
        fmeaId,
        l1StructId,
        parentId: l1StructId,
        scope: c1,
      });
    }

    // ★ AutoFix: C2(제품기능) 빈값/대시 → 스킵 (YOUR PLANT/SHIP TO PLANT 등 빈 placeholder)
    if (isEmptyValue(c2)) {
      autoFixes.push({ code: 'L1_SKIP_EMPTY', message: `R${rn}: C1="${c1}" C2="${c2||''}" → L1Function 스킵`, row: rn });
      continue;
    }

    // L1Function: 같은 C1+C2+C3 조합의 첫 행만 생성 (C3=요구사항 보존)
    const funcKey = `${c1}|${c2}|${c3}`;
    let l1FuncId: string;
    if (!seenC2C3.has(funcKey)) {
      l1FuncId = positionUUID('L1', rn, L1_FUNC_COL);
      seenC2C3.set(funcKey, l1FuncId);
      l1Functions.push({
        id: l1FuncId,
        fmeaId,
        l1StructId,
        parentId: l1StructId, // E-02: L1Function.parentId → L1Structure
        category: c1,
        functionName: c2,
        requirement: c3,
      });
    } else {
      l1FuncId = seenC2C3.get(funcKey)!;
    }

    // ★v4: L1Requirement — C3(요구사항) 독립 엔티티 (행마다, C3가 있으면)
    if (c3) {
      const l1ReqId = positionUUID('L1', rn, L1_REQ_COL);
      l1Requirements.push({
        id: l1ReqId,
        fmeaId,
        l1StructId,
        l1FuncId,
        parentId: l1FuncId, // E-03: L1Requirement.parentId → L1Function
        requirement: c3,
        orderIndex: l1ReqOrderIndex++,
      });
    }

    // ★v5: FailureEffect — C4 텍스트만으로 중복제거 (지침서: 20행=20UUID, 중복 시 오류)
    if (c4) {
      const feKey = c4;
      const existingFeId = seenFE.get(feKey);
      if (!existingFeId) {
        // ★v5: l1ReqId가 있으면 C3(L1Requirement)를 부모로 설정
        const l1ReqId = l1Requirements.length > 0 ? l1Requirements[l1Requirements.length - 1].id : '';
        const feId = positionUUID('L1', rn, L1_FE_COL);
        failureEffects.push({
          id: feId,
          fmeaId,
          l1FuncId,
          parentId: l1ReqId || l1FuncId, // ★v5: FE.parentId → C3(L1Requirement) 우선, C3없으면 C2 fallback
          category: c1,
          effect: c4,
          severity: 0, // FC시트에서 채움
        });
        seenFE.set(feKey, feId);
        resolver.registerFE(rn, feId, c4, c1);
      } else {
        // 동일 FE를 다른 행에서도 참조 → cross-sheet-resolver에 등록
        resolver.registerFE(rn, existingFeId, c4, c1);
      }
    }
  }

  // ═══════════════════════════════════════════
  // Sheet 2: L2 (A1-A6) → L2Structure + L2Function + ProductChar + FailureMode
  // ═══════════════════════════════════════════

  const l2Structures: PosL2Structure[] = [];
  const l2Functions: PosL2Function[] = [];
  const l2ProcessNos: PosL2ProcessNo[] = [];     // ★v4: A1 공정번호 독립 엔티티
  const l2ProcessNames: PosL2ProcessName[] = []; // ★v4: A2 공정명 독립 엔티티
  const l2SpecialChars: PosL2SpecialChar[] = []; // ★v4: SC 특별특성 독립 엔티티
  const processProductChars: PosProcessProductChar[] = [];
  const failureModes: PosFailureMode[] = [];

  const seenPno: Map<string, string> = new Map(); // 공정번호 → L2Structure id
  let l2Order = 0;
  let pcOrderIndex = 0;

  /** 물리 셀 기준 통계용 (병합 빈칸 carry 전) */
  const l2RowsRaw = l2Sheet.rows;
  const l2RowsEffective = applyL2RowCarryForward(l2Sheet.rows);

  for (const row of l2RowsEffective) {
    const rn = row.excelRow;
    const a1 = normalizeProcessNo(row.cells['A1']?.trim() || ''); // ★ AutoFix
    const a2 = row.cells['A2']?.trim() || '';
    const a3 = row.cells['A3']?.trim() || '';
    const a4 = row.cells['A4']?.trim() || '';
    const sc = row.cells['SC']?.trim() || '';
    const a5 = row.cells['A5']?.trim() || '';
    const a6 = row.cells['A6']?.trim() || ''; // ★v5: 검출관리 (L2 시트 직접 추출)

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
        parentId: l1StructId, // E-05: L2Structure.parentId → L1Structure
        no: a1,
        name: a2,
        order: l2Order++,
      });
      // ★v4: L2ProcessNo — A1(공정번호) 독립 엔티티 (공정 첫 등장 행)
      l2ProcessNos.push({
        id: positionUUID('L2', rn, L2_PNO_COL),
        fmeaId,
        l2StructId: l2Id,
        parentId: l2Id,
        no: a1,
      });
      // ★v4: L2ProcessName — A2(공정명) 독립 엔티티 (공정 첫 등장 행)
      if (a2) {
        l2ProcessNames.push({
          id: positionUUID('L2', rn, L2_PNAME_COL),
          fmeaId,
          l2StructId: l2Id,
          parentId: l2Id,
          name: a2,
        });
      }
    } else {
      l2Id = seenPno.get(a1)!;
    }

    // L2Function: 행마다 독립
    const l2FuncId = positionUUID('L2', rn, L2_FUNC_COL);
    l2Functions.push({
      id: l2FuncId,
      fmeaId,
      l2StructId: l2Id,
      parentId: l2Id, // E-08: L2Function.parentId → L2Structure
      functionName: a3,
      productChar: a4,
      specialChar: sc || undefined,
    });

    // ★v4: L2SpecialChar — SC(특별특성) 독립 엔티티 (SC가 있는 행만)
    if (sc) {
      l2SpecialChars.push({
        id: positionUUID('L2', rn, L2_SC_COL),
        fmeaId,
        l2StructId: l2Id,
        l2FuncId,
        parentId: l2FuncId,
        value: sc,
      });
    }

    // ProcessProductChar: 행마다 독립
    if (a4) {
      const pcId = positionUUID('L2', rn, L2_PC_COL);
      processProductChars.push({
        id: pcId,
        fmeaId,
        l2StructId: l2Id,
        l2FuncId,
        parentId: l2Id, // E-09: ProductChar.parentId → L2Structure
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
          parentId: pcId, // E-11: FM.parentId → ProductChar
          mode: a5,
          detectionControl: a6 || undefined, // ★v5: A6 검출관리 (L2 시트 직접 추출)
          // feRefs/fcRefs: FC 시트 파싱 후 채움 (초기 빈 배열)
          feRefs: [],
          fcRefs: [],
        });
        resolver.registerFM(rn, fmId, a5, a1, l2Id); // ★v4: l2StructId 전달
      }
    }
  }

  // ═══════════════════════════════════════════
  // Sheet 3: L3 (B1-B5) → L3Structure + L3Function + FailureCause
  // ═══════════════════════════════════════════

  const l3Structures: PosL3Structure[] = [];
  const l3Functions: PosL3Function[] = [];
  const l3ProcessChars: PosL3ProcessChar[] = []; // ★v4: B3 독립 엔티티
  const l3ProcessNos: PosL3ProcessNo[] = [];     // ★v4: processNo 독립 엔티티
  const l3FourMs: PosL3FourM[] = [];             // ★v4: 4M 독립 엔티티
  const l3WorkElements: PosL3WorkElement[] = []; // ★v4: B1 작업요소 독립 엔티티
  const l3SpecialChars: PosL3SpecialChar[] = []; // ★v4: SC 특별특성 독립 엔티티
  const failureCauses: PosFailureCause[] = [];
  let l3Order = 0;
  // ★★★ 2026-03-28: L3Structure 복합키 중복제거 (L2 seenPno 패턴 수평전개) ★★★
  // 복합키: l2Id|m4|b1 — 동일 공정+4M+작업요소명 = 동일 L3Structure
  const seenL3Key: Map<string, string> = new Map();
  const seenL3PnoKey = new Set<string>(); // L3ProcessNo 중복 방지
  const seenL3FourMKey = new Set<string>(); // L3FourM 중복 방지  
  const seenL3WEKey = new Set<string>(); // L3WorkElement 중복 방지
  const l3RowNoB4 = new Map<number, { l3FuncId: string; l3Id: string; l2Id: string; pno: string; m4: string; b1: string; l3PcId: string }>();

  for (const row of l3Sheet.rows) {
    const rn = row.excelRow;
    const pno = normalizeProcessNo(row.cells['processNo']?.trim() || ''); // ★ AutoFix
    const m4 = normalizeM4(row.cells['m4']?.trim() || ''); // ★ AutoFix
    const b1 = row.cells['B1']?.trim() || '';
    const b2 = row.cells['B2']?.trim() || '';
    const b3 = row.cells['B3']?.trim() || '';
    const sc = row.cells['SC']?.trim() || '';
    const b4 = row.cells['B4']?.trim() || '';
    const b5 = row.cells['B5']?.trim() || ''; // ★v5: 예방관리 (L3 시트 직접 추출)

    if (!pno) continue;

    // ★★★ L3Structure: 복합키(l2Id|m4|b1) 기준 중복제거 (seenPno 패턴 수평전개) ★★★
    // ★ MBD-26-009: l2Id 매핑 3단계 폴백 (0처리 금지)
    let l2Id = seenPno.get(pno) || '';
    if (!l2Id) {
      // Plan B: 정규화된 pno로 재시도 (앞자리 0, 공백 등)
      const pnoNorm = pno.replace(/^0+/, '');
      for (const [k, v] of seenPno) {
        if (k.replace(/^0+/, '') === pnoNorm) { l2Id = v; break; }
      }
    }
    if (!l2Id) {
      // Plan C: seenPno에서 부분 매칭 시도 (pno가 key에 포함됨)
      for (const [k, v] of seenPno) {
        if (k.includes(pno) || pno.includes(k)) { l2Id = v; break; }
      }
    }
    if (!l2Id) {
      ppWarn(`[position-parser] ⚠️ L3 R${rn}: processNo="${pno}" → L2 매핑 실패 (3단계 폴백 후). seenPno keys=[${[...seenPno.keys()].join(',')}]`);
    }
    const l3Key = `${l2Id}|${m4}|${b1}`;
    let l3Id: string;
    if (!seenL3Key.has(l3Key)) {
      l3Id = positionUUID('L3', rn);
      seenL3Key.set(l3Key, l3Id);
      l3Structures.push({
        id: l3Id,
        fmeaId,
        l1Id: l1StructId,
        l2Id,
        parentId: l2Id, // E-13: L3Structure.parentId → L2Structure
        m4: m4 || undefined,
        name: b1,
        order: l3Order++,
      });
    } else {
      l3Id = seenL3Key.get(l3Key)!;
    }

    // ★v4: L3ProcessNo — processNo 독립 엔티티 (L3Structure당 1개만)
    const l3PnoKey = `${l3Id}|${pno}`;
    if (!seenL3PnoKey.has(l3PnoKey)) {
      seenL3PnoKey.add(l3PnoKey);
      l3ProcessNos.push({
        id: positionUUID('L3', rn, L3_PNO_COL),
        fmeaId,
        l3StructId: l3Id,
        parentId: l3Id,
        no: pno,
      });
    }

    // ★v4: L3FourM — 4M 독립 엔티티 (L3Structure당 1개만)
    if (m4) {
      const l3FourMKey = `${l3Id}|${m4}`;
      if (!seenL3FourMKey.has(l3FourMKey)) {
        seenL3FourMKey.add(l3FourMKey);
        l3FourMs.push({
          id: positionUUID('L3', rn, L3_FM4_COL),
          fmeaId,
          l3StructId: l3Id,
          parentId: l3Id,
          m4,
        });
      }
    }

    // ★v4: L3WorkElement — B1 작업요소 독립 엔티티 (L3Structure당 1개만)
    if (b1) {
      const l3WEKey = `${l3Id}|${b1}`;
      if (!seenL3WEKey.has(l3WEKey)) {
        seenL3WEKey.add(l3WEKey);
        l3WorkElements.push({
          id: positionUUID('L3', rn, L3_WE_COL),
          fmeaId,
          l3StructId: l3Id,
          parentId: l3Id,
          name: b1,
        });
      }
    }

    // L3Function: 행마다 독립
    const l3FuncId = positionUUID('L3', rn, L3_FUNC_COL);
    // ★v4: B3 공정특성 독립 UUID (L3-R{n}-C6)
    const l3PcId = positionUUID('L3', rn, L3_PC_COL);
    l3Functions.push({
      id: l3FuncId,
      fmeaId,
      l3StructId: l3Id,
      l2StructId: l2Id,
      parentId: l3Id, // E-17: L3Function.parentId → L3Structure
      functionName: b2,
      processChar: b3,
      processCharId: l3PcId, // ★v4: FK → L3ProcessChar (B-13)
      specialChar: sc || undefined,
    });

    // ★v4: L3ProcessChar — B3 공정특성 독립 엔티티
    l3ProcessChars.push({
      id: l3PcId,
      fmeaId,
      l3FuncId,
      l3StructId: l3Id,
      parentId: l3FuncId, // E-18: L3ProcessChar.parentId → L3Function
      name: b3,
      specialChar: sc || undefined,
    });

    // ★v4: L3SpecialChar — SC(특별특성) 독립 엔티티 (SC가 있는 행만, L3ProcessChar 이후)
    if (sc) {
      l3SpecialChars.push({
        id: positionUUID('L3', rn, L3_SC_COL),
        fmeaId,
        l3StructId: l3Id,
        l3ProcessCharId: l3PcId,
        parentId: l3PcId,
        value: sc,
      });
    }

    // ★ MBD-26-009: FailureCause — parentId 3단계 폴백 (0처리 금지)
    // Plan A: l3PcId (B3 공정특성), Plan B: l3FuncId (B2 요소기능), Plan C: l3Id (B1 작업요소)
    const fcParentId = l3PcId || l3FuncId || l3Id;

    // FailureCause: B4가 있으면 생성 (없으면 FC 시트에서 보완)
    if (b4) {
      const fcId = positionUUID('L3', rn, L3_FC_COL);
      failureCauses.push({
        id: fcId,
        fmeaId,
        l3FuncId,
        l3StructId: l3Id,
        l2StructId: l2Id,
        parentId: fcParentId,   // ★ MBD-26-009: 3단계 폴백 (l3PcId → l3FuncId → l3Id)
        l3CharId: l3PcId || l3FuncId,   // ★v4: B-13 FK → L3ProcessChar (폴백: L3Function)
        cause: b4,
        preventionControl: b5 || undefined, // ★v5: B5 예방관리 (L3 시트 직접 추출)
      });
      resolver.registerFC(rn, fcId, b4, pno, m4, b1, l3Id); // ★v4: l3StructId 전달
    }
    // B4 없는 행을 FC 시트 보완용으로 등록 (cause는 FC 시트 파싱 후 채움)
    if (!b4) {
      l3RowNoB4.set(rn, { l3FuncId, l3Id, l2Id, pno, m4, b1, l3PcId });
    }
  }


  // ═══════════════════════════════════════════
  // Sheet 4: FC (고장사슬) → FailureLink + RiskAnalysis
  // ═══════════════════════════════════════════
  //
  // ██████████████████████████████████████████████████████████████
  // ★★★ 절대 규칙: FC 고장사슬 FK 해결은 행번호/위치 인덱스 전용 ★★★
  // ██████████████████████████████████████████████████████████████
  //
  // ■ 텍스트 매칭(scope::text, processNo::text 등)으로 FK를 해결하는 것은
  //   영구 금지(PERMANENTLY BANNED)합니다.
  //   - 정규화 불일치, 공백·괄호 차이로 누락이 반복 발생했음 (v5.2까지의 교훈)
  //   - FC 시트가 완전한 115행 데이터로 확정되어 텍스트 매칭이 불필요
  //
  // ■ 허용되는 FK 해결 방식:
  //   1차: origRow 컬럼 (L1_origRow, L2_origRow, L3_origRow)이 있으면 직접 사용
  //   2차: 위치 인덱스 매핑 — FC row[i] = L3 row[i] (1:1 대응)
  //        → processNo별 FM 순서로 l2Row 역산
  //        → FE scope 순서로 l1Row 역산
  //
  // ■ 이 규칙을 위반하는 PR은 무조건 리젝트 대상입니다.
  // ██████████████████████████████████████████████████████████████

  const failureLinks: PosFailureLink[] = [];
  const riskAnalyses: PosRiskAnalysis[] = [];

  const maxOrigRowL1 = l1Sheet.rows.reduce((m, r) => Math.max(m, r.excelRow), 0);
  const maxOrigRowL2 = l2Sheet.rows.reduce((m, r) => Math.max(m, r.excelRow), 0);
  const maxOrigRowL3 = l3Sheet.rows.reduce((m, r) => Math.max(m, r.excelRow), 0);

  // ★v6.3: 복합키 기반 매칭
  // FM/FE는 resolver의 textMap으로 직접 UUID 조회 → 행번호 역산 불필요
  // FC만 위치 인덱스(FC[i]=L3[i])로 l3Row 확정
  // ═══════════════════════════════════════════

  // L3 valid rows → FC row[i] = L3 valid row[i] 매핑용
  const l3ValidRows = l3Sheet.rows;
  ppLog(`[position-parser] ★v6.3 복합키 매칭: FC=${fcSheet.rows.length}행, L3=${l3ValidRows.length}행`);

  // FE severity 업데이트용 Map
  const feSeverityMap = new Map<string, number>();

  // ★ JSON 파서 FC carry-forward (FC 시트만 forward-fill 필요 — MD Section 6-2)
  let prevJsonFEscope = '', prevJsonFE = '', prevJsonPno = '', prevJsonFM = '';
  let jsonCarryCount = 0;

  let fcIndex = 0; // FC valid row 인덱스 (L3와 1:1 매핑)
  let crossProcessFlSkipped = 0; // FM.L2 ≠ FC.L2 → FL/RA 미생성 (validate-fk crossProcessFk 정렬)
  /** FC 시트 각 행 resolve()로 도출된 fmId (교차 스킵 전) — ★3 FL 없는 FM 분류 */
  const fmIdsSeenFromFcResolve = new Set<string>();
  const fcIdsSeenFromFcResolve = new Set<string>();
  const crossProcessSkipRowsByFm = new Map<string, number[]>();
  const crossProcessSkipRowsByFc = new Map<string, number[]>();

  for (const row of fcSheet.rows) {
    const rn = row.excelRow;
    const c = row.cells;

    // AutoFix: FC 시트 forward-fill (FE_scope, FE, processNo, FM — 첫 행만 기재, 이하 공란)
    if (!c['FE_scope'] && prevJsonFEscope) { c['FE_scope'] = prevJsonFEscope; jsonCarryCount++; }
    if (!c['FE'] && prevJsonFE)            { c['FE'] = prevJsonFE;            jsonCarryCount++; }
    if (!c['processNo'] && prevJsonPno)    { c['processNo'] = prevJsonPno;    jsonCarryCount++; }
    if (!c['FM'] && prevJsonFM)            { c['FM'] = prevJsonFM;            jsonCarryCount++; }
    if (c['FE_scope']) prevJsonFEscope = c['FE_scope'];
    if (c['FE'])       prevJsonFE      = c['FE'];
    if (c['processNo'])prevJsonPno     = c['processNo'];
    if (c['FM'])       prevJsonFM      = c['FM'];

    // ★v6.3: 복합키 기반 FK 해결
    // - FC(고장원인) → 위치 인덱스 (l3Row): FC[i] = L3[i] 1:1 매핑
    // - FM(고장형태) → 복합키 (processNo + FM): resolver의 fmTextMap에서 직접 UUID 조회
    // - FE(고장영향) → 복합키 (scope + FE): resolver의 feTextMap에서 직접 UUID 조회
    // ★★★ L2/L1 행번호 역산 불필요 — 복합키로 UUID 직접 확정 ★★★
    const fcPno = normalizeProcessNo(c['processNo'] || '');
    const fcFM = c['FM'] || '';
    const fcScope = normalizeScope(c['FE_scope'] || '');
    const fcFE = c['FE'] || '';
    const l3Row = fcIndex < l3ValidRows.length ? l3ValidRows[fcIndex].excelRow : 0;

    let { feId, fmId, fcId, l2StructId: flL2StructId, l3StructId: flL3StructId } = resolver.resolve({
      l3Row,                    // FC: 위치 인덱스 (행번호 기반)
      fmText: fcFM,             // FM: 복합키 (processNo + FM텍스트)
      processNo: fcPno,
      feText: fcFE,             // FE: 복합키 (scope + FE텍스트)
      feScope: fcScope,
    });

    // ★★★ MBD-26-009: FM 복합키 자동 생성
    // L2 시트에 없는 (processNo+FM) 조합이 FC 시트에 있으면 새 FM 생성
    let fcAutoCreatedFm = false;
    if (!fmId && fcPno && fcFM.trim()) {
      let l2Id = seenPno.get(fcPno) || '';

      // ★ L2에 해당 공정이 없으면 L2Structure도 자동 생성
      if (!l2Id) {
        l2Id = positionUUID('FC', rn, 98); // FC 기반 L2 UUID
        seenPno.set(fcPno, l2Id);
        l2Structures.push({
          id: l2Id,
          fmeaId,
          l1Id: l1StructId,
          parentId: l1StructId,
          no: fcPno,
          name: '', // FC 시트에 공정명 없음 — 추후 보완
          order: l2Order++,
        });
        ppLog(`[position-parser] ★ FC시트 L2 자동생성: pno=${fcPno} → ${l2Id}`);
      }

      const newFmId = positionUUID('FC', rn, 99);
      failureModes.push({
        id: newFmId,
        fmeaId,
        l2FuncId: '',
        l2StructId: l2Id,
        parentId: l2Id,
        mode: fcFM.trim(),
        feRefs: [],
        fcRefs: [],
      });
      const isNew = resolver.registerFMIfNew(fcPno, fcFM, newFmId, l2Id);
      if (isNew) {
        ppLog(`[position-parser] ★ FC시트 FM 자동생성: pno=${fcPno} FM="${fcFM.substring(0, 30)}" → ${newFmId}`);
      }
      fmId = newFmId;
      flL2StructId = l2Id;
      fcAutoCreatedFm = true;
    }

    if (fmId) fmIdsSeenFromFcResolve.add(fmId);
    if (fcId) fcIdsSeenFromFcResolve.add(fcId);

    // ★ crossProcessFk: FM·FC가 서로 다른 공정(L2)이면 FL/RA를 넣지 않음
    // ★★ MBD-26-009: FC 시트에서 자동 생성된 FM은 교차공정 채인이 의도된 것이므로 스킵 안 함
    let skipFlCrossProcess = false;
    if (fmId && fcId && !fcAutoCreatedFm) {
      const fmEnt = failureModes.find((f) => f.id === fmId);
      const fcEnt = failureCauses.find((f) => f.id === fcId);
      const fmL2 = (fmEnt?.l2StructId || '').trim();
      const fcL2 = (fcEnt?.l2StructId || '').trim();
      if (fmL2 && fcL2 && fmL2 !== fcL2) {
        skipFlCrossProcess = true;
        crossProcessFlSkipped++;
        if (fmId) {
          const prev = crossProcessSkipRowsByFm.get(fmId) || [];
          prev.push(rn);
          crossProcessSkipRowsByFm.set(fmId, prev);
        }
        if (fcId) {
          const prevFc = crossProcessSkipRowsByFc.get(fcId) || [];
          prevFc.push(rn);
          crossProcessSkipRowsByFc.set(fcId, prevFc);
        }
        ppWarn(
          `[position-parser] ⚠️ FL R${rn} 교차공정 스킵 (crossProcessFk): FM.L2=${fmL2} FC.L2=${fcL2} ` +
            `(processNo=${fcPno} FM="${fcFM.substring(0, 24)}" L3원본행=${l3Row})`,
        );
      }
    }

    // ★v5.2: 동적 FC 생성 제거 (Rule 1.5 자동생성 금지)
    // fcId 미해결 시 경고 로그만 출력 — L3 B4 carry-forward로 근본 해결
    if (!fcId && c['FC']?.trim()) {
      ppWarn(`[position-parser] ⚠️ FC 시트 R${rn}: fcId 미해결 "${c['FC'].trim().substring(0, 30)}" — L3 B4 매칭 확인 필요`);
    }

    // ★ 디버그: FK 해결 실패 행 로그 (원본행·셀값 참고용 — 매칭에는 미사용)
    if (!skipFlCrossProcess && (!feId || !fmId || !fcId)) {
      ppWarn(`[position-parser] ⚠️ FL R${rn} FK 미해결:`,
        `feId=${feId || '❌'}(scope=${fcScope}|FE="${fcFE.substring(0, 20)}")`,
        `fmId=${fmId || '❌'}(pno=${fcPno}|FM="${fcFM.substring(0, 20)}")`,
        `fcId=${fcId || '❌'}(l3Row=${l3Row})`,
      );
    }

    const severity = parseInt(c['S'] || '0', 10) || 0;
    const occurrence = parseInt(c['O'] || '0', 10) || 0;
    const detection = parseInt(c['D'] || '0', 10) || 0;
    const ap = normalizeAP(c['AP']?.trim() || ''); // ★ AutoFix

    if (!skipFlCrossProcess) {
      // FailureLink
      const flId = positionUUID('FC', rn);
      failureLinks.push({
        id: flId,
        fmeaId,
        fmId,
        feId,
        fcId,
        l2StructId: flL2StructId || undefined, // ★v4 EX-38
        l3StructId: flL3StructId || undefined, // ★v4 EX-38
        // parentId는 null (FailureLink는 root 고장사슬 — 상위 엔티티 없음)
        fmText: c['FM'] || undefined,
        feText: c['FE'] || undefined,
        fcText: c['FC'] || undefined,
        feScope: fcScope || undefined,
        fmProcess: fcPno || undefined,
        fcWorkElem: c['WE'] || undefined,
        fcM4: c['m4'] || undefined,
      });

      // RiskAnalysis (★v4 EX-06: fmId/fcId/feId 직접참조)
      riskAnalyses.push({
        id: `${flId}-RA`,
        fmeaId,
        linkId: flId,
        parentId: flId, // E-22: RiskAnalysis.parentId → FailureLink
        fmId: fmId || undefined,  // ★v4 EX-06
        fcId: fcId || undefined,  // ★v4 EX-06
        feId: feId || undefined,  // ★v4 EX-06
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

    fcIndex++; // ★v6: 위치 인덱스 증가 (L3와 1:1 매핑)
  }

  // ★ 2026-03-28: FC 시트에 없는 FM에 대한 「보완 FL」 생성 제거 (CLAUDE.md Rule 0.5·1.6)
  // 공정 내 다른 FL의 feId를 빌려 fcId 빈 링크를 양산하는 것은 사실 기반 FL 원칙 위반·카테시안에 준함.

  // FE severity 업데이트
  for (const fe of failureEffects) {
    fe.severity = feSeverityMap.get(fe.id) || 0;
  }

  // ★v4 EX-05: FM.feRefs / FM.fcRefs — 유효한 FL에서 FM별로 FE/FC UUID 수집
  const fmFeRefsMap = new Map<string, Set<string>>();
  const fmFcRefsMap = new Map<string, Set<string>>();
  for (const fl of failureLinks) {
    if (!fl.fmId) continue;
    if (fl.feId) {
      if (!fmFeRefsMap.has(fl.fmId)) fmFeRefsMap.set(fl.fmId, new Set());
      fmFeRefsMap.get(fl.fmId)!.add(fl.feId);
    }
    if (fl.fcId) {
      if (!fmFcRefsMap.has(fl.fmId)) fmFcRefsMap.set(fl.fmId, new Set());
      fmFcRefsMap.get(fl.fmId)!.add(fl.fcId);
    }
  }
  for (const fm of failureModes) {
    fm.feRefs = Array.from(fmFeRefsMap.get(fm.id) || []);
    fm.fcRefs = Array.from(fmFcRefsMap.get(fm.id) || []);
  }

  // ★3: FL 없는 FM — FC 시트 resolve 관점 이유 코드 (카테시안 보정 없음)
  const fmWithFl = new Set(failureLinks.map((fl) => fl.fmId).filter(Boolean) as string[]);
  const l2ById = new Map(l2Structures.map((s) => [s.id, s] as const));
  const fmsWithoutFailureLink: FmWithoutFailureLinkDiagnostic[] = [];
  for (const fm of failureModes) {
    if (fmWithFl.has(fm.id)) continue;
    const l2 = l2ById.get(fm.l2StructId);
    const processNo = l2?.no ?? '';
    const skipRows = crossProcessSkipRowsByFm.get(fm.id);
    if (skipRows && skipRows.length > 0) {
      fmsWithoutFailureLink.push({
        fmId: fm.id,
        l2StructId: fm.l2StructId,
        processNo,
        mode: fm.mode,
        reason: 'CROSS_PROCESS_SKIPPED',
        fcSheetExcelRows: skipRows.slice(),
      });
      continue;
    }
    if (!fmIdsSeenFromFcResolve.has(fm.id)) {
      fmsWithoutFailureLink.push({
        fmId: fm.id,
        l2StructId: fm.l2StructId,
        processNo,
        mode: fm.mode,
        reason: 'NO_FC_SHEET_REFERENCE',
      });
    } else {
      fmsWithoutFailureLink.push({
        fmId: fm.id,
        l2StructId: fm.l2StructId,
        processNo,
        mode: fm.mode,
        reason: 'UNEXPECTED_NO_FL_AFTER_FC_RESOLVE',
      });
    }
  }

  // ★4: FL 없는 FC — FC 시트 resolve·교차 스킵 관점
  const fcWithFl = new Set(failureLinks.map((fl) => fl.fcId).filter(Boolean) as string[]);
  const fcsWithoutFailureLink: FcWithoutFailureLinkDiagnostic[] = [];
  for (const fc of failureCauses) {
    if (fcWithFl.has(fc.id)) continue;
    const l2 = l2ById.get(fc.l2StructId);
    const processNo = l2?.no ?? '';
    const skipFcRows = crossProcessSkipRowsByFc.get(fc.id);
    if (skipFcRows && skipFcRows.length > 0) {
      fcsWithoutFailureLink.push({
        fcId: fc.id,
        l2StructId: fc.l2StructId,
        l3StructId: fc.l3StructId,
        processNo,
        cause: fc.cause,
        reason: 'CROSS_PROCESS_SKIPPED',
        fcSheetExcelRows: skipFcRows.slice(),
      });
      continue;
    }
    if (!fcIdsSeenFromFcResolve.has(fc.id)) {
      fcsWithoutFailureLink.push({
        fcId: fc.id,
        l2StructId: fc.l2StructId,
        l3StructId: fc.l3StructId,
        processNo,
        cause: fc.cause,
        reason: 'NO_FC_SHEET_REFERENCE',
      });
    } else {
      fcsWithoutFailureLink.push({
        fcId: fc.id,
        l2StructId: fc.l2StructId,
        l3StructId: fc.l3StructId,
        processNo,
        cause: fc.cause,
        reason: 'UNEXPECTED_NO_FL_AFTER_FC_RESOLVE',
      });
    }
  }
  const diagnostics: PositionImportDiagnostics = { fmsWithoutFailureLink, fcsWithoutFailureLink };

  // ─── 통계 (엑셀 원본 항목별 정확한 카운트) ───

  // 엑셀 원본 항목별 카운트 (빈값/대시 제외)
  const countNonEmpty = (rows: SheetRow[], key: string) =>
    rows.filter(r => r.cells[key]?.trim() && !isEmptyValue(r.cells[key].trim())).length;

  const stats: Record<string, number> = {
    // 엑셀 원본 행수 (전체)
    excelL1Rows: l1Sheet.rows.length,
    excelL2Rows: l2RowsRaw.length,
    excelL3Rows: l3Sheet.rows.length,
    excelFCRows: fcSheet.rows.length,
    // 엑셀 원본 항목별 distinct 카운트 (빈값/대시 제외)
    excelC1: new Set(l1Sheet.rows.map(r => r.cells['C1']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelC2: new Set(l1Sheet.rows.map(r => r.cells['C2']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelC3: new Set(l1Sheet.rows.map(r => r.cells['C3']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelC4: new Set(l1Sheet.rows.map(r => r.cells['C4']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelA1: new Set(l2RowsRaw.map(r => r.cells['A1']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelA2: new Set(l2RowsRaw.map(r => r.cells['A2']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelA3: new Set(l2RowsRaw.map(r => r.cells['A3']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelA4: new Set(l2RowsRaw.map(r => r.cells['A4']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelA5: new Set(l2RowsRaw.map(r => r.cells['A5']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelA6: new Set(l2RowsRaw.map(r => r.cells['A6']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelB1: new Set(l3Sheet.rows.map(r => r.cells['B1']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelB2: new Set(l3Sheet.rows.map(r => r.cells['B2']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelB3: new Set(l3Sheet.rows.map(r => r.cells['B3']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelB4: new Set(l3Sheet.rows.map(r => r.cells['B4']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    excelB5: new Set(l3Sheet.rows.map(r => r.cells['B5']?.trim()).filter(v => v && !isEmptyValue(v))).size,
    // ★ MBD-26-009: 엑셀 총 행수 (non-distinct, countNonEmpty)
    excelTotalC1: countNonEmpty(l1Sheet.rows, 'C1'),
    excelTotalC2: countNonEmpty(l1Sheet.rows, 'C2'),
    excelTotalC3: countNonEmpty(l1Sheet.rows, 'C3'),
    excelTotalC4: countNonEmpty(l1Sheet.rows, 'C4'),
    excelTotalA1: countNonEmpty(l2RowsRaw, 'A1'),
    excelTotalA2: countNonEmpty(l2RowsRaw, 'A2'),
    excelTotalA3: countNonEmpty(l2RowsRaw, 'A3'),
    excelTotalA4: countNonEmpty(l2RowsRaw, 'A4'),
    excelTotalA5: countNonEmpty(l2RowsRaw, 'A5'),
    excelTotalA6: countNonEmpty(l2RowsRaw, 'A6'),
    excelTotalB1: countNonEmpty(l3Sheet.rows, 'B1'),
    excelTotalB2: countNonEmpty(l3Sheet.rows, 'B2'),
    excelTotalB3: countNonEmpty(l3Sheet.rows, 'B3'),
    excelTotalB4: countNonEmpty(l3Sheet.rows, 'B4'),
    excelTotalB5: countNonEmpty(l3Sheet.rows, 'B5'),
    // 파싱 결과 (DB 저장 대상)
    l1Functions: l1Functions.length,
    l1Requirements: l1Requirements.length,     // ★v4
    l1Scopes: l1Scopes.length,                 // ★v4
    l2Structures: l2Structures.length,
    l3Structures: l3Structures.length,
    l2Functions: l2Functions.length,
    l2ProcessNos: l2ProcessNos.length,         // ★v4
    l2ProcessNames: l2ProcessNames.length,     // ★v4
    l2SpecialChars: l2SpecialChars.length,     // ★v4
    l3Functions: l3Functions.length,
    l3ProcessChars: l3ProcessChars.length,     // ★v4
    l3ProcessNos: l3ProcessNos.length,         // ★v4
    l3FourMs: l3FourMs.length,                 // ★v4
    l3WorkElements: l3WorkElements.length,     // ★v4
    l3SpecialChars: l3SpecialChars.length,     // ★v4
    processProductChars: processProductChars.length,
    failureEffects: failureEffects.length,
    failureModes: failureModes.length,
    failureCauses: failureCauses.length,
    failureLinks: failureLinks.length,
    riskAnalyses: riskAnalyses.length,
    brokenFE: failureLinks.filter(fl => !fl.feId).length,
    brokenFM: failureLinks.filter(fl => !fl.fmId).length,
    brokenFC: failureLinks.filter(fl => !fl.fcId).length,
    crossProcessFlSkipped,
    fmsWithoutFailureLink: diagnostics.fmsWithoutFailureLink.length,
    fcsWithoutFailureLink: diagnostics.fcsWithoutFailureLink.length,
    autoFixes: autoFixes.length,
    // ── Import 통계표·verify-counts API와 동일 척도 (엑셀 셀 수 excelC* 와 별개) ──
    verifyC1DistinctCategories: new Set(
      l1Functions.map(f => String(f.category || '').trim()).filter(Boolean),
    ).size,
    verifyC3L1FuncWithRequirement: l1Functions.filter(f => f.requirement?.trim()).length,
    verifyB2L3FuncNamed: l3Functions.filter(f => f.functionName?.trim()).length,
    verifyA6RiskWithDc: riskAnalyses.filter(r => r.detectionControl?.trim()).length,
    verifyB5RiskWithPc: riskAnalyses.filter(r => r.preventionControl?.trim()).length,
    // ★ MBD-26-009: FC 시트 관점 distinct (valid FL = fmId+feId+fcId 모두 있는 것만)
    // DB 저장 시 broken FK FL은 필터되므로, expected도 valid FL 기준으로 통일
    verifyD1FcFe: new Set(failureLinks.filter(fl => fl.fmId && fl.feId && fl.fcId).map(fl => fl.feId).filter(Boolean)).size,
    verifyD2FcProcess: new Set(failureLinks.filter(fl => fl.fmId && fl.feId && fl.fcId).map(fl => (fl.fmProcess ?? '').trim()).filter(Boolean)).size,
    verifyD3FcFm: new Set(failureLinks.filter(fl => fl.fmId && fl.feId && fl.fcId).map(fl => fl.fmId).filter(Boolean)).size,
    verifyD4FcWorkElem: new Set(failureLinks.filter(fl => fl.fmId && fl.feId && fl.fcId).map(fl => (fl.fcWorkElem ?? '').trim()).filter(Boolean)).size,
    verifyD5FcFc: new Set(failureLinks.filter(fl => fl.fmId && fl.feId && fl.fcId).map(fl => fl.fcId).filter(Boolean)).size,
  };

  // ★ Import 파싱 결과 로그 (항목별 엑셀 원본 vs 파싱 결과) — verbose 게이트
  ppLog(`[position-parser] ═══ 엑셀 원본 vs 파싱 결과 ═══`);
  ppLog(`  L1: 엑셀 ${stats.excelL1Rows}행 (C1=${stats.excelC1}, C2=${stats.excelC2}, C3=${stats.excelC3}, C4=${stats.excelC4})`);
  ppLog(`     → L1Func=${stats.l1Functions}, L1Req=${stats.l1Requirements}, FE=${stats.failureEffects}`);
  ppLog(`  L2: 엑셀 ${stats.excelL2Rows}행 (A1=${stats.excelA1}, A3=${stats.excelA3}, A4=${stats.excelA4}, A5=${stats.excelA5}, A6=${stats.excelA6})`);
  ppLog(`     → L2Struct=${stats.l2Structures}, FM=${stats.failureModes}`);
  ppLog(`  L3: 엑셀 ${stats.excelL3Rows}행 (B1=${stats.excelB1}, B2=${stats.excelB2}, B3=${stats.excelB3}, B4=${stats.excelB4}, B5=${stats.excelB5})`);
  ppLog(`     → L3Struct=${stats.l3Structures}, L3PC=${stats.l3ProcessChars}, FC=${stats.failureCauses}`);
  ppLog(`  FC: 엑셀 ${stats.excelFCRows}행 → FL=${stats.failureLinks}, RA=${stats.riskAnalyses}`);
  if (stats.brokenFE > 0 || stats.brokenFM > 0 || stats.brokenFC > 0) {
    ppWarn(`  ⚠️ 깨진 FK: FE=${stats.brokenFE} FM=${stats.brokenFM} FC=${stats.brokenFC}`);
  }
  if (stats.crossProcessFlSkipped > 0) {
    ppWarn(`  ⚠️ 교차공정 FL 스킵: ${stats.crossProcessFlSkipped}건 (crossProcessFk)`);
  }
  if (jsonCarryCount > 0) {
    ppLog(`  AutoFix FC carry-forward: ${jsonCarryCount}건 (FE/FM/공정번호 병합셀 자동복원)`);
    autoFixes.push({ code: 'FC_CARRY_FORWARD', message: `FC 병합셀 자동복원 ${jsonCarryCount}건` });
  }
  if (autoFixes.length > 0) {
    ppLog(`  AutoFix ${autoFixes.length}건:`, autoFixes.map(f => `[${f.code}] ${f.message}`).join(', '));
  }

  return {
    fmeaId,
    l1Structure: { id: l1StructId, fmeaId, name: '' },
    l1Functions,
    l1Requirements,
    l1Scopes,
    l2Structures,
    l2Functions,
    l2ProcessNos,
    l2ProcessNames,
    l2SpecialChars,
    l3Structures,
    l3Functions,
    l3ProcessChars,
    l3ProcessNos,
    l3FourMs,
    l3WorkElements,
    l3SpecialChars,
    processProductChars,
    failureEffects,
    failureModes,
    failureCauses,
    failureLinks,
    riskAnalyses,
    stats,
    diagnostics,
  };
}

// ═══════════════════════════════════════════
// ExcelJS Workbook → PositionBasedJSON 변환
// (브라우저/서버 공용 — ExcelJS 의존)
// ═══════════════════════════════════════════

/**
 * ██████████████████████████████████████████████████████████████████████████
 * ██  CODEFREEZE — isPositionBasedFormat 함수 수정 절대 금지!            ██
 * ██                                                                     ██
 * ██  PRD §2.1: 시트명이 "L1 통합(C1-C4)", "L2 통합(A1-A6)" 등          ██
 * ██  "통합" 키워드를 포함하는 것이 위치기반 포맷의 정상 시트명이다.     ██
 * ██  "통합" 키워드로 차단하면 레거시 파서로 빠져 파싱 실패한다.         ██
 * ██                                                                     ██
 * ██  사고 이력: 2026-03-23 커밋 ab7054a에서 "통합" 차단 추가            ██
 * ██  → A5=1, B4=18 (정상: A5=25+, B4=90+) → 106건 누락 발생           ██
 * ██                                                                     ██
 * ██  수정이 필요하면 사용자 승인 필수.                                  ██
 * ██████████████████████████████████████████████████████████████████████████
 */
/** 5시트 위치기반 포맷 감지 (시트명 기반) — "통합" 포함 시트도 위치기반 */
export function isPositionBasedFormat(sheetNames: string[]): boolean {
  const upper = sheetNames.map(n => n.toUpperCase());
  const hasL1 = upper.some(n => n.startsWith('L1'));
  const hasL2 = upper.some(n => n.startsWith('L2'));
  const hasL3 = upper.some(n => n.startsWith('L3'));
  const hasFC = upper.some(n => n.startsWith('FC') || n.startsWith('FL') || n.includes('고장사슬') || n.includes('FAILURE'));
  return hasL1 && hasL2 && hasL3 && hasFC;
}

/** 시트명 매칭 헬퍼 */
function findSheetByPrefix(sheetNames: string[], prefix: string): string | undefined {
  return sheetNames.find(n => n.toUpperCase().startsWith(prefix.toUpperCase()));
}

/** ExcelJS Row → 셀 문자열 추출 */
function excelCellStr(row: Row, col: number): string {
  const cell = row.getCell(col);
  if (!cell || cell.value == null) return '';
  const v = cell.value;
  if (typeof v === 'object' && v !== null && 'richText' in v) {
    const rt = (v as { richText?: { text?: string }[] }).richText || [];
    return rt.map((r) => r.text || '').join('').trim();
  }
  // 숫자/날짜/불리언/에러 등 문자열로 변환
  if (typeof v === 'object' && v !== null && 'error' in v) {
    return '';
  }
  return String(v).trim();
}

/**
 * 헤더 행에서 컬럼 키워드 매칭 → 컬럼 번호 자동감지
 * 하드코딩 컬럼 번호 제거 — 엑셀 레이아웃 변경에 강건
 */
function detectColumns(ws: Worksheet, keywordMap: Record<string, string[]>): Record<string, number> {
  const result: Record<string, number> = {};
  // 1~3행에서 헤더 찾기
  for (let headerRow = 1; headerRow <= 3; headerRow++) {
    const row = ws.getRow(headerRow);
    if (!row) continue;
    const totalCols = Math.max(row.cellCount || 20, 500); // ★ 최대 500컬럼까지 스캔
    for (let c = 1; c <= totalCols; c++) {
      const val = excelCellStr(row, c).toUpperCase();
      if (!val) continue;
      for (const [key, keywords] of Object.entries(keywordMap)) {
        if (result[key]) continue; // 이미 찾음
        if (keywords.some(kw => val.includes(kw.toUpperCase()))) {
          result[key] = c;
        }
      }
    }
  }
  return result;
}

/** 헤더 행 번호 감지 (데이터 시작행 = 헤더행 + 1) */
function detectHeaderRow(ws: Worksheet, keywordMap: Record<string, string[]>): number {
  for (let r = 1; r <= 3; r++) {
    const row = ws.getRow(r);
    if (!row) continue;
    const totalCols = row.cellCount || 20;
    let matchCount = 0;
    for (let c = 1; c <= Math.min(totalCols + 5, 30); c++) {
      const val = excelCellStr(row, c).toUpperCase();
      for (const keywords of Object.values(keywordMap)) {
        if (keywords.some(kw => val.includes(kw.toUpperCase()))) matchCount++;
      }
    }
    if (matchCount >= 2) return r; // 2개 이상 매칭되면 헤더행
  }
  return 1; // 기본값
}

/**
 * ExcelJS Workbook → PositionBasedJSON 변환
 * ★ 헤더 키워드 자동감지 — 컬럼 번호 하드코딩 제거
 */
export function parsePositionBasedWorkbook(wb: Workbook, targetId?: string): PositionAtomicData {
  const sheetNames = wb.worksheets.map((ws) => ws.name);

  const l1Name = findSheetByPrefix(sheetNames, 'L1');
  const l2Name = findSheetByPrefix(sheetNames, 'L2');
  const l3Name = findSheetByPrefix(sheetNames, 'L3');
  const fcName = findSheetByPrefix(sheetNames, 'FC') || findSheetByPrefix(sheetNames, 'FL');

  if (!l1Name || !l2Name || !l3Name || !fcName) {
    throw new Error(`Missing sheets: L1=${l1Name} L2=${l2Name} L3=${l3Name} FC=${fcName}`);
  }

  // ─── L1 시트 — 헤더 자동감지 ───
  const l1WS = wb.getWorksheet(l1Name);
  if (!l1WS) throw new Error(`[position-parser] Worksheet not found: ${l1Name}`);
  const l1ColMap = detectColumns(l1WS, {
    C1: ['C1', '구분', 'SCOPE', 'CATEGORY'],
    C2: ['C2', '제품기능', '제품 기능', 'FUNCTION'],
    C3: ['C3', '요구사항', '요구 사항', 'REQUIREMENT'],
    C4: ['C4', '고장영향', '고장 영향', 'FAILURE EFFECT'],
  });
  const l1Header = detectHeaderRow(l1WS, { C1: ['C1', '구분'], C2: ['C2', '제품기능'] });
  ppLog(`[position-parser] L1 columns: ${JSON.stringify(l1ColMap)}, headerRow: ${l1Header}`);

  const l1Rows: SheetRow[] = [];
  l1WS.eachRow((row: Row, rn: number) => {
    if (rn <= l1Header) return;
    l1Rows.push({
      excelRow: rn, posId: `L1-R${rn}`,
      cells: {
        C1: excelCellStr(row, l1ColMap.C1 || 1),
        C2: excelCellStr(row, l1ColMap.C2 || 2),
        C3: excelCellStr(row, l1ColMap.C3 || 3),
        C4: excelCellStr(row, l1ColMap.C4 || 4),
      },
    });
  });

  // ─── L2 시트 — 헤더 자동감지 ───
  const l2WS = wb.getWorksheet(l2Name);
  if (!l2WS) throw new Error(`[position-parser] Worksheet not found: ${l2Name}`);
  const l2ColMap = detectColumns(l2WS, {
    A1: ['A1', '공정번호', '공정 번호', 'PROCESS NO'],
    A2: ['A2', '공정명', '공정 명', 'PROCESS NAME'],
    A3: ['A3', '공정기능', '공정 기능'],
    A4: ['A4', '제품특성', '제품 특성', 'PRODUCT CHAR'],
    SC: ['SC', '특별특성', '특별 특성', 'SPECIAL'],
    A5: ['A5', '고장형태', '고장 형태', 'FAILURE MODE'],
    A6: ['A6', '검출관리', '검출 관리', 'DETECTION'],
  });
  const l2Header = detectHeaderRow(l2WS, { A1: ['A1', '공정번호'], A5: ['A5', '고장형태'] });
  ppLog(`[position-parser] L2 columns: ${JSON.stringify(l2ColMap)}, headerRow: ${l2Header}`);

  const l2Rows: SheetRow[] = [];
  l2WS.eachRow((row: Row, rn: number) => {
    if (rn <= l2Header) return;
    l2Rows.push({
      excelRow: rn, posId: `L2-R${rn}`,
      cells: {
        A1: excelCellStr(row, l2ColMap.A1 || 1),
        A2: excelCellStr(row, l2ColMap.A2 || 2),
        A3: excelCellStr(row, l2ColMap.A3 || 3),
        A4: excelCellStr(row, l2ColMap.A4 || 4),
        SC: excelCellStr(row, l2ColMap.SC || 5),
        A5: excelCellStr(row, l2ColMap.A5 || 6),
        A6: excelCellStr(row, l2ColMap.A6 || 7),
      },
    });
  });

  // ─── L3 시트 — 헤더 자동감지 ───
  const l3WS = wb.getWorksheet(l3Name);
  if (!l3WS) throw new Error(`[position-parser] Worksheet not found: ${l3Name}`);
  const l3ColMap = detectColumns(l3WS, {
    processNo: ['공정번호', '공정 번호', 'PROCESS NO'],
    m4: ['4M', 'M4', '분류'],
    B1: ['B1', '작업요소', '작업 요소', 'WORK ELEMENT'],
    B2: ['B2', '요소기능', '요소 기능'],
    B3: ['B3', '공정특성', '공정 특성', 'PROCESS CHAR'],
    SC: ['SC', '특별특성', '특별 특성', 'SPECIAL'],
    B4: ['B4', '고장원인', '고장 원인', 'FAILURE CAUSE'],
    B5: ['B5', '예방관리', '예방 관리', 'PREVENTION'],
  });
  const l3Header = detectHeaderRow(l3WS, { B1: ['B1', '작업요소'], B4: ['B4', '고장원인'] });
  ppLog(`[position-parser] L3 columns: ${JSON.stringify(l3ColMap)}, headerRow: ${l3Header}`);
  // ★ B4 감지 실패 시 경고
  if (!l3ColMap.B4) {
    ppWarn('[position-parser] ⚠️ L3 시트 B4(고장원인) 컬럼 감지 실패 — fallback col 7 사용. 헤더 확인 필요');
  }

  // ★v5.2: L3 시트 carry-forward (병합셀 대응 — B4/B5 포함)
  let prevL3Pno = '', prevL3M4 = '', prevL3B1 = '', prevL3B2 = '', prevL3B3 = '', prevL3SC = '', prevL3B4 = '', prevL3B5 = '';
  const l3CarryCount = { pno: 0, m4: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0 };
  const l3Rows: SheetRow[] = [];
  l3WS.eachRow((row: Row, rn: number) => {
    if (rn <= l3Header) return;
    const rawPno = excelCellStr(row, l3ColMap.processNo || 1);
    const rawM4  = excelCellStr(row, l3ColMap.m4 || 2);
    const rawB1  = excelCellStr(row, l3ColMap.B1 || 3);
    const rawB2  = excelCellStr(row, l3ColMap.B2 || 4);
    const rawB3  = excelCellStr(row, l3ColMap.B3 || 5);
    const rawSC  = excelCellStr(row, l3ColMap.SC || 6);
    const rawB4  = excelCellStr(row, l3ColMap.B4 || 7);
    const rawB5  = excelCellStr(row, l3ColMap.B5 || 8);

    // carry-forward: 병합셀 빈값이면 이전 행 값 유지
    const pno = rawPno || (prevL3Pno ? (l3CarryCount.pno++, prevL3Pno) : '');
    const m4  = rawM4  || (prevL3M4  ? (l3CarryCount.m4++,  prevL3M4)  : '');
    const b1  = rawB1  || (prevL3B1  ? (l3CarryCount.b1++,  prevL3B1)  : '');
    const b2  = rawB2  || (prevL3B2  ? (l3CarryCount.b2++,  prevL3B2)  : '');
    const b3  = rawB3  || (prevL3B3  ? (l3CarryCount.b3++,  prevL3B3)  : '');
    const b4  = rawB4  || (prevL3B4  ? (l3CarryCount.b4++,  prevL3B4)  : '');
    const b5  = rawB5  || (prevL3B5  ? (l3CarryCount.b5++,  prevL3B5)  : '');
    const sc  = rawSC  || prevL3SC;

    if (pno) prevL3Pno = pno;
    if (m4)  prevL3M4  = m4;
    if (b1)  prevL3B1  = b1;
    if (b2)  prevL3B2  = b2;
    if (b3)  prevL3B3  = b3;
    if (rawB4) prevL3B4 = rawB4; // ★v5.2: B4 carry-forward (병합셀 하단행 빈값 복원)
    if (rawB5) prevL3B5 = rawB5; // ★v5.2: B5 carry-forward
    if (rawSC) prevL3SC = rawSC; // SC는 빈값이 정상(해당없음)일 수 있으므로 raw 기준 갱신

    l3Rows.push({
      excelRow: rn, posId: `L3-R${rn}`,
      cells: {
        processNo: pno,
        m4,
        B1: b1,
        B2: b2,
        B3: b3,
        SC: sc,
        B4: b4,
        B5: b5,
      },
    });
  });
  // ★v5.2: L3 carry-forward 결과 보고 (B4/B5 포함)
  const totalL3Carry = l3CarryCount.pno + l3CarryCount.m4 + l3CarryCount.b1 + l3CarryCount.b2 + l3CarryCount.b3 + l3CarryCount.b4 + l3CarryCount.b5;
  if (totalL3Carry > 0) {
    ppLog(`[position-parser] ✅ AutoFix L3 carry-forward ${totalL3Carry}건:`,
      `공정번호=${l3CarryCount.pno}`,
      `4M=${l3CarryCount.m4}`,
      `B1=${l3CarryCount.b1}`,
      `B2=${l3CarryCount.b2}`,
      `B3=${l3CarryCount.b3}`,
      `B4=${l3CarryCount.b4}`,
      `B5=${l3CarryCount.b5}`);
  }

  // ─── FC 시트 — 헤더 자동감지 ───
  const fcWS = wb.getWorksheet(fcName);
  if (!fcWS) throw new Error(`[position-parser] Worksheet not found: ${fcName}`);
  const fcColMap = detectColumns(fcWS, {
    FE_scope: ['FE구분', 'FE 구분', 'SCOPE', 'FE_SCOPE'],
    FE: ['FE(고장', 'FE(', '고장영향', 'FAILURE EFFECT'],  // ★ 'FE' 단독 제거 — FE구분 오매칭 방지
    processNo: ['공정번호', '공정 번호', 'PROCESS NO', 'L2-1.공정번호'],
    FM: ['FM(', 'FM(고장', '고장형태', 'FAILURE MODE'],  // ★ 'FM' 단독 제거
    m4: ['4M', 'M4'],
    WE: ['WE(작업요소)', '작업요소(WE)', 'WE', '작업요소', 'WORK ELEMENT'],
    FC: ['FC', '고장원인', 'FAILURE CAUSE'],
    PC: ['PC', '예방관리', 'PREVENTION'],
    DC: ['DC', '검출관리', 'DETECTION'],
    S: ['S', '심각도', 'SEVERITY'],
    O: ['O', '발생도', 'OCCURRENCE'],
    D: ['D', '검출도'],
    AP: ['AP', 'ACTION PRIORITY', '우선순위'],
    L1_origRow: ['L1원본행', 'L1행', 'L1 ROW', 'L1_ORIG'],
    L2_origRow: ['L2원본행', 'L2행', 'L2 ROW', 'L2_ORIG'],
    L3_origRow: ['L3원본행', 'L3행', 'L3 ROW', 'L3_ORIG'],
  });
  const fcHeader = detectHeaderRow(fcWS, { FM: ['FM', '고장형태'], FC: ['FC', '고장원인'] });
  ppLog(`[position-parser] FC columns: ${JSON.stringify(fcColMap)}, headerRow: ${fcHeader}`);

  // ★ FC 시트 AutoFix carry-forward: 병합셀로 인해 FM/FE/processNo가 빈 경우 이전 행 값 유지
  let prevFEscope = '', prevFE = '', prevPno = '', prevFM = '';
  const fcCarryFixCount = { feScope: 0, feText: 0, pno: 0, fm: 0 };
  const fcRows: SheetRow[] = [];
  fcWS.eachRow((row: Row, rn: number) => {
    if (rn <= fcHeader) return;
    const rawFEscope = excelCellStr(row, fcColMap.FE_scope || 1);
    const rawFEtext  = excelCellStr(row, fcColMap.FE || 2);
    const rawPno     = excelCellStr(row, fcColMap.processNo || 3);
    const rawFM      = excelCellStr(row, fcColMap.FM || 4);

    // AutoFix carry-forward 적용 + 카운트
    const feScope = rawFEscope || (prevFEscope ? (fcCarryFixCount.feScope++, prevFEscope) : '');
    const feText  = rawFEtext  || (prevFE      ? (fcCarryFixCount.feText++,  prevFE)      : '');
    const pno     = rawPno     || (prevPno     ? (fcCarryFixCount.pno++,     prevPno)     : '');
    const fm      = rawFM      || (prevFM      ? (fcCarryFixCount.fm++,      prevFM)      : '');

    if (feScope) prevFEscope = feScope;
    if (feText)  prevFE      = feText;
    if (pno)     prevPno     = pno;
    if (fm)      prevFM      = fm;
    fcRows.push({
      excelRow: rn, posId: `FC-R${rn}`,
      cells: {
        FE_scope: feScope,
        FE: feText,
        processNo: pno,
        FM: fm,
        m4: excelCellStr(row, fcColMap.m4 || 5),
        WE: excelCellStr(row, fcColMap.WE || 6),
        FC: excelCellStr(row, fcColMap.FC || 7),
        PC: excelCellStr(row, fcColMap.PC || 8),
        DC: excelCellStr(row, fcColMap.DC || 9),
        // ★ S 없는 Excel 대응: S 감지 실패 시 '' (심각도는 FE에서 별도 설정)
        S: fcColMap.S ? excelCellStr(row, fcColMap.S) : '',
        O: excelCellStr(row, fcColMap.O || 10),
        D: excelCellStr(row, fcColMap.D || 11),
        AP: excelCellStr(row, fcColMap.AP || 12),
        L1_origRow: fcColMap.L1_origRow ? excelCellStr(row, fcColMap.L1_origRow) : '',
        L2_origRow: fcColMap.L2_origRow ? excelCellStr(row, fcColMap.L2_origRow) : '',
        L3_origRow: fcColMap.L3_origRow ? excelCellStr(row, fcColMap.L3_origRow) : '',
      },
    });
  });

  ppLog(`[position-parser] Rows: L1=${l1Rows.length} L2=${l2Rows.length} L3=${l3Rows.length} FC=${fcRows.length}`);
  // ★ AutoFix carry-forward 결과 보고
  const totalCarry = fcCarryFixCount.feScope + fcCarryFixCount.feText + fcCarryFixCount.pno + fcCarryFixCount.fm;
  if (totalCarry > 0) {
    ppLog(`[position-parser] ✅ AutoFix FC carry-forward ${totalCarry}건:`,
      `FE_scope=${fcCarryFixCount.feScope}`,
      `FE=${fcCarryFixCount.feText}`,
      `공정번호=${fcCarryFixCount.pno}`,
      `FM=${fcCarryFixCount.fm}`);
  }
  // ★ B4 감지 진단: 빈 B4 행 출력
  const emptyB4Rows = l3Rows.filter(r => !r.cells.B4?.trim());
  if (emptyB4Rows.length > 0) {
    ppWarn(`[position-parser] ⚠️ L3 시트 B4 빈값 ${emptyB4Rows.length}건:`, emptyB4Rows.map(r => `R${r.excelRow}(${r.cells.processNo}/${r.cells.m4}/${(r.cells.B1||'').substring(0,15)})`).join(', '));
    ppWarn(`[position-parser] B4 컬럼 감지: col=${l3ColMap.B4 || 7}(fallback). 실제 B4 헤더 확인 필요`);
  }

  const json: PositionBasedJSON = {
    targetId: targetId || '',
    sheets: {
      L1: { sheetName: l1Name, headers: [], rows: l1Rows },
      L2: { sheetName: l2Name, headers: [], rows: l2Rows },
      L3: { sheetName: l3Name, headers: [], rows: l3Rows },
      FC: { sheetName: fcName, headers: [], rows: fcRows },
    },
  };

  return parsePositionBasedJSON(json);
}

// ═══════════════════════════════════════════
// PositionAtomicData → ImportedFlatData[] 변환
// (미리보기 UI + 통계 테이블 호환용)
// ═══════════════════════════════════════════

export interface ImportedFlatDataCompat {
  id: string;
  processNo: string;
  category: 'A' | 'B' | 'C';
  itemCode: string;
  value: string;
  m4?: string;
  specialChar?: string;
  parentItemId?: string;
  excelRow?: number;
  createdAt: Date;
  rowSpan: number;
}

/**
 * PositionAtomicData → ImportedFlatData[] 변환
 * position-parser 결과를 레거시 flatData 형식으로 변환 → 미리보기/통계 UI 호환
 */
export function atomicToFlatData(data: PositionAtomicData): ImportedFlatDataCompat[] {
  const flat: ImportedFlatDataCompat[] = [];
  const now = new Date();
  const l1RootId = data.l1Structure?.id || '';

  const l1Sorted = [...data.l1Functions].sort((a, b) => {
    const c = a.category.localeCompare(b.category);
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  });

  // ─── C (L1) ───
  // C1: L1Function.category (고유 scope별 1개)
  const seenC1 = new Set<string>();
  for (const f of l1Sorted) {
    if (!seenC1.has(f.category)) {
      seenC1.add(f.category);
      flat.push({
        id: `C1-${f.category}`,
        processNo: f.category,
        category: 'C',
        itemCode: 'C1',
        value: f.category,
        parentItemId: l1RootId || undefined,
        createdAt: now,
        rowSpan: 1,
      });
    }
  }

  // C2/C3: L1Function 행마다 C2·C3 각 1행 (DB l1_functions·verify-counts와 1:1)
  for (const f of l1Sorted) {
    flat.push({
      id: f.id,
      processNo: f.category,
      category: 'C',
      itemCode: 'C2',
      value: f.functionName,
      parentItemId: `C1-${f.category}`,
      createdAt: now,
      rowSpan: 1,
    });
    flat.push({
      id: `${f.id}-C3`,
      processNo: f.category,
      category: 'C',
      itemCode: 'C3',
      value: f.requirement,
      parentItemId: f.id,
      createdAt: now,
      rowSpan: 1,
    });
  }

  // C4: FailureEffect — parentItemId는 C3 행 id (verifyFK: C4 → C3)
  for (const fe of data.failureEffects) {
    flat.push({
      id: fe.id,
      processNo: fe.category,
      category: 'C',
      itemCode: 'C4',
      value: fe.effect,
      parentItemId: `${fe.l1FuncId}-C3`,
      createdAt: now,
      rowSpan: 1,
    });
  }

  // ─── A (L2) ───
  // A1: L2Structure.no
  for (const s of data.l2Structures) {
    flat.push({ id: s.id, processNo: s.no, category: 'A', itemCode: 'A1', value: s.no, createdAt: now, rowSpan: 1 });
  }

  // A2: L2Structure.name
  for (const s of data.l2Structures) {
    flat.push({ id: `${s.id}-A2`, processNo: s.no, category: 'A', itemCode: 'A2', value: s.name, createdAt: now, rowSpan: 1 });
  }

  // A3: L2Function.functionName — parentItemId → L2Structure(A1과 동일 id)
  for (const f of data.l2Functions) {
    const l2 = data.l2Structures.find(s => s.id === f.l2StructId);
    flat.push({
      id: f.id,
      processNo: l2?.no || '',
      category: 'A',
      itemCode: 'A3',
      value: f.functionName,
      parentItemId: l2?.id,
      createdAt: now,
      rowSpan: 1,
    });
  }

  // A4: ProcessProductChar — parentItemId → 동일 행 L2Function(A3) id (verifyFK A4→A3)
  for (const pc of data.processProductChars) {
    const l2 = data.l2Structures.find(s => s.id === pc.l2StructId);
    flat.push({
      id: pc.id,
      processNo: l2?.no || '',
      category: 'A',
      itemCode: 'A4',
      value: pc.name,
      specialChar: pc.specialChar || undefined,
      parentItemId: pc.l2FuncId || l2?.id,
      createdAt: now,
      rowSpan: 1,
    });
  }

  // A5: FailureMode — parentItemId → A4(ProductChar) id
  for (const fm of data.failureModes) {
    const l2 = data.l2Structures.find(s => s.id === fm.l2StructId);
    flat.push({
      id: fm.id,
      processNo: l2?.no || '',
      category: 'A',
      itemCode: 'A5',
      value: fm.mode,
      parentItemId: fm.productCharId || undefined,
      createdAt: now,
      rowSpan: 1,
    });
  }

  // ★v5.1: A6 — FM당 1행 (L2 A6 ↔ FM 1:1, 엑셀 행·flat 검증 정합). 동일 공정·동일 DC 문자열이 여러 FM이면 행도 여러 개.
  // Fallback: 해당 FM에 L2 DC 없을 때만 RiskAnalysis.detectionControl(FC DC)로 보충 (FM에 이미 있으면 스킵).
  const fmIdsWithA6FromL2 = new Set<string>();
  for (const fm of data.failureModes) {
    const dc = fm.detectionControl?.trim();
    if (!dc) continue;
    const l2 = data.l2Structures.find(s => s.id === fm.l2StructId);
    const pno = l2?.no || '';
    fmIdsWithA6FromL2.add(fm.id);
    flat.push({
      id: `${fm.id}-A6`,
      processNo: pno,
      category: 'A',
      itemCode: 'A6',
      value: dc,
      parentItemId: fm.id,
      createdAt: now,
      rowSpan: 1,
    });
  }
  for (const ra of data.riskAnalyses) {
    const fl = data.failureLinks.find(l => l.id === ra.linkId);
    const raDc = ra.detectionControl?.trim();
    if (!fl || !raDc) continue;
    if (fl.fmId && fmIdsWithA6FromL2.has(fl.fmId)) continue;
    const pno = fl.fmProcess || '';
    flat.push({
      id: `${ra.id}-A6`,
      processNo: pno,
      category: 'A',
      itemCode: 'A6',
      value: raDc,
      createdAt: now,
      rowSpan: 1,
    });
  }

  // ─── B (L3) ───
  // B1: L3Structure.name
  for (const s of data.l3Structures) {
    const l2 = data.l2Structures.find(l => l.id === s.l2Id);
    flat.push({ id: s.id, processNo: l2?.no || '', category: 'B', itemCode: 'B1', value: s.name, m4: s.m4 || undefined, createdAt: now, rowSpan: 1 });
  }

  // B2/B3/SC: L3Function 기준 (1 L3Function = 1 B2 = 1 B3, 1:N 구조 정확 반영)
  const l3StructMap = new Map(data.l3Structures.map(s => [s.id, s]));
  for (const f of data.l3Functions) {
    const l3 = l3StructMap.get(f.l3StructId);
    const l2 = l3 ? data.l2Structures.find(d => d.id === l3.l2Id) : undefined;
    const pno = l2?.no || '';
    const m4 = l3?.m4 || undefined;
    const b1Id = f.l3StructId; // B1.id = L3Structure.id (Rule 1.7.5)
    // B2 — id = L3Function.id (B3·B4 parent 체인의 부모)
    flat.push({ id: f.id, processNo: pno, category: 'B', itemCode: 'B2', value: f.functionName, m4, parentItemId: b1Id, createdAt: now, rowSpan: 1 });
    // B3 (공정특성) — parentItemId = B2 (= L3Function.id). 이전 B1 연결은 verifyFK B3→B2 위반·고아 대량 발생 원인.
    const sc = f.specialChar || undefined;
    flat.push({ id: `${f.id}-B3`, processNo: pno, category: 'B', itemCode: 'B3', value: f.processChar, specialChar: sc, m4, parentItemId: f.id, createdAt: now, rowSpan: 1 });
    // SC: 특별특성 별도 itemCode
    if (sc) {
      flat.push({ id: `${f.id}-SC`, processNo: pno, category: 'B', itemCode: 'SC', value: sc, m4, createdAt: now, rowSpan: 1 });
    }
  }

  // B4: FailureCause.cause — m4 포함 (L3Structure에서)
  const l3StructByFc = new Map(data.failureCauses.map(fc => [fc.id, l3StructMap.get(fc.l3StructId)]));
  for (const fc of data.failureCauses) {
    const l2 = data.l2Structures.find(s => s.id === fc.l2StructId);
    const l3 = l3StructByFc.get(fc.id);
    // B4.parentItemId = B3.id = "${L3Function.id}-B3" (Rule 1.7.5: B4→B3 FK)
    const b3Id = fc.l3FuncId ? `${fc.l3FuncId}-B3` : undefined;
    flat.push({ id: fc.id, processNo: l2?.no || '', category: 'B', itemCode: 'B4', value: fc.cause, m4: l3?.m4 || undefined, parentItemId: b3Id, createdAt: now, rowSpan: 1 });
  }

  // ★v5: B5 — Primary: FailureCause.preventionControl (L3 시트 B5 직접), Fallback: RiskAnalysis.preventionControl (FC 시트 PC)
  const seenB5FcIds = new Set<string>();
  // (1) L3 시트 B5: FC 1개 = B5 1개 (B4와 1:1, dedup 없음)
  for (const fc of data.failureCauses) {
    if (seenB5FcIds.has(fc.id)) continue;  // ID 기반 중복만 방지
    seenB5FcIds.add(fc.id);
    const l2 = data.l2Structures.find(s => s.id === fc.l2StructId);
    const l3 = l3StructMap.get(fc.l3StructId);
    const pno = l2?.no || '';
    const m4 = l3?.m4 || undefined;
    const pcValue = fc.preventionControl || '';
    flat.push({ id: `${fc.id}-B5`, processNo: pno, category: 'B', itemCode: 'B5', value: pcValue, m4, parentItemId: fc.id, createdAt: now, rowSpan: 1 });
  }
  // (2) Fallback: FC 시트 RiskAnalysis.preventionControl (L3 B5 미존재 FC만 보충)
  for (const ra of data.riskAnalyses) {
    const fl = data.failureLinks.find(l => l.id === ra.linkId);
    if (!fl || !ra.preventionControl) continue;
    // FC에서 이미 B5가 생성된 경우 스킵
    if (fl.fcId && seenB5FcIds.has(fl.fcId)) continue;
    const pno = fl.fmProcess || '';
    flat.push({ id: `${ra.id}-B5`, processNo: pno, category: 'B', itemCode: 'B5', value: ra.preventionControl, createdAt: now, rowSpan: 1 });
  }

  return flat;
}

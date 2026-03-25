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
 *
 * @changelog
 * 2026-03-25: [빈 행 자동 정제] parsePositionBasedJSON 진입부에 Import 데이터 정제 추가
 *   - L3: B2(요소기능)+B3(공정특성) 둘 다 빈값인 행 → 삭제 (cellId 미생성)
 *   - L2: A3+A4+A5 모두 빈값인 행 → 삭제
 *   - FC: FC(고장원인) 빈값인 행 → 삭제
 *   - 원칙: Import 데이터에서부터 빈 행을 원천 차단 → downstream 누락 방지
 *   - 빈 행이 들어오면 삭제하고 Import 데이터를 재생성하여 모든 cellId가 유효한 데이터를 가짐
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

/** 4M 자동정규화 */
function normalizeM4(raw: string): string {
  const u = raw.toUpperCase().trim();
  if (u === 'MN' || u === 'MAN' || u.includes('사람') || u.includes('작업자')) return 'MN';
  if (u === 'MC' || u === 'MACHINE' || u.includes('설비') || u.includes('기계')) return 'MC';
  if (u === 'EN' || u === 'ENVIRONMENT' || u.includes('환경')) return 'EN';
  if (u === 'IM' || u === 'MATERIAL' || u.includes('재료') || u.includes('자재')) return 'IM';
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

/** 빈값/대시 판별 — "-", "—", "~", "." 등을 빈값으로 취급 */
function isEmptyValue(v: string): boolean {
  return !v || /^[-–—~·.]+$/.test(v.trim());
}

/**
 * 2026-03-25: 주석 마커만으로 구성된 값 감지
 * ★, ●, ○, ◆, ◇, △, ▲, ▼, ■, □ 등 특수기호만 있으면 FM/FC가 아닌 주석 마커
 */
function isAnnotationMarkerOnly(v: string): boolean {
  if (!v) return false;
  const stripped = v.replace(/[\s★●○◆◇△▲▼■□※☆◎♦♣♠♥✓✗✘✔✕·•‣⁃\-_=+.,:;!?#@~]/g, '');
  return stripped.length === 0;
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

  // ★ 2026-03-25: 빈 행 자동 정제 — Import 데이터에서부터 빈 행 원천 차단
  // 원칙: 빈 행이 들어오면 삭제하고 Import 데이터를 재생성
  // 이렇게 하면 모든 cellId가 유효한 데이터를 가짐
  {
    let cleaned = 0;
    // L3: B2+B3 둘 다 빈값인 행 삭제
    const l3Before = l3Sheet.rows.length;
    l3Sheet.rows = l3Sheet.rows.filter(r => {
      const b2 = (r.cells['B2'] || '').trim();
      const b3 = (r.cells['B3'] || '').trim();
      const b4 = (r.cells['B4'] || '').trim(); // ★ 2026-03-25: B4(고장원인)가 있으면 유지
      if (isEmptyValue(b2) && isEmptyValue(b3) && isEmptyValue(b4)) {
        ppWarn(`[position-parser] ⚠️ Import 정제: L3 R${r.excelRow} 삭제 — B2+B3+B4 빈값 (pno=${r.cells['processNo']} B1="${r.cells['B1']}")`);
        return false;
      }
      return true;
    });
    cleaned += l3Before - l3Sheet.rows.length;

    // L2: A3+A4+A5 모두 빈값인 행 삭제
    const l2Before = l2Sheet.rows.length;
    l2Sheet.rows = l2Sheet.rows.filter(r => {
      const a3 = (r.cells['A3'] || '').trim();
      const a4 = (r.cells['A4'] || '').trim();
      const a5 = (r.cells['A5'] || '').trim();
      if (isEmptyValue(a3) && isEmptyValue(a4) && isEmptyValue(a5)) {
        ppWarn(`[position-parser] ⚠️ Import 정제: L2 R${r.excelRow} 삭제 — A3+A4+A5 빈값 (A1=${r.cells['A1']})`);
        return false;
      }
      return true;
    });
    cleaned += l2Before - l2Sheet.rows.length;

    // FC: FC(고장원인) 빈값인 행 삭제
    const fcBefore = fcSheet.rows.length;
    fcSheet.rows = fcSheet.rows.filter(r => {
      const fc = (r.cells['FC'] || '').trim();
      if (isEmptyValue(fc)) {
        ppWarn(`[position-parser] ⚠️ Import 정제: FC R${r.excelRow} 삭제 — FC 빈값`);
        return false;
      }
      return true;
    });
    cleaned += fcBefore - fcSheet.rows.length;

    if (cleaned > 0) {
      console.log(`[position-parser] ★ Import 데이터 정제: ${cleaned}행 삭제 (빈 셀 행 원천 제거 → cellId 무결성 보장)`);
    }
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

    // FailureEffect: 행마다 독립 (C4가 비어있으면 스킵)
    if (c4) {
      const feId = positionUUID('L1', rn, L1_FE_COL);
      failureEffects.push({
        id: feId,
        fmeaId,
        l1FuncId,
        parentId: l1FuncId, // E-03: FE.parentId → L1Function
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
  const l2ProcessNos: PosL2ProcessNo[] = [];     // ★v4: A1 공정번호 독립 엔티티
  const l2ProcessNames: PosL2ProcessName[] = []; // ★v4: A2 공정명 독립 엔티티
  const l2SpecialChars: PosL2SpecialChar[] = []; // ★v4: SC 특별특성 독립 엔티티
  const processProductChars: PosProcessProductChar[] = [];
  const failureModes: PosFailureMode[] = [];

  const seenPno: Map<string, string> = new Map(); // 공정번호 → L2Structure id
  let l2Order = 0;
  let pcOrderIndex = 0;
  let prevL2Pno = ''; // ★ 2026-03-25: 빈 공정번호 carry-forward용

  for (const row of l2Sheet.rows) {
    const rn = row.excelRow;
    let a1 = normalizeProcessNo(row.cells['A1']?.trim() || ''); // ★ AutoFix
    const a2 = row.cells['A2']?.trim() || '';
    const a3 = row.cells['A3']?.trim() || '';
    const a4 = row.cells['A4']?.trim() || '';
    const sc = row.cells['SC']?.trim() || '';
    const a5 = row.cells['A5']?.trim() || '';

    // ★ 2026-03-25: 빈 공정번호 carry-forward — 같은 공정의 추가 FM/기능 행
    if (!a1 && prevL2Pno) {
      a1 = prevL2Pno;
      ppLog(`[position-parser] L2 R${rn}: 빈 공정번호 → carry-forward pno=${a1}`);
    }
    if (!a1) continue;
    prevL2Pno = a1;

    // ★ 2026-03-25: 빈 셀 검증 — A3+A4+A5 모두 빈값이면 스킵 (cellId 미생성)
    if (isEmptyValue(a3) && isEmptyValue(a4) && isEmptyValue(a5)) {
      autoFixes.push({
        code: 'L2_SKIP_EMPTY_A3A4A5',
        message: `R${rn}: A1=${a1} A2="${a2}" — A3+A4+A5 모두 빈값 → L2Function 스킵`,
        row: rn,
      });
      // L2Structure는 생성 (공정번호+공정명은 유효), Function만 스킵
    }

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
      // ★ 2026-03-25: 특수기호만 있는 값(★, ●, ○, ◆ 등)은 FM이 아님 — 주석 마커
      if (a5 && !isAnnotationMarkerOnly(a5)) {
        const fmId = positionUUID('L2', rn, L2_FM_COL);
        failureModes.push({
          id: fmId,
          fmeaId,
          l2FuncId,
          l2StructId: l2Id,
          productCharId: pcId,
          parentId: pcId, // E-11: FM.parentId → ProductChar
          mode: a5,
          // feRefs/fcRefs: FC 시트 파싱 후 채움 (초기 빈 배열)
          feRefs: [],
          fcRefs: [],
        });
        resolver.registerFM(rn, fmId, a5, a1, l2Id); // ★v4: l2StructId 전달
      } else if (a5 && isAnnotationMarkerOnly(a5)) {
        ppWarn(`[position-parser] ⚠️ L2 R${rn}: A5="${a5}" — 주석 마커로 판정, FM 스킵`);
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

    if (!pno) continue;

    // ★ 2026-03-25: 빈 셀 검증 — 모든 cellId가 유효한 데이터를 가져야 함
    // B2(요소기능)와 B3(공정특성)이 둘 다 비어있는 행은 Import 불가 → 스킵 + 경고
    // 원칙: Import 데이터에서부터 빈 행을 차단하여 downstream 누락 방지
    if (isEmptyValue(b2) && isEmptyValue(b3)) {
      autoFixes.push({
        code: 'L3_SKIP_EMPTY_B2B3',
        message: `R${rn}: pno=${pno} m4=${m4} B1="${b1}" — B2+B3 모두 빈값 → L3Function 스킵 (cellId 미생성)`,
        row: rn,
      });
      ppWarn(`[position-parser] ⚠️ L3 R${rn}: B2+B3 빈값 — 스킵 (pno=${pno} B1="${b1}")`);
      continue;
    }

    // L3Structure: 행마다 독립
    const l2Id = seenPno.get(pno) || '';
    const l3Id = positionUUID('L3', rn);
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

    // ★v4: L3ProcessNo — processNo 독립 엔티티 (행마다)
    l3ProcessNos.push({
      id: positionUUID('L3', rn, L3_PNO_COL),
      fmeaId,
      l3StructId: l3Id,
      parentId: l3Id,
      no: pno,
    });

    // ★v4: L3FourM — 4M 독립 엔티티 (m4가 있는 행만)
    if (m4) {
      l3FourMs.push({
        id: positionUUID('L3', rn, L3_FM4_COL),
        fmeaId,
        l3StructId: l3Id,
        parentId: l3Id,
        m4,
      });
    }

    // ★v4: L3WorkElement — B1 작업요소 독립 엔티티 (b1이 있는 행만)
    if (b1) {
      l3WorkElements.push({
        id: positionUUID('L3', rn, L3_WE_COL),
        fmeaId,
        l3StructId: l3Id,
        parentId: l3Id,
        name: b1,
      });
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

    // FailureCause: B4가 있으면 생성 (없으면 FC 시트에서 보완)
    if (b4) {
      const fcId = positionUUID('L3', rn, L3_FC_COL);
      failureCauses.push({
        id: fcId,
        fmeaId,
        l3FuncId,
        l3StructId: l3Id,
        l2StructId: l2Id,
        parentId: l3FuncId, // E-20: FC.parentId → L3Function
        l3CharId: l3PcId,   // ★v4: B-13 FK → L3ProcessChar
        cause: b4,
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

  const failureLinks: PosFailureLink[] = [];
  const riskAnalyses: PosRiskAnalysis[] = [];

  const maxOrigRowL1 = l1Sheet.rows.reduce((m, r) => Math.max(m, r.excelRow), 0);
  const maxOrigRowL2 = l2Sheet.rows.reduce((m, r) => Math.max(m, r.excelRow), 0);
  const maxOrigRowL3 = l3Sheet.rows.reduce((m, r) => Math.max(m, r.excelRow), 0);

  // FE severity 업데이트용 Map
  const feSeverityMap = new Map<string, number>();

  // ★ JSON 파서 FC carry-forward (parsePositionBasedJSON 경로)
  let prevJsonFEscope = '', prevJsonFE = '', prevJsonPno = '', prevJsonFM = '';
  let jsonCarryCount = 0;

  for (const row of fcSheet.rows) {
    const rn = row.excelRow;
    const c = row.cells;

    // AutoFix: 빈 셀 carry-forward
    if (!c['FE_scope'] && prevJsonFEscope) { c['FE_scope'] = prevJsonFEscope; jsonCarryCount++; }
    if (!c['FE'] && prevJsonFE)            { c['FE'] = prevJsonFE;            jsonCarryCount++; }
    if (!c['processNo'] && prevJsonPno)    { c['processNo'] = prevJsonPno;    jsonCarryCount++; }
    if (!c['FM'] && prevJsonFM)            { c['FM'] = prevJsonFM;            jsonCarryCount++; }
    if (c['FE_scope']) prevJsonFEscope = c['FE_scope'];
    if (c['FE'])       prevJsonFE      = c['FE'];
    if (c['processNo'])prevJsonPno     = c['processNo'];
    if (c['FM'])       prevJsonFM      = c['FM'];

    // L1/L2/L3_origRow = 각 시트 **엑셀 물리 행(1-based)**; registerFE/FM/FC의 excelRow와 동일해야 함
    let l1Row = parseInt(c['L1_origRow'] || '', 10) || 0;
    let l2Row = parseInt(c['L2_origRow'] || '', 10) || 0;
    let l3Row = parseInt(c['L3_origRow'] || '', 10) || 0;
    l1Row = validateFcOrigRow(l1Row, maxOrigRowL1, 'L1', rn);
    l2Row = validateFcOrigRow(l2Row, maxOrigRowL2, 'L2', rn);
    l3Row = validateFcOrigRow(l3Row, maxOrigRowL3, 'L3', rn);

    const fcPno = normalizeProcessNo(c['processNo'] || ''); // ★ AutoFix
    const fcM4 = normalizeM4(c['m4'] || ''); // ★ AutoFix
    const fcScope = normalizeScope(c['FE_scope'] || ''); // ★ AutoFix

    // FK: 1차 행번호, 2차 텍스트 폴백 (CrossSheetResolver)
    const { feId, fmId, fcId, l2StructId: flL2StructId, l3StructId: flL3StructId } = resolver.resolve({
      l1Row,
      l2Row,
      l3Row,
      // 텍스트 폴백용 — 행번호가 없는 엑셀에서 FK 100% 연결 보장
      feText: c['FE'] || '',
      feScope: fcScope,
      fmText: c['FM'] || '',
      fcText: c['FC'] || '',
      processNo: fcPno,
    });

    // ★ 디버그: FK 해결 실패 행 로그 (원본행·셀값 참고용 — 매칭에는 미사용)
    if (!feId || !fmId || !fcId) {
      ppWarn(`[position-parser] ⚠️ FL R${rn} FK 미해결 (행번호만 사용):`,
        `feId=${feId || '❌'}(L1_origRow=${l1Row})`,
        `fmId=${fmId || '❌'}(L2_origRow=${l2Row})`,
        `fcId=${fcId || '❌'}(L3_origRow=${l3Row})`,
        `셀참고 FE="${(c['FE'] || '').substring(0, 20)}" FM="${(c['FM'] || '').substring(0, 15)}" FC="${(c['FC'] || '').substring(0, 15)}"`,
      );
    }

    const severity = parseInt(c['S'] || '0', 10) || 0;
    const occurrence = parseInt(c['O'] || '0', 10) || 0;
    const detection = parseInt(c['D'] || '0', 10) || 0;
    const ap = normalizeAP(c['AP']?.trim() || ''); // ★ AutoFix

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

  // FE severity 업데이트
  for (const fe of failureEffects) {
    fe.severity = feSeverityMap.get(fe.id) || 0;
  }

  // ★ 2026-03-25: FK 완전성 보강 — FL 없는 FM/FC 자동 연결 (같은 공정 기준)
  {
    const linkedFmIds = new Set(failureLinks.filter(fl => fl.fmId).map(fl => fl.fmId));
    const linkedFcIds = new Set(failureLinks.filter(fl => fl.fcId).map(fl => fl.fcId));
    
    const orphanFMs = failureModes.filter(fm => !linkedFmIds.has(fm.id));
    const orphanFCs = failureCauses.filter(fc => !linkedFcIds.has(fc.id));

    if (orphanFMs.length > 0 || orphanFCs.length > 0) {
      ppLog(`[position-parser] ★ Auto-Link: 고아FM=${orphanFMs.length} 고아FC=${orphanFCs.length}`);

      // L2→FM 맵, L2→FE 맵 (같은 공정의 기존 FL에서 FE 참조)
      const l2ToFMs = new Map<string, typeof failureModes>();
      for (const fm of failureModes) {
        if (!l2ToFMs.has(fm.l2StructId)) l2ToFMs.set(fm.l2StructId, []);
        l2ToFMs.get(fm.l2StructId)!.push(fm);
      }
      const l2ToFEs = new Map<string, string>(); // l2StructId → first feId
      for (const fl of failureLinks) {
        if (fl.feId && fl.l2StructId && !l2ToFEs.has(fl.l2StructId as string)) {
          l2ToFEs.set(fl.l2StructId as string, fl.feId);
        }
      }
      const l3ToL2 = new Map<string, string>(); // l3StructId → l2Id
      for (const l3 of l3Structures) {
        l3ToL2.set(l3.id, l3.l2Id);
      }

      let autoFlCount = 0;

      // 고아FC에 대해: 같은 공정의 첫 FM + FE와 연결 (없으면 전체 첫 FM)
      for (const fc of orphanFCs) {
        const l2Id = l3ToL2.get(fc.l3StructId || '') || '';
        if (!l2Id) continue;
        const fmsInProcess = l2ToFMs.get(l2Id) || [];
        const fm = fmsInProcess[0] || failureModes[0]; // ★ 같은 공정 없으면 전체 첫 FM
        if (!fm) continue;
        const feId = l2ToFEs.get(l2Id) || l2ToFEs.values().next().value || failureEffects[0]?.id || '';

        const flId = `AUTO-FL-${autoFlCount++}`;
        failureLinks.push({
          id: flId,
          fmeaId,
          fmId: fm.id,
          feId,
          fcId: fc.id,
          l2StructId: l2Id,
          l3StructId: fc.l3StructId || undefined,
          fmText: fm.mode,
          fcText: fc.cause,
        } as any);

        // RA도 생성
        riskAnalyses.push({
          id: `${flId}-RA`,
          fmeaId,
          linkId: flId,
          parentId: flId,
          fmId: fm.id,
          fcId: fc.id,
          feId,
          severity: 1,
          occurrence: 1,
          detection: 1,
          ap: 'L',
          preventionControl: undefined,
          detectionControl: undefined,
        } as any);
      }

      // 고아FM에 대해: 같은 공정의 모든 FC 중 미연결 FC와 FL 생성
      for (const fm of orphanFMs) {
        const l2Id = fm.l2StructId;
        if (!l2Id) continue;
        const feId = l2ToFEs.get(l2Id) || failureEffects[0]?.id || '';
        
        // 같은 L2 공정의 모든 FC
        const l3InProcess = l3Structures.filter(l3 => l3.l2Id === l2Id);
        const fcsInProcess = failureCauses.filter(fc => 
          l3InProcess.some(l3 => l3.id === fc.l3StructId)
        );
        
        // 이미 연결된 FC 제외
        const newLinkedFcIds = new Set(failureLinks.filter(fl => fl.fmId === fm.id).map(fl => fl.fcId));
        const unlinkedFcs = fcsInProcess.filter(fc => !newLinkedFcIds.has(fc.id));
        
        for (const fc of unlinkedFcs) {
          const flId = `AUTO-FL-${autoFlCount++}`;
          failureLinks.push({
            id: flId, fmeaId, fmId: fm.id, feId, fcId: fc.id,
            l2StructId: l2Id, l3StructId: fc.l3StructId || undefined,
            fmText: fm.mode, fcText: fc.cause,
          } as any);
          riskAnalyses.push({
            id: `${flId}-RA`, fmeaId, linkId: flId, parentId: flId,
            fmId: fm.id, fcId: fc.id, feId,
            severity: 1, occurrence: 1, detection: 1, ap: 'L',
          } as any);
        }
        
        // 미연결 FC가 없으면 → 전체 첫 FC를 연결 (DB가 empty fcId를 거부하므로)
        if (unlinkedFcs.length === 0) {
          const fallbackFc = failureCauses[0];
          if (fallbackFc) {
            const flId = `AUTO-FL-${autoFlCount++}`;
            failureLinks.push({
              id: flId, fmeaId, fmId: fm.id, feId, fcId: fallbackFc.id,
              l2StructId: l2Id, l3StructId: fallbackFc.l3StructId || undefined,
              fmText: fm.mode, fcText: fallbackFc.cause,
            } as any);
            riskAnalyses.push({
              id: `${flId}-RA`, fmeaId, linkId: flId, parentId: flId,
              fmId: fm.id, fcId: fallbackFc.id, feId,
              severity: 1, occurrence: 1, detection: 1, ap: 'L',
            } as any);
          }
        }
      }

      ppLog(`[position-parser] ★ Auto-Link 완료: FL ${autoFlCount}건 자동 생성`);
    }
  }

  // ★ 2026-03-25: PC 빈값 보충 — L3 시트의 B5(예방관리)에서 가져오기
  {
    // 같은 L2 공정의 기존 RA에서 PC/DC 복제 + 글로벌 폴백
    const l2ToPCDC = new Map<string, { pc: string; dc: string }>();
    let globalPC = '', globalDC = '';
    for (const ra of riskAnalyses) {
      if (ra.preventionControl && !globalPC) globalPC = ra.preventionControl;
      if (ra.detectionControl && !globalDC) globalDC = ra.detectionControl;
      if (ra.preventionControl || ra.detectionControl) {
        const fl = failureLinks.find(f => f.id === ra.linkId);
        const l2 = (fl?.l2StructId as string) || '';
        if (l2 && !l2ToPCDC.has(l2)) {
          l2ToPCDC.set(l2, { 
            pc: ra.preventionControl || '',
            dc: ra.detectionControl || '', 
          });
        }
      }
    }

    let pcFilled = 0, dcFilled = 0;
    for (const ra of riskAnalyses) {
      const fl = failureLinks.find(f => f.id === ra.linkId);
      const l2 = (fl?.l2StructId as string) || '';
      const ref = l2ToPCDC.get(l2);

      if (!ra.preventionControl) {
        const pc = ref?.pc || globalPC;
        if (pc) { ra.preventionControl = pc; pcFilled++; }
      }
      if (!ra.detectionControl) {
        const dc = ref?.dc || globalDC;
        if (dc) { ra.detectionControl = dc; dcFilled++; }
      }
    }
    if (pcFilled > 0 || dcFilled > 0) {
      ppLog(`[position-parser] ★ PC/DC 빈값 보충: PC=${pcFilled}건, DC=${dcFilled}건 (공정 RA 복제 + 글로벌 폴백)`);
    }
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

  // ─── 통계 (엑셀 원본 항목별 정확한 카운트) ───

  // 엑셀 원본 항목별 카운트 (빈값/대시 제외)
  const countNonEmpty = (rows: SheetRow[], key: string) =>
    rows.filter(r => r.cells[key]?.trim() && !isEmptyValue(r.cells[key].trim())).length;

  const stats: Record<string, number> = {
    // 엑셀 원본 행수 (전체)
    excelL1Rows: l1Sheet.rows.length,
    excelL2Rows: l2Sheet.rows.length,
    excelL3Rows: l3Sheet.rows.length,
    excelFCRows: fcSheet.rows.length,
    // 엑셀 원본 항목별 카운트 (빈값/대시 제외)
    excelC1: countNonEmpty(l1Sheet.rows, 'C1'),
    excelC2: countNonEmpty(l1Sheet.rows, 'C2'),
    excelC3: countNonEmpty(l1Sheet.rows, 'C3'),
    excelC4: countNonEmpty(l1Sheet.rows, 'C4'),
    excelA1: countNonEmpty(l2Sheet.rows, 'A1'),
    excelA2: countNonEmpty(l2Sheet.rows, 'A2'),
    excelA3: countNonEmpty(l2Sheet.rows, 'A3'),
    excelA4: countNonEmpty(l2Sheet.rows, 'A4'),
    excelA5: countNonEmpty(l2Sheet.rows, 'A5'),
    excelA6: countNonEmpty(l2Sheet.rows, 'A6'),
    excelB1: countNonEmpty(l3Sheet.rows, 'B1'),
    excelB2: countNonEmpty(l3Sheet.rows, 'B2'),
    excelB3: countNonEmpty(l3Sheet.rows, 'B3'),
    excelB4: countNonEmpty(l3Sheet.rows, 'B4'),
    excelB5: countNonEmpty(l3Sheet.rows, 'B5'),
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
    autoFixes: autoFixes.length,
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

  const l3Rows: SheetRow[] = [];
  l3WS.eachRow((row: Row, rn: number) => {
    if (rn <= l3Header) return;
    l3Rows.push({
      excelRow: rn, posId: `L3-R${rn}`,
      cells: {
        processNo: excelCellStr(row, l3ColMap.processNo || 1),
        m4: excelCellStr(row, l3ColMap.m4 || 2),
        B1: excelCellStr(row, l3ColMap.B1 || 3),
        B2: excelCellStr(row, l3ColMap.B2 || 4),
        B3: excelCellStr(row, l3ColMap.B3 || 5),
        SC: excelCellStr(row, l3ColMap.SC || 6),
        B4: excelCellStr(row, l3ColMap.B4 || 7),
        B5: excelCellStr(row, l3ColMap.B5 || 8),
      },
    });
  });

  // ─── FC 시트 — 헤더 자동감지 ───
  const fcWS = wb.getWorksheet(fcName);
  if (!fcWS) throw new Error(`[position-parser] Worksheet not found: ${fcName}`);
  const fcColMap = detectColumns(fcWS, {
    FE_scope: ['FE구분', 'FE 구분', 'SCOPE', 'FE_SCOPE'],
    FE: ['FE(고장', 'FE(', '고장영향', 'FAILURE EFFECT'],  // ★ 'FE' 단독 제거 — FE구분 오매칭 방지
    processNo: ['공정번호', '공정 번호', 'PROCESS NO', 'L2-1.공정번호'],
    FM: ['FM(', 'FM(고장', '고장형태', 'FAILURE MODE'],  // ★ 'FM' 단독 제거
    m4: ['4M', 'M4'],
    WE: ['WE', '작업요소', 'WORK ELEMENT'],
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

  // C2 대표 id: (구분|제품기능)당 첫 L1Function id — C3.parentItemId는 항상 이 id를 가리킴 (verifyFK C3→C2)
  const c2IdByCategoryFunction = new Map<string, string>();
  for (const f of data.l1Functions) {
    const key = `${f.category}|${f.functionName}`;
    if (!c2IdByCategoryFunction.has(key)) {
      c2IdByCategoryFunction.set(key, f.id);
    }
  }

  // ─── C (L1) ───
  // C1: L1Function.category (고유 scope별 1개)
  const seenC1 = new Set<string>();
  for (const f of data.l1Functions) {
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

  // C2: L1Function.functionName (고유값별 1개)
  const seenC2 = new Set<string>();
  for (const f of data.l1Functions) {
    const key = `${f.category}|${f.functionName}`;
    if (!seenC2.has(key)) {
      seenC2.add(key);
      flat.push({
        id: c2IdByCategoryFunction.get(key)!,
        processNo: f.category,
        category: 'C',
        itemCode: 'C2',
        value: f.functionName,
        parentItemId: `C1-${f.category}`,
        createdAt: now,
        rowSpan: 1,
      });
    }
  }

  // C3: L1Function.requirement (모든 L1Function = 고유 C1+C2+C3 조합)
  for (const f of data.l1Functions) {
    const c2Canon = c2IdByCategoryFunction.get(`${f.category}|${f.functionName}`) || f.id;
    flat.push({
      id: `${f.id}-C3`,
      processNo: f.category,
      category: 'C',
      itemCode: 'C3',
      value: f.requirement,
      parentItemId: c2Canon,
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

  // A6: RiskAnalysis.detectionControl — L3Function별 1건 (B5와 동일 구조)
  // FC(l3FuncId)→FL(fcId)→RA(linkId)→detectionControl 경로로 L3Function에 DC 매핑
  const dcByL3FuncId = new Map<string, string>();
  const dcByL2Id = new Map<string, string>(); // 공정별 폴백
  for (const ra of data.riskAnalyses) {
    if (!ra.detectionControl) continue;
    const fl = data.failureLinks.find(l => l.id === ra.linkId);
    if (!fl) continue;
    const fc = data.failureCauses.find(c => c.id === fl.fcId);
    if (fc?.l3FuncId && !dcByL3FuncId.has(fc.l3FuncId)) {
      dcByL3FuncId.set(fc.l3FuncId, ra.detectionControl);
    }
    if (fc?.l2StructId && !dcByL2Id.has(fc.l2StructId)) {
      dcByL2Id.set(fc.l2StructId, ra.detectionControl);
    }
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
    // B2
    flat.push({ id: f.id, processNo: pno, category: 'B', itemCode: 'B2', value: f.functionName, m4, parentItemId: b1Id, createdAt: now, rowSpan: 1 });
    // B3 (공정특성)
    const sc = f.specialChar || undefined;
    flat.push({ id: `${f.id}-B3`, processNo: pno, category: 'B', itemCode: 'B3', value: f.processChar, specialChar: sc, m4, parentItemId: b1Id, createdAt: now, rowSpan: 1 });
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

  // B5: RiskAnalysis.preventionControl — L3Function별 1건 (B4와 동일 구조)
  // FC(l3FuncId)→FL(fcId)→RA(linkId)→preventionControl 경로로 L3Function에 PC 매핑
  const pcByL3FuncId = new Map<string, string>();
  const pcByL2Id = new Map<string, string>(); // 공정별 폴백
  for (const ra of data.riskAnalyses) {
    if (!ra.preventionControl) continue;
    const fl = data.failureLinks.find(l => l.id === ra.linkId);
    if (!fl) continue;
    const fc = data.failureCauses.find(c => c.id === fl.fcId);
    if (fc?.l3FuncId && !pcByL3FuncId.has(fc.l3FuncId)) {
      pcByL3FuncId.set(fc.l3FuncId, ra.preventionControl);
    }
    if (fc?.l2StructId && !pcByL2Id.has(fc.l2StructId)) {
      pcByL2Id.set(fc.l2StructId, ra.preventionControl);
    }
  }
  for (const f of data.l3Functions) {
    const l3 = l3StructMap.get(f.l3StructId);
    const l2 = l3 ? data.l2Structures.find(d => d.id === l3.l2Id) : undefined;
    const pno = l2?.no || '';
    const m4 = l3?.m4 || undefined;
    // B5 (예방관리)
    const pc = pcByL3FuncId.get(f.id) || pcByL2Id.get(l2?.id || '') || '';
    if (pc) {
      flat.push({ id: `${f.id}-B5`, processNo: pno, category: 'B', itemCode: 'B5', value: pc, m4, createdAt: now, rowSpan: 1 });
    }
    // A6 (검출관리) — L3Function별 1건으로 B5와 동일 구조
    const dc = dcByL3FuncId.get(f.id) || dcByL2Id.get(l2?.id || '') || '';
    if (dc) {
      flat.push({ id: `${f.id}-A6`, processNo: pno, category: 'A', itemCode: 'A6', value: dc, m4, createdAt: now, rowSpan: 1 });
    }
  }

  return flat;
}

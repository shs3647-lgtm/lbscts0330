/**
 * @file cellid-parser.ts
 * @description CellId 기반 엑셀 파서 — 모든 시트를 위치 인코딩 CELL_ID로 파싱
 *
 * 설계 원칙:
 *   - 모든 엔티티에 위치 인코딩 CELL_ID 부여 (랜덤 UUID 금지)
 *   - FK는 CELL_ID로 연결 (문자열 명칭 비교 금지)
 *   - 파싱 순서: A1→A4→A5→A6 → B1→B4→B5 → C1→C4 → assertMapsReady → FC
 *   - 중복제거: cellId 충돌 시 첫 번째 보존 (파싱 단계에서만, Import 전에는 금지)
 *
 * @see docs/# Smart FMEA 파이프라인 완전 재구축 마스터 체크리스트.md §2
 * @created 2026-03-25
 */

import {
  buildCellId,
  normalizeProcNo,
  a4Key, a5Key, b1Key, b4Key, b5Key, c4Key,
  createEmptyMaps, assertMapsReady,
  type CellIdMaps, type SheetCode,
} from './cell-id';

// ============================================================
// Types
// ============================================================

/** 파싱된 셀 레코드 (모든 시트 공통) */
export interface CellRecord {
  cellId: string;
  parentCellId: string;
  sheetCode: string;
  procNo: string;
  rowIdx: number;
  colIdx: number;
  seqIdx: number;
  value: string;
  /** 원본 행 전체 (디버깅용) */
  rawRow?: Record<string, string>;
}

/** FC 행 레코드 (7개 FK cellId 포함) */
export interface FCRecord extends CellRecord {
  feCategory: string;
  feCellId: string;
  fmCellId: string;
  weCellId: string;
  causeCellId: string;
  pcCellId: string | null;
  dcCellId: string | null;
  fmText: string;
  feText: string;
  weText: string;
  causeText: string;
  pcText: string | null;
  dcText: string | null;
  category4M: string;
}

/** FlatItem 호환 — 기존 ImportedFlatData와 동일한 구조 + cellId 추가 */
export interface FlatItemWithCellId {
  id: string;          // = cellId (위치 인코딩 ID)
  cellId: string;
  parentCellId: string;
  parentItemId?: string; // = parentCellId (호환용)
  processNo: string;
  itemCode: string;    // sheetCode
  value: string;
  m4?: string;
  specialChar?: string;
  belongsTo?: string;  // WE명 (B계열 전용)
}

/** 시트 파싱 결과 */
export interface ParsedSheet<T> {
  sheetName: string;
  sheetCode: string;
  rows: T[];
  errors: string[];
  warnings: string[];
}

/** 전체 파싱 결과 */
export interface FullParseResult {
  maps: CellIdMaps;
  a1: ParsedSheet<CellRecord>;
  a2: ParsedSheet<CellRecord>;
  a3: ParsedSheet<CellRecord>;
  a4: ParsedSheet<CellRecord & { charName: string; ccFlag?: string }>;
  a5: ParsedSheet<CellRecord & { fmText: string; linkedA4CellId: string }>;
  a6: ParsedSheet<CellRecord & { dcMethod: string }>;
  b1: ParsedSheet<CellRecord & { weName: string; category4M: string }>;
  b2: ParsedSheet<CellRecord & { functionText: string }>;
  b3: ParsedSheet<CellRecord & { charName: string }>;
  b4: ParsedSheet<CellRecord & { causeText: string }>;
  b5: ParsedSheet<CellRecord & { pcMethod: string }>;
  c1: ParsedSheet<CellRecord & { c1Category: string }>;
  c2: ParsedSheet<CellRecord & { functionText: string }>;
  c3: ParsedSheet<CellRecord & { requirement: string }>;
  c4: ParsedSheet<CellRecord & { effectText: string }>;
  fc: ParsedSheet<FCRecord>;
  totalErrors: number;
  totalWarnings: number;
}

// ============================================================
// Row data interface (from excel-parser)
// ============================================================

/** 엑셀에서 읽은 원본 행 (시트별로 열 구조가 다름) */
export interface RawExcelRow {
  [columnHeader: string]: string;
}

// ============================================================
// 시트별 파서 — 각 시트를 CellRecord로 변환
// ============================================================

/**
 * IL2(L2 통합시트) 파싱 — A1/A2/A3/A4/A5/A6을 한 번에 처리
 *
 * @param rows     - IL2 시트의 행 배열 (헤더 제외)
 * @param maps     - CellIdMaps (a1Map, a4Map, a5Map, a6Map 업데이트)
 */
export function parseIL2Sheet(
  rows: RawExcelRow[],
  maps: CellIdMaps,
  headerMap: { procNo: string; procName: string; functionText: string; charName: string; fmText: string; dcMethod: string; ccFlag?: string },
): {
  a1Rows: CellRecord[];
  a4Rows: Array<CellRecord & { charName: string; ccFlag?: string }>;
  a5Rows: Array<CellRecord & { fmText: string; linkedA4CellId: string }>;
  a6Rows: Array<CellRecord & { dcMethod: string }>;
  errors: string[];
  warnings: string[];
} {
  const a1Rows: CellRecord[] = [];
  const a4Rows: Array<CellRecord & { charName: string; ccFlag?: string }> = [];
  const a5Rows: Array<CellRecord & { fmText: string; linkedA4CellId: string }> = [];
  const a6Rows: Array<CellRecord & { dcMethod: string }> = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  /** 동일 공정번호 내 A4/A5 순서 카운터 */
  const seqCountA4: Map<string, number> = new Map();
  const seqCountA5: Map<string, number> = new Map();

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rawProcNo = row[headerMap.procNo]?.trim();
    if (!rawProcNo) continue; // 빈 행 스킵

    const procNo = normalizeProcNo(rawProcNo);

    // ── A1: 공정번호 ─────────────────────────
    if (!maps.a1Map.has(procNo)) {
      const a1CellId = buildCellId('A1', procNo, 1, 1, 1, 'ROOT');
      maps.a1Map.set(procNo, a1CellId);
      a1Rows.push({
        cellId: a1CellId,
        parentCellId: 'ROOT',
        sheetCode: 'A1',
        procNo,
        rowIdx: rowIdx + 1,
        colIdx: 1,
        seqIdx: 1,
        value: rawProcNo,
      });
    }
    const a1CellId = maps.a1Map.get(procNo)!;

    // ── A4: 제품특성 ─────────────────────────
    const charName = row[headerMap.charName]?.trim() || '';
    const key4 = a4Key(procNo, charName);
    let a4CellId: string;

    if (charName && !maps.a4Map.has(key4)) {
      const seq = (seqCountA4.get(procNo) || 0) + 1;
      seqCountA4.set(procNo, seq);
      a4CellId = buildCellId('A4', procNo, rowIdx + 1, 4, seq, a1CellId);
      maps.a4Map.set(key4, a4CellId);
      a4Rows.push({
        cellId: a4CellId,
        parentCellId: a1CellId,
        sheetCode: 'A4',
        procNo,
        rowIdx: rowIdx + 1,
        colIdx: 4,
        seqIdx: seq,
        value: charName,
        charName,
        ccFlag: headerMap.ccFlag ? row[headerMap.ccFlag]?.trim() : undefined,
      });
    } else if (charName) {
      a4CellId = maps.a4Map.get(key4)!;
    } else {
      // charName 없으면 A4 스킵
      a4CellId = '';
    }

    // ── A5: 고장형태 ─────────────────────────
    const fmText = row[headerMap.fmText]?.trim() || '';
    if (fmText) {
      const key5 = a5Key(procNo, fmText);
      if (!maps.a5Map.has(key5)) {
        const seq = (seqCountA5.get(procNo) || 0) + 1;
        seqCountA5.set(procNo, seq);
        const parentForA5 = a4CellId || a1CellId;
        const a5CellId = buildCellId('A5', procNo, rowIdx + 1, 5, seq, parentForA5);
        maps.a5Map.set(key5, a5CellId);
        a5Rows.push({
          cellId: a5CellId,
          parentCellId: parentForA5,
          sheetCode: 'A5',
          procNo,
          rowIdx: rowIdx + 1,
          colIdx: 5,
          seqIdx: seq,
          value: fmText,
          fmText,
          linkedA4CellId: a4CellId,
        });
      }
    }

    // ── A6: 검출관리 (공정 당 1개) ────────────
    const dcMethod = row[headerMap.dcMethod]?.trim() || '';
    if (dcMethod && !maps.a6Map.has(procNo)) {
      const a6CellId = buildCellId('A6', procNo, rowIdx + 1, 6, 1, a1CellId);
      maps.a6Map.set(procNo, a6CellId);
      a6Rows.push({
        cellId: a6CellId,
        parentCellId: a1CellId,
        sheetCode: 'A6',
        procNo,
        rowIdx: rowIdx + 1,
        colIdx: 6,
        seqIdx: 1,
        value: dcMethod,
        dcMethod,
      });
    }
  }

  return { a1Rows, a4Rows, a5Rows, a6Rows, errors, warnings };
}

/**
 * IL3(L3 통합시트) 파싱 — B1/B2/B3/B4/B5를 한 번에 처리
 *
 * @param rows     - IL3 시트의 행 배열 (헤더 제외)
 * @param maps     - CellIdMaps (b1Map, b4Map, b5Map 업데이트, a1Map 참조 필요)
 */
export function parseIL3Sheet(
  rows: RawExcelRow[],
  maps: CellIdMaps,
  headerMap: { procNo: string; weName: string; category4M: string; functionText: string; charName: string; causeText: string; pcMethod: string },
): {
  b1Rows: Array<CellRecord & { weName: string; category4M: string }>;
  b2Rows: Array<CellRecord & { functionText: string }>;
  b3Rows: Array<CellRecord & { charName: string }>;
  b4Rows: Array<CellRecord & { causeText: string }>;
  b5Rows: Array<CellRecord & { pcMethod: string }>;
  errors: string[];
  warnings: string[];
} {
  const b1Rows: Array<CellRecord & { weName: string; category4M: string }> = [];
  const b2Rows: Array<CellRecord & { functionText: string }> = [];
  const b3Rows: Array<CellRecord & { charName: string }> = [];
  const b4Rows: Array<CellRecord & { causeText: string }> = [];
  const b5Rows: Array<CellRecord & { pcMethod: string }> = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const seqCountB1: Map<string, number> = new Map();
  const seqCountB2: Map<string, number> = new Map();
  const seqCountB3: Map<string, number> = new Map();
  const seqCountB4: Map<string, number> = new Map();
  const seqCountB5: Map<string, number> = new Map();

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rawProcNo = row[headerMap.procNo]?.trim();
    if (!rawProcNo) continue;

    const procNo = normalizeProcNo(rawProcNo);
    const a1CellId = maps.a1Map.get(procNo);
    if (!a1CellId) {
      errors.push(`IL3[${rowIdx + 1}]: 공정번호 '${procNo}' → A1에 없음`);
      continue;
    }

    const weName = row[headerMap.weName]?.trim() || '';
    const m4 = row[headerMap.category4M]?.trim() || '';

    // ── B1: 작업요소 ─────────────────────────
    const keyB1 = b1Key(procNo, weName);
    let b1CellId: string;
    if (weName && !maps.b1Map.has(keyB1)) {
      const seq = (seqCountB1.get(procNo) || 0) + 1;
      seqCountB1.set(procNo, seq);
      b1CellId = buildCellId('B1', procNo, rowIdx + 1, 1, seq, a1CellId);
      maps.b1Map.set(keyB1, b1CellId);
      b1Rows.push({
        cellId: b1CellId,
        parentCellId: a1CellId,
        sheetCode: 'B1',
        procNo,
        rowIdx: rowIdx + 1,
        colIdx: 1,
        seqIdx: seq,
        value: weName,
        weName,
        category4M: m4,
      });
    } else if (weName) {
      b1CellId = maps.b1Map.get(keyB1)!;
    } else {
      b1CellId = '';
      errors.push(`IL3[${rowIdx + 1}]: WE(작업요소) 빈 셀`);
      continue;
    }

    // ── B2: 요소기능 ─────────────────────────
    const functionText = row[headerMap.functionText]?.trim() || '';
    if (functionText) {
      const seqKey = `${procNo}|${weName}`;
      const seq = (seqCountB2.get(seqKey) || 0) + 1;
      seqCountB2.set(seqKey, seq);
      const b2CellId = buildCellId('B2', procNo, rowIdx + 1, 4, seq, b1CellId);
      b2Rows.push({
        cellId: b2CellId,
        parentCellId: b1CellId,
        sheetCode: 'B2',
        procNo,
        rowIdx: rowIdx + 1,
        colIdx: 4,
        seqIdx: seq,
        value: functionText,
        functionText,
      });
    }

    // ── B3: 공정특성 ─────────────────────────
    const charName = row[headerMap.charName]?.trim() || '';
    if (charName) {
      const seqKey = `${procNo}|${weName}`;
      const seq = (seqCountB3.get(seqKey) || 0) + 1;
      seqCountB3.set(seqKey, seq);
      const b3CellId = buildCellId('B3', procNo, rowIdx + 1, 5, seq, b1CellId);
      b3Rows.push({
        cellId: b3CellId,
        parentCellId: b1CellId,
        sheetCode: 'B3',
        procNo,
        rowIdx: rowIdx + 1,
        colIdx: 5,
        seqIdx: seq,
        value: charName,
        charName,
      });
    }

    // ── B4: 고장원인 ─────────────────────────
    const causeText = row[headerMap.causeText]?.trim() || '';
    if (causeText) {
      const keyB4 = b4Key(procNo, causeText);
      if (!maps.b4Map.has(keyB4)) {
        const seqKey = `${procNo}|${weName}`;
        const seq = (seqCountB4.get(seqKey) || 0) + 1;
        seqCountB4.set(seqKey, seq);
        const b4CellId = buildCellId('B4', procNo, rowIdx + 1, 6, seq, b1CellId);
        maps.b4Map.set(keyB4, b4CellId);
        b4Rows.push({
          cellId: b4CellId,
          parentCellId: b1CellId,
          sheetCode: 'B4',
          procNo,
          rowIdx: rowIdx + 1,
          colIdx: 6,
          seqIdx: seq,
          value: causeText,
          causeText,
        });
      }
    }

    // ── B5: 예방관리 ─────────────────────────
    const pcMethod = row[headerMap.pcMethod]?.trim() || '';
    if (pcMethod) {
      const keyB5 = b5Key(procNo, weName, pcMethod);
      if (!maps.b5Map.has(keyB5)) {
        const seqKey = `${procNo}|${weName}`;
        const seq = (seqCountB5.get(seqKey) || 0) + 1;
        seqCountB5.set(seqKey, seq);
        const b5CellId = buildCellId('B5', procNo, rowIdx + 1, 7, seq, b1CellId);
        maps.b5Map.set(keyB5, b5CellId);
        b5Rows.push({
          cellId: b5CellId,
          parentCellId: b1CellId,
          sheetCode: 'B5',
          procNo,
          rowIdx: rowIdx + 1,
          colIdx: 7,
          seqIdx: seq,
          value: pcMethod,
          pcMethod,
        });
      }
    }
  }

  return { b1Rows, b2Rows, b3Rows, b4Rows, b5Rows, errors, warnings };
}

/**
 * IL1(L1 통합시트) 파싱 — C1/C2/C3/C4를 한 번에 처리
 */
export function parseIL1Sheet(
  rows: RawExcelRow[],
  maps: CellIdMaps,
  headerMap: { c1Category: string; functionText: string; requirement: string; effectText: string },
): {
  c1Rows: Array<CellRecord & { c1Category: string }>;
  c4Rows: Array<CellRecord & { effectText: string }>;
  errors: string[];
} {
  const c1Rows: Array<CellRecord & { c1Category: string }> = [];
  const c4Rows: Array<CellRecord & { effectText: string }> = [];
  const errors: string[] = [];

  let seqC1 = 0;
  let seqC4 = 0;

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const cat = row[headerMap.c1Category]?.trim();
    if (!cat) continue;

    // ── C1: 구분 ─────────────────────────────
    if (!maps.c1Map.has(cat)) {
      seqC1++;
      const c1CellId = buildCellId('C1', '00', rowIdx + 1, 1, seqC1, 'ROOT');
      maps.c1Map.set(cat, c1CellId);
      c1Rows.push({
        cellId: c1CellId,
        parentCellId: 'ROOT',
        sheetCode: 'C1',
        procNo: '00',
        rowIdx: rowIdx + 1,
        colIdx: 1,
        seqIdx: seqC1,
        value: cat,
        c1Category: cat,
      });
    }
    const c1CellId = maps.c1Map.get(cat)!;

    // ── C4: 고장영향 ─────────────────────────
    const effectText = row[headerMap.effectText]?.trim() || '';
    if (effectText) {
      const key = c4Key(cat, effectText);
      if (!maps.c4Map.has(key)) {
        seqC4++;
        const c4CellId = buildCellId('C4', '00', rowIdx + 1, 4, seqC4, c1CellId);
        maps.c4Map.set(key, c4CellId);
        c4Rows.push({
          cellId: c4CellId,
          parentCellId: c1CellId,
          sheetCode: 'C4',
          procNo: '00',
          rowIdx: rowIdx + 1,
          colIdx: 4,
          seqIdx: seqC4,
          value: effectText,
          effectText,
        });
      }
    }
  }

  return { c1Rows, c4Rows, errors };
}

/**
 * FC(고장사슬) 시트 파싱 — 9개 Map이 모두 구축된 후에만 호출
 *
 * @throws Error - assertMapsReady() 실패 시
 */
export function parseFCSheet(
  rows: RawExcelRow[],
  maps: CellIdMaps,
  headerMap: {
    feCategory: string;
    feText: string;
    procNo: string;
    fmText: string;
    category4M: string;
    weText: string;
    causeText: string;
    pcText: string;
    dcText: string;
  },
): ParsedSheet<FCRecord> {
  // ★ 사전 조건: 9개 Map 모두 구축 (a6Map, b5Map은 선택 → 비어있어도 허용)
  // assertMapsReady(maps); // ← 이 시점에서 모든 Map이 비어있지 않아야 함

  const fcRows: FCRecord[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  /** FM 그룹 내 FC 행 순서 */
  const seqInFM: Map<string, number> = new Map();

  // 이전 유효값 (셀병합 해제용)
  let lastProcNo = '';
  let lastFmText = '';
  let lastFeCategory = '';
  let lastFeText = '';

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];

    // 공정번호: 빈 셀 → 직전 유효값 상속
    const rawProcNo = row[headerMap.procNo]?.trim() || lastProcNo;
    if (rawProcNo) lastProcNo = rawProcNo;
    const procNo = normalizeProcNo(rawProcNo);

    // FM: 빈 셀 → 직전 유효값 상속
    const fmText = row[headerMap.fmText]?.trim() || lastFmText;
    if (fmText) lastFmText = fmText;

    // FE: 빈 셀 → 직전 유효값 상속
    const feCategory = row[headerMap.feCategory]?.trim() || lastFeCategory;
    if (feCategory) lastFeCategory = feCategory;
    const feText = row[headerMap.feText]?.trim() || lastFeText;
    if (feText) lastFeText = feText;

    const category4M = row[headerMap.category4M]?.trim() || '';
    const weText = row[headerMap.weText]?.trim() || '';
    const causeText = row[headerMap.causeText]?.trim() || '';
    const pcText = row[headerMap.pcText]?.trim() || null;
    const dcText = row[headerMap.dcText]?.trim() || null;

    // 필수 필드 검증
    if (!procNo || !fmText || !causeText) {
      if (causeText || weText) {
        errors.push(`FC[${rowIdx + 1}]: 필수 필드 누락 — procNo=${procNo} fmText=${fmText} causeText=${causeText}`);
      }
      continue;
    }

    // ── FK 역조회 ─────────────────────────────
    const procCellId = maps.a1Map.get(procNo);
    if (!procCellId) {
      errors.push(`FC[${rowIdx + 1}]: 공정번호 '${procNo}' → A1에 없음`);
      continue;
    }

    const fmCellId = maps.a5Map.get(a5Key(procNo, fmText));
    if (!fmCellId) {
      errors.push(`FC[${rowIdx + 1}]: FM '${fmText}' (공정 ${procNo}) → A5에 없음`);
      continue;
    }

    const feCellId = maps.c4Map.get(c4Key(feCategory, feText));
    if (!feCellId) {
      errors.push(`FC[${rowIdx + 1}]: FE '${feText}' (${feCategory}) → C4에 없음`);
      continue;
    }

    const weCellId = maps.b1Map.get(b1Key(procNo, weText));
    if (!weCellId) {
      errors.push(`FC[${rowIdx + 1}]: WE '${weText}' (공정 ${procNo}) → B1에 없음`);
      continue;
    }

    const causeCellId = maps.b4Map.get(b4Key(procNo, causeText));
    if (!causeCellId) {
      errors.push(`FC[${rowIdx + 1}]: 고장원인 '${causeText}' (공정 ${procNo}) → B4에 없음`);
      continue;
    }

    // PC/DC (선택)
    const pcCellId = pcText
      ? (maps.b5Map.get(b5Key(procNo, weText, pcText)) ?? null)
      : null;
    if (pcText && !pcCellId) {
      warnings.push(`FC[${rowIdx + 1}]: PC '${pcText}' → B5에 없음`);
    }

    const dcCellId = dcText
      ? (maps.a6Map.get(procNo) ?? null)
      : null;
    if (dcText && !dcCellId) {
      warnings.push(`FC[${rowIdx + 1}]: DC '${dcText}' (공정 ${procNo}) → A6에 없음`);
    }

    // ── FC cellId 생성 ────────────────────────
    const seq = (seqInFM.get(fmCellId) || 0) + 1;
    seqInFM.set(fmCellId, seq);
    const fcCellId = buildCellId('FC', procNo, rowIdx + 1, 4, seq, fmCellId);

    fcRows.push({
      cellId: fcCellId,
      parentCellId: fmCellId,
      sheetCode: 'FC',
      procNo,
      rowIdx: rowIdx + 1,
      colIdx: 4,
      seqIdx: seq,
      value: causeText,
      feCategory,
      feCellId,
      fmCellId,
      weCellId,
      causeCellId,
      pcCellId,
      dcCellId,
      fmText,
      feText,
      weText,
      causeText,
      pcText,
      dcText,
      category4M,
    });
  }

  return {
    sheetName: 'FC',
    sheetCode: 'FC',
    rows: fcRows,
    errors,
    warnings,
  };
}

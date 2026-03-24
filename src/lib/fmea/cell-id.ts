/**
 * @file cell-id.ts
 * @description 위치 인코딩 CELL_ID 생성 유틸리티
 *
 * 모든 FMEA 엔티티의 고유 ID는 위치 정보를 인코딩한 CELL_ID를 사용한다.
 * 랜덤 UUID(uid(), uuidv4(), nanoid()) 사용 금지.
 *
 * 구조: {sheetCode}_{procNo}_{rowIdx}_{colIdx}_{seqIdx}_{parentId}
 *
 * @see docs/# Smart FMEA 파이프라인 완전 재구축 마스터 체크리스트.md §0-1
 * @created 2026-03-25
 */

// ── sheetCode 코드표 ──────────────────────────────────────────
export type SheetCode =
  | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6'
  | 'B1' | 'B2' | 'B3' | 'B4' | 'B5'
  | 'C1' | 'C2' | 'C3' | 'C4'
  | 'FC' | 'FA'
  | 'IL1' | 'IL2' | 'IL3';

// ── CELL_ID 생성 함수 ──────────────────────────────────────────

/**
 * 위치 인코딩 CELL_ID 생성
 *
 * @param sheetCode - 시트 코드 (A1~C4, FC, FA)
 * @param procNo    - 공정번호 (zero-pad 2자리, C 계열은 '00')
 * @param rowIdx    - 해당 시트 내 데이터 행 번호 (1-based)
 * @param colIdx    - 열 번호 (1-based, 해당 시트 기준)
 * @param seqIdx    - 동일 부모 내 순서 (1-based)
 * @param parentId  - 부모 CELL_ID, 최상위는 'ROOT'
 * @returns 위치 인코딩 CELL_ID 문자열
 *
 * @example
 * buildCellId('A4', '10', 1, 1, 1, 'ROOT')
 * // → 'A4_10_001_001_001_ROOT'
 *
 * buildCellId('A5', '10', 3, 1, 1, 'A4_10_001_001_001_ROOT')
 * // → 'A5_10_003_001_001_A4_10_001_001_001_ROOT'
 */
export function buildCellId(
  sheetCode: SheetCode | string,
  procNo: string,
  rowIdx: number,
  colIdx: number,
  seqIdx: number,
  parentId: string,
): string {
  const pNo = procNo.padStart(2, '0');
  const row = String(rowIdx).padStart(3, '0');
  const col = String(colIdx).padStart(3, '0');
  const seq = String(seqIdx).padStart(3, '0');
  return `${sheetCode}_${pNo}_${row}_${col}_${seq}_${parentId}`;
}

// ── CELL_ID 파싱 ──────────────────────────────────────────────

export interface ParsedCellId {
  sheetCode: string;
  procNo: string;
  rowIdx: number;
  colIdx: number;
  seqIdx: number;
  parentId: string;
}

/**
 * CELL_ID를 파싱하여 위치 정보를 추출
 *
 * @param cellId - 위치 인코딩 CELL_ID
 * @returns 파싱된 위치 정보 또는 null (유효하지 않은 ID)
 */
export function parseCellId(cellId: string): ParsedCellId | null {
  if (!cellId || cellId === 'ROOT') return null;

  // 형식: {sheetCode}_{procNo}_{rowIdx}_{colIdx}_{seqIdx}_{parentId}
  // sheetCode는 1~3자, procNo는 2자리, 나머지는 3자리씩
  const match = cellId.match(/^([A-Z][A-Z0-9]{0,2})_(\d{2,})_(\d{3})_(\d{3})_(\d{3})_(.+)$/);
  if (!match) return null;

  return {
    sheetCode: match[1],
    procNo: match[2],
    rowIdx: parseInt(match[3], 10),
    colIdx: parseInt(match[4], 10),
    seqIdx: parseInt(match[5], 10),
    parentId: match[6],
  };
}

// ── 공정번호 정규화 ──────────────────────────────────────────

/**
 * 공정번호를 2자리 zero-pad 문자열로 정규화
 *
 * @param raw - 원본 공정번호 ('1', '01', '10', '100')
 * @returns zero-pad된 문자열 ('01', '01', '10', '100')
 */
export function normalizeProcNo(raw: string | number): string {
  const s = String(raw).trim();
  const n = parseInt(s, 10);
  if (isNaN(n)) return s.padStart(2, '0');
  return String(n).padStart(2, '0');
}

// ── Map 키 빌더 ──────────────────────────────────────────────

/** A4 Map 키: `${procNo}::${charName}` */
export function a4Key(procNo: string, charName: string): string {
  return `${normalizeProcNo(procNo)}::${charName.trim()}`;
}

/** A5/FM Map 키: `${procNo}::${fmText}` */
export function a5Key(procNo: string, fmText: string): string {
  return `${normalizeProcNo(procNo)}::${fmText.trim()}`;
}

/** B1/WE Map 키: `${procNo}::${weName}` */
export function b1Key(procNo: string, weName: string): string {
  return `${normalizeProcNo(procNo)}::${weName.trim()}`;
}

/** B4/FC Map 키: `${procNo}::${causeText}` */
export function b4Key(procNo: string, causeText: string): string {
  return `${normalizeProcNo(procNo)}::${causeText.trim()}`;
}

/** B5/PC Map 키: `${procNo}::${weName}::${pcMethod}` */
export function b5Key(procNo: string, weName: string, pcMethod: string): string {
  return `${normalizeProcNo(procNo)}::${weName.trim()}::${pcMethod.trim()}`;
}

/** C4/FE Map 키: `${feCategory}::${effectText}` */
export function c4Key(feCategory: string, effectText: string): string {
  return `${feCategory.trim()}::${effectText.trim()}`;
}

// ── Map 컨테이너 타입 ──────────────────────────────────────────

/**
 * FC 파싱 전 구축 필수 9개 Map
 * assertMapsReady()로 FC 파싱 시작 전 검증
 */
export interface CellIdMaps {
  a1Map: Map<string, string>;  // procNo → A1 cellId
  a4Map: Map<string, string>;  // `procNo::charName` → A4 cellId
  a5Map: Map<string, string>;  // `procNo::fmText` → A5 cellId
  a6Map: Map<string, string>;  // procNo → A6 cellId
  b1Map: Map<string, string>;  // `procNo::weName` → B1 cellId
  b4Map: Map<string, string>;  // `procNo::causeText` → B4 cellId
  b5Map: Map<string, string>;  // `procNo::weName::pcMethod` → B5 cellId
  c1Map: Map<string, string>;  // feCategory → C1 cellId
  c4Map: Map<string, string>;  // `feCategory::effectText` → C4 cellId
}

/**
 * FC 파싱 사전 조건 검증 — 9개 Map이 모두 비어있지 않은지 확인
 *
 * @throws Error - Map이 비어있으면
 */
export function assertMapsReady(maps: CellIdMaps): void {
  const required: Array<keyof CellIdMaps> = [
    'a1Map', 'a4Map', 'a5Map', 'a6Map',
    'b1Map', 'b4Map', 'b5Map',
    'c1Map', 'c4Map',
  ];
  for (const name of required) {
    if (maps[name].size === 0) {
      throw new Error(`FC 파싱 사전 조건 실패: ${name}이 비어 있음 (0건)`);
    }
  }
}

/**
 * 빈 CellIdMaps 초기화
 */
export function createEmptyMaps(): CellIdMaps {
  return {
    a1Map: new Map(),
    a4Map: new Map(),
    a5Map: new Map(),
    a6Map: new Map(),
    b1Map: new Map(),
    b4Map: new Map(),
    b5Map: new Map(),
    c1Map: new Map(),
    c4Map: new Map(),
  };
}

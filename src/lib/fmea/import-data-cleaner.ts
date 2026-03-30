/**
 * @status CODEFREEZE L4 (Pipeline Protection) u{1F512}
 * @freeze_level L4 (Critical - DFMEA Pre-Development Snapshot)
 * @frozen_date 2026-03-30
 * @snapshot_tag codefreeze-v5.0-pre-dfmea-20260330
 * @allowed_changes NONE ???ъ슜??紐낆떆???뱀씤 + full test pass ?꾩닔
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 */
/**
 * @file import-data-cleaner.ts
 * @description Import 데이터 정제 유틸 — 빈 셀 행 삭제 + cellId 무결성 보장
 *
 * ★ 2026-03-25: Import 데이터에서부터 빈 행을 제거하여 downstream 누락 방지
 *
 * 원칙:
 *   - 모든 cellId는 유효한 데이터를 가져야 함
 *   - Import 데이터에 빈 셀이 있으면 파싱 후 빈 엔티티가 생성됨 → 누락 카운트 증가
 *   - 빈 행은 Import 데이터 레벨에서 삭제하고 경고 로그 기록
 *   - 삭제 기준: 해당 시트의 핵심 필드가 모두 빈값인 행
 *
 * 사용 위치:
 *   - position-parser.ts 내부 (L3 시트: B2+B3 빈값 → 스킵)
 *   - Import JSON 정제 (이 파일: cleanImportJSON())
 *   - 엑셀 파싱 후 정제 (atomicToFlatData 전)
 *
 * @created 2026-03-25
 */

/** 빈값/대시 판별 */
function isEmptyValue(v: string | undefined | null): boolean {
  if (!v) return true;
  return /^[-–—~·.]+$/.test(v.trim()) || v.trim() === '';
}

export interface CleanLog {
  sheet: string;
  row: number;
  reason: string;
  cells: Record<string, string>;
}

/**
 * Position-based JSON의 빈 행 정제
 *
 * 삭제 기준:
 *   - L3: B2(요소기능) + B3(공정특성) + B4(고장원인) 모두 빈값 → 삭제
 *   - L2: A3(공정기능) + A4(제품특성) + A5(고장형태) 모두 빈값 → 삭제
 *   - L1: C2(제품기능) + C4(고장영향) 모두 빈값 → 삭제
 *   - FC: FC(고장원인) 빈값 → 삭제
 *
 * @returns 정제된 JSON + 삭제 로그
 */
export function cleanImportJSON(
  json: {
    sheets: Record<string, { sheetName: string; headers: string[]; rows: Array<{ excelRow: number; posId: string; cells: Record<string, string> }> }>;
    [key: string]: unknown;
  },
): { cleaned: typeof json; logs: CleanLog[] } {
  const logs: CleanLog[] = [];

  // L3 시트: B2+B3+B4 모두 빈값 → 삭제
  if (json.sheets.L3) {
    const before = json.sheets.L3.rows.length;
    json.sheets.L3.rows = json.sheets.L3.rows.filter(row => {
      const b2 = row.cells['B2'];
      const b3 = row.cells['B3'];
      const b4 = row.cells['B4'];
      if (isEmptyValue(b2) && isEmptyValue(b3) && isEmptyValue(b4)) {
        logs.push({
          sheet: 'L3',
          row: row.excelRow,
          reason: 'B2+B3+B4 모두 빈값 — cellId 생성 불가',
          cells: { processNo: row.cells['processNo'] || '', m4: row.cells['m4'] || '', B1: row.cells['B1'] || '' },
        });
        return false;
      }
      return true;
    });
    if (before !== json.sheets.L3.rows.length) {
      console.log(`[import-data-cleaner] L3: ${before - json.sheets.L3.rows.length}행 삭제 (${before} → ${json.sheets.L3.rows.length})`);
    }
  }

  // L2 시트: A3+A4+A5 모두 빈값 → 삭제
  if (json.sheets.L2) {
    const before = json.sheets.L2.rows.length;
    json.sheets.L2.rows = json.sheets.L2.rows.filter(row => {
      const a3 = row.cells['A3'];
      const a4 = row.cells['A4'];
      const a5 = row.cells['A5'];
      if (isEmptyValue(a3) && isEmptyValue(a4) && isEmptyValue(a5)) {
        logs.push({
          sheet: 'L2',
          row: row.excelRow,
          reason: 'A3+A4+A5 모두 빈값 — cellId 생성 불가',
          cells: { A1: row.cells['A1'] || '', A2: row.cells['A2'] || '' },
        });
        return false;
      }
      return true;
    });
    if (before !== json.sheets.L2.rows.length) {
      console.log(`[import-data-cleaner] L2: ${before - json.sheets.L2.rows.length}행 삭제 (${before} → ${json.sheets.L2.rows.length})`);
    }
  }

  // L1 시트: C2+C4 모두 빈값 → 삭제
  if (json.sheets.L1) {
    const before = json.sheets.L1.rows.length;
    json.sheets.L1.rows = json.sheets.L1.rows.filter(row => {
      const c2 = row.cells['C2'];
      const c4 = row.cells['C4'];
      if (isEmptyValue(c2) && isEmptyValue(c4)) {
        logs.push({
          sheet: 'L1',
          row: row.excelRow,
          reason: 'C2+C4 모두 빈값 — cellId 생성 불가',
          cells: { C1: row.cells['C1'] || '' },
        });
        return false;
      }
      return true;
    });
    if (before !== json.sheets.L1.rows.length) {
      console.log(`[import-data-cleaner] L1: ${before - json.sheets.L1.rows.length}행 삭제 (${before} → ${json.sheets.L1.rows.length})`);
    }
  }

  // FC 시트: FC(고장원인) 빈값 → 삭제
  if (json.sheets.FC) {
    const before = json.sheets.FC.rows.length;
    json.sheets.FC.rows = json.sheets.FC.rows.filter(row => {
      const fc = row.cells['FC'];
      if (isEmptyValue(fc)) {
        logs.push({
          sheet: 'FC',
          row: row.excelRow,
          reason: 'FC(고장원인) 빈값 — FailureLink 생성 불가',
          cells: { FE: row.cells['FE'] || '', FM: row.cells['FM'] || '' },
        });
        return false;
      }
      return true;
    });
    if (before !== json.sheets.FC.rows.length) {
      console.log(`[import-data-cleaner] FC: ${before - json.sheets.FC.rows.length}행 삭제 (${before} → ${json.sheets.FC.rows.length})`);
    }
  }

  if (logs.length > 0) {
    console.log(`[import-data-cleaner] 총 ${logs.length}행 삭제 — 빈 셀 행 정제 완료`);
  }

  return { cleaned: json, logs };
}

/**
 * 등록 화면 기초정보 Import: 위치기반 통합 vs 레거시 개별 15탭 분기
 */
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import type { PositionAtomicData } from '@/types/position-import';

export type RegisterBasicInfoParseResult =
  | { mode: 'position'; flat: ImportedFlatData[]; atomicData: PositionAtomicData }
  | { mode: 'legacy'; flat: ImportedFlatData[] };

const ITEM_ORDER = [
  'C1',
  'C2',
  'C3',
  'C4',
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'A6',
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
] as const;

const ITEM_LABELS: Record<(typeof ITEM_ORDER)[number], string> = {
  C1: '구분',
  C2: '제품기능',
  C3: '요구사항',
  C4: '★고장영향(FE)',
  A1: '공정번호',
  A2: '공정명',
  A3: '공정기능',
  A4: '제품특성',
  A5: '★고장형태(FM)',
  A6: '검출관리',
  B1: '작업요소',
  B2: '요소기능',
  B3: '공정특성',
  B4: '★고장원인(FC)',
  B5: '예방관리',
};

export type BdItemStatRow = {
  itemCode: string;
  label: string;
  rawCount: number;
  uniqueCount: number;
  dupSkipped: number;
};

/** BD 통계표(등록) — 위치기반 stats 없을 때 flat만으로 행 구성 */
export function buildBdItemStatsFromFlatForRegister(flat: ImportedFlatData[]): {
  itemStats: BdItemStatRow[];
  totalRawRows: number;
} {
  const itemStats: BdItemStatRow[] = ITEM_ORDER.map((itemCode) => {
    const rows = flat.filter((d) => d.itemCode === itemCode);
    return {
      itemCode,
      label: ITEM_LABELS[itemCode],
      rawCount: rows.length,
      uniqueCount: new Set(
        rows.map((r) => `${r.processNo}|${r.value}|${r.m4 ?? ''}|${r.belongsTo ?? ''}`)
      ).size,
      dupSkipped: 0,
    };
  });
  return { itemStats, totalRawRows: flat.length };
}

export async function parseRegisterBasicInfoWorkbook(
  file: File,
  fmeaIdLower: string
): Promise<RegisterBasicInfoParseResult> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheetNames = wb.worksheets.map((ws) => ws.name);
  const { isPositionBasedFormat, parsePositionBasedWorkbook, atomicToFlatData } = await import('@/lib/fmea/position-parser');
  const { isLegacyIndividualBasicInfoWorkbook, parseLegacyIndividualSheetsToFlat } = await import(
    '@/lib/fmea/legacy-individual-sheet-import'
  );
  const { normalizeFlatProcessNosForBasicImport } = await import('./basicImportFlatNormalize');

  if (isPositionBasedFormat(sheetNames)) {
    const atomicData = parsePositionBasedWorkbook(wb, fmeaIdLower);
    const rawFlat = atomicToFlatData(atomicData) as ImportedFlatData[];
    const flat = normalizeFlatProcessNosForBasicImport(rawFlat);
    return { mode: 'position', flat, atomicData };
  }
  if (isLegacyIndividualBasicInfoWorkbook(sheetNames)) {
    const rawFlat = parseLegacyIndividualSheetsToFlat(wb);
    const flat = normalizeFlatProcessNosForBasicImport(rawFlat);
    return { mode: 'legacy', flat };
  }
  throw new Error(
    '지원하지 않는 엑셀 형식입니다. 위치기반 통합(L1/L2/L3/FC) 또는 개별 15탭 기초정보 템플릿을 사용하세요.'
  );
}

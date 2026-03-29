import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import { normalizeL2ProcessNo } from '@/app/(fmea-core)/pfmea/worksheet/utils/processNoNormalize';

/** 등록 화면 기초정보 Import: A/B 행 공정번호만 3자리 정규화 (C는 구분값 유지) */
export function normalizeFlatProcessNosForBasicImport(rows: ImportedFlatData[]): ImportedFlatData[] {
  return rows.map((row) => {
    if (row.category === 'C') return row;
    const n = normalizeL2ProcessNo(row.processNo);
    return n === row.processNo ? row : { ...row, processNo: n };
  });
}

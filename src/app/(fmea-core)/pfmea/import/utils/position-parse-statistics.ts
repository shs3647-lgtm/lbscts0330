/**
 * 위치기반 parsePositionBasedWorkbook 결과 → Import 통계표(ParseStatistics) — 레거시/등록 페이지와 동일 척도
 */
import type { PositionAtomicData } from '@/types/position-import';
import type { ParseStatistics } from '../excel-parser';

export function parseStatisticsFromPositionAtomic(atomicData: PositionAtomicData): ParseStatistics {
  const s = atomicData.stats || {};
  const l1ReqLen = atomicData.l1Requirements?.length ?? 0;
  const itemStats = [
    { itemCode: 'C1', label: '구분', rawCount: s.excelC1 || s.excelL1Rows, uniqueCount: new Set(atomicData.l1Functions.map(f => f.category)).size, dupSkipped: 0 },
    { itemCode: 'C2', label: '제품기능', rawCount: s.excelC2 || s.excelL1Rows, uniqueCount: new Set(atomicData.l1Functions.map(f => f.functionName)).size, dupSkipped: 0 },
    { itemCode: 'C3', label: '요구사항', rawCount: s.excelC3 || s.excelL1Rows, uniqueCount: l1ReqLen || atomicData.l1Functions.length, dupSkipped: 0 },
    { itemCode: 'C4', label: '★고장영향(FE)', rawCount: s.excelC4 || s.excelL1Rows, uniqueCount: atomicData.failureEffects.length, dupSkipped: 0 },
    { itemCode: 'A1', label: '공정번호', rawCount: s.excelA1 || s.excelL2Rows, uniqueCount: atomicData.l2Structures.length, dupSkipped: 0 },
    { itemCode: 'A2', label: '공정명', rawCount: s.excelA2 || s.excelL2Rows, uniqueCount: atomicData.l2Structures.length, dupSkipped: 0 },
    { itemCode: 'A3', label: '공정기능', rawCount: s.excelA3 || s.excelL2Rows, uniqueCount: atomicData.l2Functions.length, dupSkipped: 0 },
    { itemCode: 'A4', label: '제품특성', rawCount: s.excelA4 || s.excelL2Rows, uniqueCount: atomicData.processProductChars.length, dupSkipped: 0 },
    { itemCode: 'A5', label: '★고장형태(FM)', rawCount: s.excelA5 || s.excelL2Rows, uniqueCount: atomicData.failureModes.length, dupSkipped: 0 },
    { itemCode: 'A6', label: '검출관리', rawCount: s.excelA6 || 0, uniqueCount: 0, dupSkipped: 0 },
    { itemCode: 'B1', label: '작업요소', rawCount: s.excelB1 || s.excelL3Rows, uniqueCount: atomicData.l3Structures.length, dupSkipped: 0 },
    { itemCode: 'B2', label: '요소기능', rawCount: s.excelB2 || s.excelL3Rows, uniqueCount: atomicData.l3Functions.length, dupSkipped: 0 },
    { itemCode: 'B3', label: '공정특성', rawCount: s.excelB3 || s.excelL3Rows, uniqueCount: atomicData.l3Functions.length, dupSkipped: 0 },
    { itemCode: 'B4', label: '★고장원인(FC)', rawCount: s.excelB4 || s.excelL3Rows, uniqueCount: atomicData.failureCauses.length, dupSkipped: 0 },
    { itemCode: 'B5', label: '예방관리', rawCount: s.excelB5 || 0, uniqueCount: 0, dupSkipped: 0 },
  ];
  const totalRawRows = (s.excelL1Rows || 0) + (s.excelL2Rows || 0) + (s.excelL3Rows || 0) + (s.excelFCRows || 0);
  return {
    source: 'position-import',
    dataSourceLine:
      '출처: 위치기반 파서(position-parser→atomic). 고유=엔티티 수, 원본·파싱 열=stats·엑셀 행 수.',
    itemStats,
    totalRawRows: totalRawRows || undefined,
    chainCount: atomicData.failureLinks?.length ?? 0,
  };
}

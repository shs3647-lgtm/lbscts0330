/**
 * @file useImportUtils.ts
 * @description Import 페이지 유틸리티 훅
 */

import { useMemo, useCallback } from 'react';
import { ImportedFlatData } from '../types';

interface UseImportUtilsProps {
  flatData: ImportedFlatData[];
  relationTab: 'A' | 'B' | 'C';
}

export function useImportUtils({ flatData, relationTab }: UseImportUtilsProps) {
  // 통계 계산
  const stats = useMemo(() => ({
    total: flatData.length,
    processCount: new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo)).size,
    aCount: flatData.filter(d => d.itemCode.startsWith('A')).length,
    bCount: flatData.filter(d => d.itemCode.startsWith('B')).length,
    cCount: flatData.filter(d => d.itemCode.startsWith('C')).length,
    missing: flatData.filter(d => !d.value || d.value.trim() === '').length,
  }), [flatData]);

  // 관계형 데이터 필터링
  const getRelationData = useCallback((tabOverride?: 'A' | 'B' | 'C') => {
    const tab = tabOverride || relationTab;
    if (tab === 'A') {
      const processes = [...new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo))];
      return processes.map(pNo => ({
        A1: pNo,
        A2: flatData.find(d => d.processNo === pNo && d.itemCode === 'A2')?.value || '',
        A3: flatData.find(d => d.processNo === pNo && d.itemCode === 'A3')?.value || '',
        A4: flatData.find(d => d.processNo === pNo && d.itemCode === 'A4')?.value || '',
        A5: flatData.find(d => d.processNo === pNo && d.itemCode === 'A5')?.value || '',
        A6: flatData.find(d => d.processNo === pNo && d.itemCode === 'A6')?.value || '',
      }));
    } else if (tab === 'B') {
      const processes = [...new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo))];
      return processes.map(pNo => ({
        A1: pNo,
        B1: flatData.find(d => d.processNo === pNo && d.itemCode === 'B1')?.value || '',
        B2: flatData.find(d => d.processNo === pNo && d.itemCode === 'B2')?.value || '',
        B3: flatData.find(d => d.processNo === pNo && d.itemCode === 'B3')?.value || '',
        B4: flatData.find(d => d.processNo === pNo && d.itemCode === 'B4')?.value || '',
        B5: flatData.find(d => d.processNo === pNo && d.itemCode === 'B5')?.value || '',
      }));
    } else {
      const c1Data = flatData.filter(d => d.itemCode === 'C1');
      const c2Data = flatData.filter(d => d.itemCode === 'C2');
      const c3Data = flatData.filter(d => d.itemCode === 'C3');
      const c4Data = flatData.filter(d => d.itemCode === 'C4');
      
      if (c1Data.length > 0) {
        return c1Data.map((p, idx) => ({
          A1: p.processNo !== 'ALL' ? p.processNo : String(idx + 1),
          C1: p.value,
          C2: c2Data[idx]?.value || '',
          C3: c3Data[idx]?.value || '',
          C4: c4Data[idx]?.value || '',
          note: '',
        }));
      }
      
      const maxLen = Math.max(c2Data.length, c3Data.length, c4Data.length, 1);
      return Array.from({ length: maxLen }).map((_, idx) => ({
        A1: String(idx + 1),
        C1: c1Data[idx]?.value || '',
        C2: c2Data[idx]?.value || '',
        C3: c3Data[idx]?.value || '',
        C4: c4Data[idx]?.value || '',
        note: '',
      }));
    }
  }, [flatData, relationTab]);

  const relationData = useMemo(() => getRelationData(), [getRelationData]);

  return {
    stats,
    getRelationData,
    relationData,
  };
}








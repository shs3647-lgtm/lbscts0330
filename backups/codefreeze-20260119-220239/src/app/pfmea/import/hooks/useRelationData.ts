/**
 * @file useRelationData.ts
 * @description 관계형 데이터 필터링 및 통계 계산 훅
 * @updated 2025-01-18 - processNo 기반 데이터 연동 개선 (A1 강제 의존성 제거)
 */

import { useMemo } from 'react';
import { ImportedFlatData } from '../types';

interface RelationDataRow {
  A1: string;
  A2?: string;
  A3?: string;
  A4?: string;
  A5?: string;
  A6?: string;
  B1?: string;
  B2?: string;
  B3?: string;
  B4?: string;
  B5?: string;
  C1?: string;
  C2?: string;
  C3?: string;
  C4?: string;
  note?: string;
  _processNo?: string; // 내부 processNo (팝업 연동용)
}

interface Stats {
  total: number;
  processCount: number;
  aCount: number;
  bCount: number;
  cCount: number;
  missing: number;
}

export function useRelationData(flatData: ImportedFlatData[], relationTab: 'A' | 'B' | 'C') {

  // 통계 계산 (빈 값 제외하여 DB 저장 기준과 일치)
  const stats = useMemo<Stats>(() => {
    // 유효한 데이터만 카운트 (DB 저장 시 빈 값은 제외됨)
    const validData = flatData.filter(d => d.value && d.value.trim() !== '');
    const emptyData = flatData.filter(d => !d.value || d.value.trim() === '');

    return {
      total: validData.length,  // 빈 값 제외 (DB 저장 건수와 일치)
      processCount: new Set(validData.filter(d => d.itemCode === 'A1').map(d => d.processNo)).size,
      aCount: validData.filter(d => d.itemCode?.startsWith('A')).length,
      bCount: validData.filter(d => d.itemCode?.startsWith('B')).length,
      cCount: validData.filter(d => d.itemCode?.startsWith('C')).length,
      missing: emptyData.length,  // 빈 값 = 누락
    };
  }, [flatData]);

  // ✅ 해당 탭의 모든 데이터에서 processNo 추출 (A1 없어도 표시)
  const getAllProcessNos = (tab: 'A' | 'B' | 'C'): { processNo: string; displayNo: string }[] => {
    const processNoSet = new Set<string>();
    const processNoMap = new Map<string, string>(); // processNo → A1 value (표시용 공정번호)

    // 1. A1 기초정보에서 processNo와 표시값 수집
    // ✅ 유효한 값이 있는 A1만 수집
    flatData.filter(d => d.itemCode === 'A1' && d.value && d.value.trim() !== '').forEach(d => {
      processNoSet.add(d.processNo);
      processNoMap.set(d.processNo, d.value);
    });

    // ✅ "00" processNo는 항상 "공통공정"으로 표시
    if (flatData.some(d => d.processNo === '00')) {
      processNoSet.add('00');
      processNoMap.set('00', '공통공정');
    }

    // 2. 해당 탭의 모든 데이터에서 processNo 추가 수집 (A1 없어도 표시되도록)
    // ✅ 유효한 값이 있는 데이터만 수집
    const tabPrefix = tab; // 'A', 'B', 'C'
    flatData.filter(d =>
      d.itemCode?.startsWith(tabPrefix) &&
      d.processNo &&
      d.processNo !== 'ALL' &&
      d.value && d.value.trim() !== '' // 빈 값 제외
    ).forEach(d => {
      if (!processNoSet.has(d.processNo)) {
        processNoSet.add(d.processNo);
        // A1 매핑이 없으면 해당 탭의 A1 value 또는 processNo 표시
        if (!processNoMap.has(d.processNo)) {
          // A1 데이터에서 해당 processNo의 value 찾기
          const a1Value = flatData.find(a => a.itemCode === 'A1' && a.processNo === d.processNo && a.value && a.value.trim() !== '')?.value;
          processNoMap.set(d.processNo, a1Value || d.processNo);
        }
      }
    });

    // 정렬 (A1 value 기준, 숫자 우선)
    // ✅ 빈 displayNo 필터링 (단, "00"은 "공통공정"으로 허용)
    return Array.from(processNoSet)
      .filter(pNo => {
        const displayNo = processNoMap.get(pNo);
        return displayNo && displayNo.trim() !== '';
      })
      .map(pNo => ({
        processNo: pNo,
        displayNo: processNoMap.get(pNo) || pNo,
      }))
      .sort((a, b) => {
        // ✅ "공통공정"(00)은 맨 앞에 표시
        if (a.processNo === '00') return -1;
        if (b.processNo === '00') return 1;
        const numA = parseInt(a.displayNo, 10);
        const numB = parseInt(b.displayNo, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return (a.displayNo || '').localeCompare(b.displayNo || '', 'ko');
      });
  };

  // 관계형 데이터 필터링 + processNo 기준 정렬
  const getRelationData = (tabOverride?: 'A' | 'B' | 'C'): RelationDataRow[] => {
    const tab = tabOverride || relationTab;

    if (tab === 'A') {
      // ✅ 모든 관련 processNo 기준으로 행 생성 (A1 없어도 표시)
      const allProcesses = getAllProcessNos('A');

      if (allProcesses.length === 0) return [];

      return allProcesses.map(({ processNo, displayNo }) => ({
        A1: displayNo,
        A2: flatData.find(d => d.processNo === processNo && d.itemCode === 'A2')?.value || '',
        A3: flatData.find(d => d.processNo === processNo && d.itemCode === 'A3')?.value || '',
        A4: flatData.find(d => d.processNo === processNo && d.itemCode === 'A4')?.value || '',
        A5: flatData.find(d => d.processNo === processNo && d.itemCode === 'A5')?.value || '',
        A6: flatData.find(d => d.processNo === processNo && d.itemCode === 'A6')?.value || '',
        _processNo: processNo, // 내부 processNo 저장 (팝업 연동용)
      }));
    } else if (tab === 'B') {
      // ✅ 모든 관련 processNo 기준으로 행 생성 (A1 없어도 표시)
      const allProcesses = getAllProcessNos('B');

      if (allProcesses.length === 0) return [];

      return allProcesses.map(({ processNo, displayNo }) => ({
        A1: displayNo,
        B1: flatData.find(d => d.processNo === processNo && d.itemCode === 'B1')?.value || '',
        B2: flatData.find(d => d.processNo === processNo && d.itemCode === 'B2')?.value || '',
        B3: flatData.find(d => d.processNo === processNo && d.itemCode === 'B3')?.value || '',
        B4: flatData.find(d => d.processNo === processNo && d.itemCode === 'B4')?.value || '',
        B5: flatData.find(d => d.processNo === processNo && d.itemCode === 'B5')?.value || '',
        _processNo: processNo, // 내부 processNo 저장 (팝업 연동용)
      }));
    } else {
      // C 레벨 - C1(구분) 기준으로 행 생성
      // ✅ A1 컬럼에 C1 value(구분: YOUR PLANT/SHIP TO PLANT/USER 등)를 표시
      const c1Data = flatData.filter(d => d.itemCode === 'C1');
      const c2Data = flatData.filter(d => d.itemCode === 'C2');
      const c3Data = flatData.filter(d => d.itemCode === 'C3');
      const c4Data = flatData.filter(d => d.itemCode === 'C4');

      if (c1Data.length > 0) {
        return c1Data.map((p, idx) => ({
          // ✅ 수정: processNo 대신 C1 value(구분)를 표시
          A1: p.value || String(idx + 1),
          C1: p.value,
          C2: c2Data[idx]?.value || '',
          C3: c3Data[idx]?.value || '',
          C4: c4Data[idx]?.value || '',
          note: '',
          _processNo: p.processNo,
        }));
      }

      // C1 없이 C2, C3, C4만 있는 경우
      const maxLen = Math.max(c2Data.length, c3Data.length, c4Data.length, 0);
      if (maxLen === 0) return [];

      return Array.from({ length: maxLen }).map((_, idx) => ({
        A1: String(idx + 1),
        C1: c1Data[idx]?.value || '',
        C2: c2Data[idx]?.value || '',
        C3: c3Data[idx]?.value || '',
        C4: c4Data[idx]?.value || '',
        note: '',
        _processNo: c2Data[idx]?.processNo || c3Data[idx]?.processNo || c4Data[idx]?.processNo || `c-${idx}`,
      }));
    }
  };

  const relationData = useMemo(() => getRelationData(), [flatData, relationTab]);

  return {
    stats,
    getRelationData,
    relationData,
  };
}



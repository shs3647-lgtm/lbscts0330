/**
 * @file hooks/useRowSpan.ts
 * @description rowSpan 계산 훅 (공정, 공정설명, 설비 그룹별)
 */

import { useMemo } from 'react';
import { CPItem, SpanInfo } from '../types';

/**
 * 공정번호+공정명 기준 rowSpan 계산
 */
export function useProcessRowSpan(items: CPItem[]): SpanInfo[] {
  return useMemo(() => {
    const result: SpanInfo[] = [];
    let i = 0;
    
    while (i < items.length) {
      const currentItem = items[i];
      const processKey = `${currentItem.processNo}-${currentItem.processName}`;
      
      // 같은 공정의 연속 행 수 계산
      let span = 1;
      while (i + span < items.length) {
        const nextItem = items[i + span];
        const nextKey = `${nextItem.processNo}-${nextItem.processName}`;
        if (nextKey === processKey) {
          span++;
        } else {
          break;
        }
      }
      
      // 첫 번째 행은 isFirst=true, span 설정
      result[i] = { isFirst: true, span };
      // 나머지 행은 isFirst=false
      for (let j = 1; j < span; j++) {
        result[i + j] = { isFirst: false, span: 0 };
      }
      
      i += span;
    }
    
    return result;
  }, [items]);
}

/**
 * 공정+레벨+공정설명 기준 rowSpan 계산
 * - D열에서 행추가 시: 고유값으로 병합 방지
 * - E열에서 행추가 시: 현재 값 복사 → 병합됨 (상위이므로)
 */
export function useDescRowSpan(items: CPItem[]): SpanInfo[] {
  return useMemo(() => {
    const result: SpanInfo[] = [];
    let i = 0;
    
    while (i < items.length) {
      const currentItem = items[i];
      // 공정번호+공정명+레벨+공정설명 조합으로 그룹핑
      const descKey = `${currentItem.processNo}-${currentItem.processName}-${currentItem.processLevel}-${currentItem.processDesc}`;
      
      // 같은 그룹의 연속 행 수 계산 (D열 빈 값 체크 제거 - 하위에서 행추가 시 병합되도록)
      let span = 1;
      while (i + span < items.length) {
        const nextItem = items[i + span];
        const nextKey = `${nextItem.processNo}-${nextItem.processName}-${nextItem.processLevel}-${nextItem.processDesc}`;
        if (nextKey === descKey) {
          span++;
        } else {
          break;
        }
      }
      
      // 첫 번째 행은 isFirst=true, span 설정
      result[i] = { isFirst: true, span };
      // 나머지 행은 isFirst=false
      for (let j = 1; j < span; j++) {
        result[i + j] = { isFirst: false, span: 0 };
      }
      
      i += span;
    }
    
    return result;
  }, [items]);
}

/**
 * E열(설비/금형/JIG) rowSpan 계산
 * - E열에서 행추가 시: E열 빈 값 → 병합 안 됨
 * - I열에서 행추가 시: E열 값 복사 → E열 병합됨 (상위이므로)
 */
export function useWorkRowSpan(items: CPItem[]): SpanInfo[] {
  return useMemo(() => {
    const result: SpanInfo[] = [];
    let i = 0;
    
    while (i < items.length) {
      const currentItem = items[i];
      // 공정번호+공정명+레벨+공정설명+설비 조합으로 그룹핑
      const workKey = `${currentItem.processNo}-${currentItem.processName}-${currentItem.processLevel}-${currentItem.processDesc}-${currentItem.workElement}`;
      
      // E열(설비)이 빈 값이면 병합하지 않음
      const isEmpty = !currentItem.workElement;
      
      // 같은 그룹의 연속 행 수 계산
      let span = 1;
      if (!isEmpty) {
        while (i + span < items.length) {
          const nextItem = items[i + span];
          const nextKey = `${nextItem.processNo}-${nextItem.processName}-${nextItem.processLevel}-${nextItem.processDesc}-${nextItem.workElement}`;
          const nextIsEmpty = !nextItem.workElement;
          if (nextKey === workKey && !nextIsEmpty) {
            span++;
          } else {
            break;
          }
        }
      }
      
      result[i] = { isFirst: true, span };
      for (let j = 1; j < span; j++) {
        result[i + j] = { isFirst: false, span: 0 };
      }
      
      i += span;
    }
    
    return result;
  }, [items]);
}

/**
 * 공정+레벨+공정설명+설비+제품특성 기준 rowSpan 계산
 * I열(제품특성) 병합을 위한 독립적인 rowSpan 계산
 * 각 병합은 독립적으로 수행되며, 상위 병합 결과는 항상 유지됨
 */
export function useCharRowSpan(items: CPItem[]): SpanInfo[] {
  return useMemo(() => {
    const result: SpanInfo[] = [];
    let i = 0;
    
    while (i < items.length) {
      const currentItem = items[i];
      // 공정번호+공정명+레벨+공정설명+설비+제품특성 조합으로 그룹핑
      const charKey = `${currentItem.processNo}-${currentItem.processName}-${currentItem.processLevel}-${currentItem.processDesc}-${currentItem.workElement}-${currentItem.productChar}`;
      
      // 제품특성(I열)이 빈 값이면 병합하지 않음 (I열은 병합 안 됨)
      const isEmpty = !currentItem.productChar;
      
      // 같은 그룹의 연속 행 수 계산
      let span = 1;
      if (!isEmpty) {
        // 빈 값이 아닌 경우에만 병합 계산
        while (i + span < items.length) {
          const nextItem = items[i + span];
          const nextKey = `${nextItem.processNo}-${nextItem.processName}-${nextItem.processLevel}-${nextItem.processDesc}-${nextItem.workElement}-${nextItem.productChar}`;
          const nextIsEmpty = !nextItem.productChar; // I열이 빈 값이면 병합 안 됨
          if (nextKey === charKey && !nextIsEmpty) {
            span++;
          } else {
            break;
          }
        }
      }
      
      // 첫 번째 행은 isFirst=true, span 설정
      result[i] = { isFirst: true, span };
      // 나머지 행은 isFirst=false
      for (let j = 1; j < span; j++) {
        result[i + j] = { isFirst: false, span: 0 };
      }
      
      i += span;
    }
    
    return result;
  }, [items]);
}




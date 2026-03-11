/**
 * @file hooks/useRowSpan.ts
 * @description rowSpan 계산 훅 (공정, 공정설명, 설비, 특성 그룹별)
 * @updated 2026-01-25 - CP와 동일한 병합 로직 적용
 */

import { useMemo } from 'react';
import { PfdItem, SpanInfo } from '../types';

/**
 * 공정번호+공정명 기준 rowSpan 계산
 */
export function useProcessRowSpan(items: PfdItem[]): SpanInfo[] {
  return useMemo(() => {
    const result: SpanInfo[] = [];
    let i = 0;

    while (i < items.length) {
      const currentItem = items[i];
      const processKey = `${currentItem.processNo || ''}-${currentItem.processName || ''}`;

      // 같은 공정의 연속 행 수 계산
      let span = 1;
      while (i + span < items.length) {
        const nextItem = items[i + span];
        const nextKey = `${nextItem.processNo || ''}-${nextItem.processName || ''}`;
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
 * - 빈 값도 동일하게 병합됨 (부모 미입력도 확장병합)
 */
export function useDescRowSpan(items: PfdItem[]): SpanInfo[] {
  return useMemo(() => {
    const result: SpanInfo[] = [];
    let i = 0;

    while (i < items.length) {
      const currentItem = items[i];
      // 공정번호+공정명+레벨+공정설명 조합으로 그룹핑 (null/undefined → 빈 문자열 정규화)
      const descKey = `${currentItem.processNo || ''}-${currentItem.processName || ''}-${currentItem.processLevel || ''}-${currentItem.processDesc || ''}`;

      // 같은 그룹의 연속 행 수 계산 (빈 값도 병합됨)
      let span = 1;
      while (i + span < items.length) {
        const nextItem = items[i + span];
        const nextKey = `${nextItem.processNo || ''}-${nextItem.processName || ''}-${nextItem.processLevel || ''}-${nextItem.processDesc || ''}`;
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
 * E열(부품명) rowSpan 계산
 * ★★★ 2026-01-31 수정: CP와 동일하게 연속된 같은 partName 값으로 병합 ★★★
 */
export function useWorkRowSpan(items: PfdItem[]): SpanInfo[] {
  return useMemo(() => {
    const result: SpanInfo[] = [];
    let i = 0;

    while (i < items.length) {
      const currentItem = items[i];
      // ★ partName 값으로 그룹핑 (연속된 같은 값이면 병합)
      const partName = currentItem.partName || '';

      // 같은 partName의 연속 행 수 계산
      let span = 1;
      while (i + span < items.length) {
        const nextItem = items[i + span];
        const nextPartName = nextItem.partName || '';
        if (nextPartName === partName && partName !== '') {
          span++;
        } else {
          break;
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
 * F열(설비/금형/JIG) rowSpan 계산
 * ★★★ 2026-01-31 수정: CP와 동일하게 연속된 같은 equipment 값으로 병합 ★★★
 */
export function useEquipmentRowSpan(items: PfdItem[]): SpanInfo[] {
  return useMemo(() => {
    const result: SpanInfo[] = [];
    let i = 0;

    while (i < items.length) {
      const currentItem = items[i];
      // ★ equipment 값으로 그룹핑 (연속된 같은 값이면 병합)
      const equipment = currentItem.equipment || '';

      // 같은 equipment의 연속 행 수 계산
      let span = 1;
      while (i + span < items.length) {
        const nextItem = items[i + span];
        const nextEquipment = nextItem.equipment || '';
        if (nextEquipment === equipment && equipment !== '') {
          span++;
        } else {
          break;
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
 */
export function useCharRowSpan(items: PfdItem[]): SpanInfo[] {
  return useMemo(() => {
    const result: SpanInfo[] = [];
    let i = 0;

    while (i < items.length) {
      const currentItem = items[i];
      // 공정번호+공정명+레벨+공정설명+부품명+설비+제품특성 조합으로 그룹핑 (null/undefined → 빈 문자열 정규화)
      const charKey = `${currentItem.processNo || ''}-${currentItem.processName || ''}-${currentItem.processLevel || ''}-${currentItem.processDesc || ''}-${currentItem.partName || ''}-${currentItem.equipment || ''}-${currentItem.productChar || ''}`;

      // 제품특성(I열)이 빈 값이면 병합하지 않음 (I열은 병합 안 됨)
      const isEmpty = !currentItem.productChar;

      // 같은 그룹의 연속 행 수 계산
      let span = 1;
      if (!isEmpty) {
        while (i + span < items.length) {
          const nextItem = items[i + span];
          const nextKey = `${nextItem.processNo || ''}-${nextItem.processName || ''}-${nextItem.processLevel || ''}-${nextItem.processDesc || ''}-${nextItem.partName || ''}-${nextItem.equipment || ''}-${nextItem.productChar || ''}`;
          const nextIsEmpty = !nextItem.productChar;
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
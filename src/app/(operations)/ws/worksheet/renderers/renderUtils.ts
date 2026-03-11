/**
 * @file renderUtils.ts
 * @description 렌더러 유틸리티 함수 (groupIndex, charNo 계산)
 * @created 2026-02-10 - renderers/index.tsx O(n²) 로직 최적화 분리
 */

import { PfdItem } from '../types';

type GroupType = 'part' | 'equip' | 'process';

/**
 * 줄무늬 그룹 인덱스 pre-compute (O(n) 전체 계산)
 * 렌더 시 매 행마다 O(n)으로 순회하던 로직을 한번에 계산
 */
export function precomputeGroupIndices(
  items: PfdItem[],
  groupType: GroupType
): number[] {
  const result: number[] = [];
  let groupIndex = 0;
  let prevValue = '';

  for (let i = 0; i < items.length; i++) {
    let val: string;
    if (groupType === 'part') {
      val = items[i].partName || '';
    } else if (groupType === 'equip') {
      val = items[i].equipment || '';
    } else {
      val = `${items[i].processNo}_${items[i].processName}`;
    }

    if (val !== prevValue && i > 0) groupIndex++;
    prevValue = val;
    result.push(groupIndex);
  }

  return result;
}

/**
 * 공정별 특성 순번 pre-compute (O(n) 전체 계산)
 * 같은 공정(processNo-processName) 내에서 순번 (공정 바뀌면 1로 리셋)
 */
export function precomputeCharNos(items: PfdItem[]): number[] {
  const result: number[] = [];
  const processCountMap = new Map<string, number>();

  for (const item of items) {
    const processKey = `${item.processNo}-${item.processName}`;
    const count = (processCountMap.get(processKey) || 0) + 1;
    processCountMap.set(processKey, count);
    result.push(count);
  }

  return result;
}

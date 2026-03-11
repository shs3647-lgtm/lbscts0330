/**
 * @file cp-context-menu-handlers.test.ts
 * @description CP 워크시트 컨텍스트 메뉴 핸들러 단위 테스트
 * - part 타입 insertAbove/insertBelow 핸들러 검증
 * - general 타입 메뉴 표시 검증
 * - sortOrder 불변성 검증 (mutation 방지)
 * - 모든 타입의 행 삽입 위치 정확성 검증
 */

import { describe, it, expect, vi } from 'vitest';
import { CPItem, CPState, ContextMenuType } from '@/app/(fmea-core)/control-plan/worksheet/types';
import { createEmptyItem } from '@/app/(fmea-core)/control-plan/worksheet/utils';

// ============ 테스트 헬퍼 ============

/** 테스트용 CPItem 생성 (최소 필드) */
function makeItem(overrides: Partial<CPItem> & { id: string }): CPItem {
  return {
    cpId: 'cp-test',
    processNo: '',
    processName: '',
    processLevel: '',
    processDesc: '',
    partName: '',
    equipment: '',
    detectorNo: false,
    detectorEp: false,
    detectorAuto: false,
    productChar: '',
    processChar: '',
    specialChar: '',
    charIndex: 0,
    specTolerance: '',
    evalMethod: '',
    sampleSize: '',
    sampleFreq: '',
    controlMethod: '',
    owner1: '',
    owner2: '',
    reactionPlan: '',
    sortOrder: 0,
    ...overrides,
  };
}

/** 테스트 시나리오: 3개 공정, 부품명 병합 그룹 포함 */
function createTestItems(): CPItem[] {
  return [
    // 공정 10: partName="부품A" (2행 병합 그룹)
    makeItem({ id: 'r0', processNo: '10', processName: '프레스', processLevel: 'L1', processDesc: '프레스가공', partName: '부품A', equipment: '프레스기', sortOrder: 0 }),
    makeItem({ id: 'r1', processNo: '10', processName: '프레스', processLevel: 'L1', processDesc: '프레스가공', partName: '부품A', equipment: '프레스기', sortOrder: 1 }),
    // 공정 10: partName="부품B" (1행)
    makeItem({ id: 'r2', processNo: '10', processName: '프레스', processLevel: 'L1', processDesc: '프레스가공', partName: '부품B', equipment: '프레스기', sortOrder: 2 }),
    // 공정 20: partName="부품C" (2행 병합 그룹)
    makeItem({ id: 'r3', processNo: '20', processName: '용접', processLevel: 'L2', processDesc: '스팟용접', partName: '부품C', equipment: '용접기', sortOrder: 3 }),
    makeItem({ id: 'r4', processNo: '20', processName: '용접', processLevel: 'L2', processDesc: '스팟용접', partName: '부품C', equipment: '용접기', sortOrder: 4 }),
    // 공정 30: general 열 테스트용 (1행)
    makeItem({ id: 'r5', processNo: '30', processName: '검사', processLevel: 'L3', processDesc: '외관검사', partName: '', equipment: '검사대', sortOrder: 5, specTolerance: '0.5mm', evalMethod: '치수검사' }),
  ];
}

function createTestState(items: CPItem[]): CPState {
  return {
    cpNo: 'cp-test',
    fmeaId: 'fmea-test',
    fmeaNo: 'FMEA-001',
    linkedPfdNo: '',
    partName: '테스트품',
    customer: '테스트사',
    items,
    dirty: false,
  };
}

// ============ 핸들러 로직 순수 함수 추출 (테스트 가능하게) ============

/**
 * handleInsertRowAbove의 핵심 로직을 순수 함수로 추출
 * Hook 내부의 setState 콜백 대신, 새 items 배열을 직접 반환
 */
function insertRowAbovePure(items: CPItem[], cpNo: string, rowIdx: number, type: ContextMenuType, colKey?: string): CPItem[] {
  const currentItem = items[rowIdx];

  if (type === 'process' && (colKey === 'processNo' || colKey === 'processName')) {
    const currentKey = `${currentItem?.processNo}-${currentItem?.processName}`;
    let groupStartIdx = rowIdx;
    for (let i = rowIdx - 1; i >= 0; i--) {
      const prevKey = `${items[i].processNo}-${items[i].processName}`;
      if (prevKey === currentKey) groupStartIdx = i;
      else break;
    }
    const newItem = createEmptyItem(cpNo, '__unique_a__', '__unique_b__');
    const newItems = [...items];
    newItems.splice(groupStartIdx, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  if (type === 'work') {
    const targetItem = items[rowIdx];
    const descKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}`;
    let groupStartIdx = rowIdx;
    for (let i = rowIdx - 1; i >= 0; i--) {
      const prevKey = `${items[i].processNo}-${items[i].processName}-${items[i].processLevel}-${items[i].processDesc}`;
      if (prevKey === descKey) groupStartIdx = i;
      else break;
    }
    const newItem = createEmptyItem(cpNo, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    const newItems = [...items];
    newItems.splice(groupStartIdx, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  if (type === 'part') {
    const targetItem = items[rowIdx];
    const partName = targetItem.partName || '';
    let groupStartIdx = rowIdx;
    if (partName) {
      for (let i = rowIdx - 1; i >= 0; i--) {
        if ((items[i].partName || '') === partName) groupStartIdx = i;
        else break;
      }
    }
    const newItem = createEmptyItem(cpNo, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    newItem.equipment = targetItem.equipment ?? '';
    // partName = empty
    const newItems = [...items];
    newItems.splice(groupStartIdx, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  if (type === 'char') {
    const targetItem = items[rowIdx];
    const workKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}-${targetItem.equipment}`;
    let groupStartIdx = rowIdx;
    for (let i = rowIdx - 1; i >= 0; i--) {
      const prevKey = `${items[i].processNo}-${items[i].processName}-${items[i].processLevel}-${items[i].processDesc}-${items[i].equipment}`;
      if (prevKey === workKey) groupStartIdx = i;
      else break;
    }
    const newItem = createEmptyItem(cpNo, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    newItem.equipment = targetItem.equipment ?? '';
    const newItems = [...items];
    newItems.splice(groupStartIdx, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // general / default (processDesc)
  const targetItem = items[rowIdx];
  const descKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}`;
  let groupStartIdx = rowIdx;
  for (let i = rowIdx - 1; i >= 0; i--) {
    const prevKey = `${items[i].processNo}-${items[i].processName}-${items[i].processLevel}-${items[i].processDesc}`;
    if (prevKey === descKey) groupStartIdx = i;
    else break;
  }
  const newItem = createEmptyItem(cpNo, targetItem.processNo, targetItem.processName);
  newItem.processLevel = '__unique__';
  newItem.processDesc = '__unique__';
  const newItems = [...items];
  newItems.splice(groupStartIdx, 0, newItem);
  return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
}

function insertRowBelowPure(items: CPItem[], cpNo: string, rowIdx: number, type: ContextMenuType, colKey?: string): CPItem[] {
  const currentItem = items[rowIdx];

  if (type === 'process' && (colKey === 'processNo' || colKey === 'processName')) {
    const currentKey = `${currentItem?.processNo}-${currentItem?.processName}`;
    let groupEndIdx = rowIdx;
    for (let i = rowIdx + 1; i < items.length; i++) {
      const nextKey = `${items[i].processNo}-${items[i].processName}`;
      if (nextKey === currentKey) groupEndIdx = i;
      else break;
    }
    const newItem = createEmptyItem(cpNo, '__unique_a__', '__unique_b__');
    const newItems = [...items];
    newItems.splice(groupEndIdx + 1, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  if (type === 'work') {
    const targetItem = items[rowIdx];
    const descKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}`;
    let groupEndIdx = rowIdx;
    for (let i = rowIdx + 1; i < items.length; i++) {
      const nextKey = `${items[i].processNo}-${items[i].processName}-${items[i].processLevel}-${items[i].processDesc}`;
      if (nextKey === descKey) groupEndIdx = i;
      else break;
    }
    const newItem = createEmptyItem(cpNo, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    const newItems = [...items];
    newItems.splice(groupEndIdx + 1, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  if (type === 'part') {
    const targetItem = items[rowIdx];
    const partName = targetItem.partName || '';
    let groupEndIdx = rowIdx;
    if (partName) {
      for (let i = rowIdx + 1; i < items.length; i++) {
        if ((items[i].partName || '') === partName) groupEndIdx = i;
        else break;
      }
    }
    const newItem = createEmptyItem(cpNo, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    newItem.equipment = targetItem.equipment ?? '';
    const newItems = [...items];
    newItems.splice(groupEndIdx + 1, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  if (type === 'char') {
    const targetItem = items[rowIdx];
    const workKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}-${targetItem.equipment}`;
    let groupEndIdx = rowIdx;
    for (let i = rowIdx + 1; i < items.length; i++) {
      const nextKey = `${items[i].processNo}-${items[i].processName}-${items[i].processLevel}-${items[i].processDesc}-${items[i].equipment}`;
      if (nextKey === workKey) groupEndIdx = i;
      else break;
    }
    const newItem = createEmptyItem(cpNo, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    newItem.equipment = targetItem.equipment ?? '';
    const newItems = [...items];
    newItems.splice(groupEndIdx + 1, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // ★ process + processDesc (CD열) → CD 병합 그룹 끝+1에 삽입, A/B 확장병합, C/D 고유값
  if (type === 'process' && colKey === 'processDesc') {
    const targetItem = items[rowIdx];
    const descKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}`;
    let groupEndIdx = rowIdx;
    for (let i = rowIdx + 1; i < items.length; i++) {
      const nextKey = `${items[i].processNo}-${items[i].processName}-${items[i].processLevel}-${items[i].processDesc}`;
      if (nextKey === descKey) groupEndIdx = i;
      else break;
    }
    const newItem = createEmptyItem(cpNo, targetItem.processNo, targetItem.processName);
    newItem.processLevel = '__unique__';
    newItem.processDesc = '__unique__';
    const newItems = [...items];
    newItems.splice(groupEndIdx + 1, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // general / default
  const newItem = createEmptyItem(cpNo, currentItem?.processNo || '', currentItem?.processName || '');
  const newItems = [...items];
  newItems.splice(rowIdx + 1, 0, newItem);
  return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
}

// ============ 테스트 ============

describe('CP 컨텍스트 메뉴 핸들러', () => {

  // ====== part 타입: insertAbove ======
  describe('part 타입 insertAbove', () => {
    it('partName 병합 그룹 맨 위에 새 행 삽입 (r0에서 우클릭)', () => {
      const items = createTestItems();
      const result = insertRowAbovePure(items, 'cp-test', 0, 'part');

      // 원래 6행 → 7행
      expect(result.length).toBe(7);
      // 새 행이 인덱스 0에 삽입 (부품A 그룹 시작점)
      expect(result[0].partName).toBe('');  // 새 행: partName 빈값
      // 부모 열 확장병합 확인
      expect(result[0].processNo).toBe('10');
      expect(result[0].processName).toBe('프레스');
      expect(result[0].processLevel).toBe('L1');
      expect(result[0].processDesc).toBe('프레스가공');
      expect(result[0].equipment).toBe('프레스기');
      // 기존 r0은 인덱스 1로 밀림
      expect(result[1].id).toBe('r0');
    });

    it('partName 병합 그룹 중간 행에서 우클릭 시 그룹 시작점에 삽입 (r1에서 우클릭)', () => {
      const items = createTestItems();
      // r1은 부품A 그룹의 두번째 행 (idx=1)
      const result = insertRowAbovePure(items, 'cp-test', 1, 'part');

      expect(result.length).toBe(7);
      // 부품A 그룹 시작점(idx=0)에 삽입
      expect(result[0].partName).toBe('');  // 새 행
      expect(result[1].id).toBe('r0');  // 기존 r0
      expect(result[2].id).toBe('r1');  // 기존 r1
    });

    it('partName이 빈 행에서 우클릭 시 해당 행 위치에 삽입', () => {
      const items = createTestItems();
      // r5는 partName='' (idx=5)
      const result = insertRowAbovePure(items, 'cp-test', 5, 'part');

      expect(result.length).toBe(7);
      // partName이 빈 경우 그룹 없음 → rowIdx 위치에 삽입
      expect(result[5].partName).toBe('');  // 새 행
      expect(result[6].id).toBe('r5');  // 기존 r5가 아래로 밀림
    });

    it('다른 공정의 부품명 그룹에서 위로 삽입 (r3=부품C)', () => {
      const items = createTestItems();
      // r3은 부품C 그룹 첫번째 행 (idx=3)
      const result = insertRowAbovePure(items, 'cp-test', 3, 'part');

      expect(result.length).toBe(7);
      // 부품C 그룹 시작 idx=3에 삽입
      expect(result[3].partName).toBe('');
      expect(result[3].processNo).toBe('20');
      expect(result[3].processName).toBe('용접');
      expect(result[3].equipment).toBe('용접기');
      expect(result[4].id).toBe('r3');
    });
  });

  // ====== part 타입: insertBelow ======
  describe('part 타입 insertBelow', () => {
    it('partName 병합 그룹 맨 아래+1에 새 행 삽입 (r0에서 우클릭)', () => {
      const items = createTestItems();
      const result = insertRowBelowPure(items, 'cp-test', 0, 'part');

      expect(result.length).toBe(7);
      // 부품A 그룹 끝(idx=1) 다음인 idx=2에 삽입
      expect(result[2].partName).toBe('');  // 새 행
      expect(result[2].processNo).toBe('10');
      expect(result[2].processName).toBe('프레스');
      expect(result[2].equipment).toBe('프레스기');
      // 기존 r2(부품B)는 idx=3으로 밀림
      expect(result[3].id).toBe('r2');
    });

    it('partName 병합 그룹 마지막 행에서 우클릭 (r4=부품C 그룹 끝)', () => {
      const items = createTestItems();
      // r4는 부품C 그룹 마지막 행 (idx=4)
      const result = insertRowBelowPure(items, 'cp-test', 4, 'part');

      expect(result.length).toBe(7);
      // 부품C 그룹 끝(idx=4) 다음인 idx=5에 삽입
      expect(result[5].partName).toBe('');
      expect(result[5].processNo).toBe('20');
      expect(result[5].processName).toBe('용접');
      expect(result[5].equipment).toBe('용접기');
      // 기존 r5(검사행)는 idx=6으로 밀림
      expect(result[6].id).toBe('r5');
    });

    it('partName이 빈 행에서 우클릭 시 해당 행 바로 아래에 삽입', () => {
      const items = createTestItems();
      // r5는 partName='' (idx=5, 마지막 행)
      const result = insertRowBelowPure(items, 'cp-test', 5, 'part');

      expect(result.length).toBe(7);
      // partName이 빈 경우 그룹 없음 → rowIdx+1에 삽입
      expect(result[5].id).toBe('r5');  // 기존 행 유지
      expect(result[6].partName).toBe('');  // 새 행이 맨 마지막에
    });
  });

  // ====== sortOrder 불변성 검증 ======
  describe('sortOrder 불변성 (mutation 방지)', () => {
    it('insertAbove 후 원본 items의 sortOrder가 변경되지 않음', () => {
      const items = createTestItems();
      // 원본 sortOrder 스냅샷
      const originalOrders = items.map(it => it.sortOrder);

      insertRowAbovePure(items, 'cp-test', 2, 'part');

      // 원본 배열의 sortOrder가 변경되지 않아야 함
      items.forEach((item, idx) => {
        expect(item.sortOrder).toBe(originalOrders[idx]);
      });
    });

    it('insertBelow 후 원본 items의 sortOrder가 변경되지 않음', () => {
      const items = createTestItems();
      const originalOrders = items.map(it => it.sortOrder);

      insertRowBelowPure(items, 'cp-test', 2, 'part');

      items.forEach((item, idx) => {
        expect(item.sortOrder).toBe(originalOrders[idx]);
      });
    });

    it('모든 타입에서 결과의 sortOrder가 0부터 연속', () => {
      const items = createTestItems();
      const types: ContextMenuType[] = ['process', 'work', 'char', 'part', 'general'];

      for (const type of types) {
        const colKey = type === 'process' ? 'processNo' : undefined;
        const resultAbove = insertRowAbovePure(items, 'cp-test', 2, type, colKey);
        resultAbove.forEach((item, idx) => {
          expect(item.sortOrder).toBe(idx);
        });

        const resultBelow = insertRowBelowPure(items, 'cp-test', 2, type, colKey);
        resultBelow.forEach((item, idx) => {
          expect(item.sortOrder).toBe(idx);
        });
      }
    });

    it('원본 배열 길이가 변하지 않음 (불변성)', () => {
      const items = createTestItems();
      const originalLength = items.length;

      insertRowAbovePure(items, 'cp-test', 0, 'part');
      expect(items.length).toBe(originalLength);

      insertRowBelowPure(items, 'cp-test', 0, 'part');
      expect(items.length).toBe(originalLength);
    });
  });

  // ====== process 타입 ======
  describe('process 타입 (A,B열)', () => {
    it('AB열 insertAbove: 병합 그룹 맨 위에 고유값 행 삽입', () => {
      const items = createTestItems();
      // r1(idx=1)에서 우클릭 → 공정10 그룹 시작(idx=0)에 삽입
      const result = insertRowAbovePure(items, 'cp-test', 1, 'process', 'processNo');

      expect(result.length).toBe(7);
      expect(result[0].processNo).toBe('__unique_a__');
      expect(result[0].processName).toBe('__unique_b__');
      expect(result[1].id).toBe('r0');
    });

    it('AB열 insertBelow: 병합 그룹 맨 아래 다음에 고유값 행 삽입', () => {
      const items = createTestItems();
      // r0(idx=0)에서 우클릭 → 공정10 그룹 끝(idx=2) 다음에 삽입
      const result = insertRowBelowPure(items, 'cp-test', 0, 'process', 'processNo');

      expect(result.length).toBe(7);
      // 공정10 그룹: r0,r1,r2 (processNo=10) → 그룹 끝=idx=2 → 새 행 idx=3
      expect(result[3].processNo).toBe('__unique_a__');
      expect(result[4].id).toBe('r3');
    });
  });

  // ====== work 타입 ======
  describe('work 타입 (E열)', () => {
    it('insertAbove: CD 병합 그룹 맨 위에 A~D 확장병합 행 삽입', () => {
      const items = createTestItems();
      // r1(idx=1, 프레스가공 그룹)에서 우클릭
      const result = insertRowAbovePure(items, 'cp-test', 1, 'work');

      expect(result.length).toBe(7);
      // 프레스가공 그룹 시작 = idx=0
      expect(result[0].processNo).toBe('10');
      expect(result[0].processName).toBe('프레스');
      expect(result[0].processLevel).toBe('L1');
      expect(result[0].processDesc).toBe('프레스가공');
      expect(result[0].equipment).toBe('');  // E열 빈값
    });
  });

  // ====== char 타입 ======
  describe('char 타입 (I열)', () => {
    it('insertBelow: E열 병합 그룹 맨 아래+1에 A~E 확장병합 행 삽입', () => {
      const items = createTestItems();
      // r3(idx=3, 용접기 그룹)에서 우클릭
      const result = insertRowBelowPure(items, 'cp-test', 3, 'char');

      expect(result.length).toBe(7);
      // 용접기 그룹: r3,r4 (같은 equipment key) → 그룹 끝=idx=4 → 새 행 idx=5
      expect(result[5].processNo).toBe('20');
      expect(result[5].equipment).toBe('용접기');
      expect(result[5].productChar).toBe('');  // I열 빈값
    });
  });

  // ====== general 타입 ======
  describe('general 타입 (기본 열)', () => {
    it('insertBelow: 현재 행 바로 아래에 삽입', () => {
      const items = createTestItems();
      // r5(idx=5, 검사행)에서 general 타입으로 우클릭
      const result = insertRowBelowPure(items, 'cp-test', 5, 'general');

      expect(result.length).toBe(7);
      expect(result[5].id).toBe('r5');  // 기존 행 유지
      expect(result[6].processNo).toBe('30');
      expect(result[6].processName).toBe('검사');
    });

    it('insertAbove: CD 병합 그룹 기준으로 맨 위에 삽입', () => {
      const items = createTestItems();
      // r5(idx=5)에서 general 타입으로 위쪽 삽입
      const result = insertRowAbovePure(items, 'cp-test', 5, 'general');

      expect(result.length).toBe(7);
      // r5는 단독 행이므로 idx=5에 새 행 삽입
      expect(result[5].processLevel).toBe('__unique__');
      expect(result[6].id).toBe('r5');
    });
  });

  // ====== 엣지 케이스 ======
  describe('엣지 케이스', () => {
    it('단일 행에서 part insertAbove', () => {
      const items = [makeItem({ id: 'solo', processNo: '10', processName: 'A', partName: 'X', sortOrder: 0 })];
      const result = insertRowAbovePure(items, 'cp', 0, 'part');

      expect(result.length).toBe(2);
      expect(result[0].partName).toBe('');
      expect(result[1].id).toBe('solo');
    });

    it('단일 행에서 part insertBelow', () => {
      const items = [makeItem({ id: 'solo', processNo: '10', processName: 'A', partName: 'X', sortOrder: 0 })];
      const result = insertRowBelowPure(items, 'cp', 0, 'part');

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('solo');
      expect(result[1].partName).toBe('');
    });

    it('연속 3행 같은 partName에서 가운데 행 우클릭 → 그룹 시작에 삽입', () => {
      const items = [
        makeItem({ id: 'a', processNo: '10', processName: 'P', partName: 'Z', sortOrder: 0 }),
        makeItem({ id: 'b', processNo: '10', processName: 'P', partName: 'Z', sortOrder: 1 }),
        makeItem({ id: 'c', processNo: '10', processName: 'P', partName: 'Z', sortOrder: 2 }),
      ];
      const result = insertRowAbovePure(items, 'cp', 1, 'part');

      expect(result.length).toBe(4);
      expect(result[0].partName).toBe('');  // 새 행 (그룹 시작)
      expect(result[1].id).toBe('a');
      expect(result[2].id).toBe('b');
      expect(result[3].id).toBe('c');
    });

    it('연속 3행 같은 partName에서 가운데 행 우클릭 insertBelow → 그룹 끝+1에 삽입', () => {
      const items = [
        makeItem({ id: 'a', processNo: '10', processName: 'P', partName: 'Z', sortOrder: 0 }),
        makeItem({ id: 'b', processNo: '10', processName: 'P', partName: 'Z', sortOrder: 1 }),
        makeItem({ id: 'c', processNo: '10', processName: 'P', partName: 'Z', sortOrder: 2 }),
      ];
      const result = insertRowBelowPure(items, 'cp', 1, 'part');

      expect(result.length).toBe(4);
      expect(result[0].id).toBe('a');
      expect(result[1].id).toBe('b');
      expect(result[2].id).toBe('c');
      expect(result[3].partName).toBe('');  // 새 행 (그룹 끝+1)
    });
  });

  // ====== CPContextMenu isSpecialColumn 로직 검증 ======
  describe('CPContextMenu: isSpecialColumn 로직', () => {
    // CPContextMenu의 isSpecialColumn 로직을 순수 함수로 재현
    function isMenuShowingInsertButtons(type: ContextMenuType, colKey?: string): boolean {
      const isABColumn = colKey === 'processNo' || colKey === 'processName';
      const isSpecialColumn = (type === 'process' && !isABColumn)
        || type === 'work'
        || type === 'char'
        || type === 'part'
        || type === 'general';
      return isABColumn || isSpecialColumn;
    }

    it('process + processNo → 행 추가 메뉴 표시', () => {
      expect(isMenuShowingInsertButtons('process', 'processNo')).toBe(true);
    });

    it('process + processDesc → 행 추가 메뉴 표시', () => {
      expect(isMenuShowingInsertButtons('process', 'processDesc')).toBe(true);
    });

    it('work → 행 추가 메뉴 표시', () => {
      expect(isMenuShowingInsertButtons('work', 'equipment')).toBe(true);
    });

    it('char → 행 추가 메뉴 표시', () => {
      expect(isMenuShowingInsertButtons('char', 'productChar')).toBe(true);
    });

    it('part → 행 추가 메뉴 표시', () => {
      expect(isMenuShowingInsertButtons('part', 'partName')).toBe(true);
    });

    it('general → 행 추가 메뉴 표시 (이전 버그: 미표시였음)', () => {
      expect(isMenuShowingInsertButtons('general', 'specTolerance')).toBe(true);
      expect(isMenuShowingInsertButtons('general', 'evalMethod')).toBe(true);
      expect(isMenuShowingInsertButtons('general', 'controlMethod')).toBe(true);
      expect(isMenuShowingInsertButtons('general', 'reactionPlan')).toBe(true);
    });
  });

  // ====== createEmptyItem 검증 ======
  describe('createEmptyItem 기본값 검증', () => {
    it('빈 항목의 필수 필드가 올바르게 초기화됨', () => {
      const item = createEmptyItem('cp-1', '10', 'Press');

      expect(item.cpId).toBe('cp-1');
      expect(item.processNo).toBe('10');
      expect(item.processName).toBe('Press');
      expect(item.partName).toBe('');
      expect(item.equipment).toBe('');
      expect(item.productChar).toBe('');
      expect(item.processChar).toBe('');
      expect(item.sortOrder).toBe(0);
      expect(item.id).toMatch(/^cpi-/);
    });
  });

  // ====== U-01 ~ U-03: process(CD) 타입 ======
  describe('process(CD) 타입 (processDesc/processLevel)', () => {
    it('U-01: insertAbove colKey=processDesc → CD 병합 그룹 시작에 삽입, processNo/processName 복사, processLevel/processDesc 고유값', () => {
      const items = createTestItems();
      // r0(idx=0)에서 processDesc 열로 위쪽 삽입
      const result = insertRowAbovePure(items, 'cp-test', 0, 'process', 'processDesc');

      expect(result.length).toBe(7);
      // 새 행이 그룹 시작에 삽입됨
      expect(result[0].processNo).toBe('10');       // A열: 현재행 복사
      expect(result[0].processName).toBe('프레스');   // B열: 현재행 복사
      expect(result[0].processLevel).toBe('__unique__');  // C열: 고유값
      expect(result[0].processDesc).toBe('__unique__');   // D열: 고유값
      // 기존 r0은 아래로 밀림
      expect(result[1].id).toBe('r0');
    });

    it('U-02: insertBelow colKey=processDesc → CD 병합 그룹 끝+1에 삽입, A/B 확장병합, C/D 고유값', () => {
      const items = createTestItems();
      // r0(idx=0)에서 processDesc 열로 아래쪽 삽입
      // 프레스가공 그룹: r0,r1,r2 (같은 descKey) → 그룹 끝=idx=2
      const result = insertRowBelowPure(items, 'cp-test', 0, 'process', 'processDesc');

      expect(result.length).toBe(7);
      // CD 병합 그룹 끝(idx=2) 다음인 idx=3에 삽입
      expect(result[3].processNo).toBe('10');        // A열: 확장병합
      expect(result[3].processName).toBe('프레스');    // B열: 확장병합
      expect(result[3].processLevel).toBe('__unique__');  // C열: 고유값
      expect(result[3].processDesc).toBe('__unique__');   // D열: 고유값
      // 기존 r3(용접)은 idx=4로 밀림
      expect(result[4].id).toBe('r3');
    });

    it('U-03: insertAbove colKey=processLevel → isABColumn false이므로 CD 기본 로직 진입', () => {
      const items = createTestItems();
      // processLevel은 isABColumn이 false → default(CD) 로직
      const result = insertRowAbovePure(items, 'cp-test', 3, 'process', 'processLevel');

      expect(result.length).toBe(7);
      // r3(용접,L2,스팟용접)의 CD 그룹 시작=idx=3에 삽입
      expect(result[3].processNo).toBe('20');
      expect(result[3].processName).toBe('용접');
      expect(result[3].processLevel).toBe('__unique__');
      expect(result[3].processDesc).toBe('__unique__');
      expect(result[4].id).toBe('r3');
    });
  });

  // ====== U-04: work insertBelow ======
  describe('work 타입 insertBelow', () => {
    it('U-04: insertBelow → CD 병합 그룹 끝+1에 삽입, A~D 확장병합, E열 빈값', () => {
      const items = createTestItems();
      // r1(idx=1, 프레스가공 그룹)에서 work 타입 아래쪽 삽입
      // 프레스가공 descKey 그룹: r0,r1,r2 → 그룹 끝=idx=2
      const result = insertRowBelowPure(items, 'cp-test', 1, 'work');

      expect(result.length).toBe(7);
      // 그룹 끝(idx=2) 다음인 idx=3에 삽입
      expect(result[3].processNo).toBe('10');        // A열: 확장병합
      expect(result[3].processName).toBe('프레스');    // B열: 확장병합
      expect(result[3].processLevel).toBe('L1');      // C열: 확장병합
      expect(result[3].processDesc).toBe('프레스가공'); // D열: 확장병합
      expect(result[3].equipment).toBe('');           // E열: 빈값 (새 행)
      expect(result[4].id).toBe('r3');
    });
  });

  // ====== U-05: char insertAbove ======
  describe('char 타입 insertAbove', () => {
    it('U-05: insertAbove → E열 병합 그룹 시작에 삽입, A~E 확장병합', () => {
      const items = createTestItems();
      // r4(idx=4, 용접기 그룹)에서 char 타입 위쪽 삽입
      // 용접기 workKey 그룹: r3,r4 → 그룹 시작=idx=3
      const result = insertRowAbovePure(items, 'cp-test', 4, 'char');

      expect(result.length).toBe(7);
      // E열 병합 그룹 시작(idx=3)에 삽입
      expect(result[3].processNo).toBe('20');         // A열: 확장병합
      expect(result[3].processName).toBe('용접');      // B열: 확장병합
      expect(result[3].processLevel).toBe('L2');       // C열: 확장병합
      expect(result[3].processDesc).toBe('스팟용접');   // D열: 확장병합
      expect(result[3].equipment).toBe('용접기');       // E열: 확장병합
      expect(result[3].productChar).toBe('');          // I열: 빈값
      expect(result[4].id).toBe('r3');
    });
  });

  // ====== U-06 ~ U-08: handleDeleteRow 순수 함수 ======
  describe('handleDeleteRow 순수 함수', () => {
    /** deleteRow 순수 함수 추출 */
    function deleteRowPure(items: CPItem[], rowIdx: number): CPItem[] | null {
      if (items.length <= 1) return null;
      const filtered = items.filter((_, idx) => idx !== rowIdx);
      return filtered.map((item, idx) => ({ ...item, sortOrder: idx }));
    }

    it('U-06: 일반 삭제 — 6행 중 idx=2 삭제 → 5행, sortOrder 0~4, 나머지 id 보존', () => {
      const items = createTestItems();
      const result = deleteRowPure(items, 2);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(5);
      // sortOrder 연속 확인
      result!.forEach((item, idx) => {
        expect(item.sortOrder).toBe(idx);
      });
      // r2가 삭제되었으므로 나머지 id 보존
      expect(result!.map(r => r.id)).toEqual(['r0', 'r1', 'r3', 'r4', 'r5']);
    });

    it('U-07: 최소 1행 보호 — 1행만 존재 시 삭제 시도 → null 반환', () => {
      const items = [makeItem({ id: 'solo', processNo: '10', processName: 'A', sortOrder: 0 })];
      const result = deleteRowPure(items, 0);

      expect(result).toBeNull();
    });

    it('U-08: sortOrder 불변성 — 삭제 전후 원본 배열 sortOrder 미변경', () => {
      const items = createTestItems();
      const originalOrders = items.map(it => it.sortOrder);

      deleteRowPure(items, 2);

      // 원본 배열의 sortOrder가 변경되지 않아야 함
      items.forEach((item, idx) => {
        expect(item.sortOrder).toBe(originalOrders[idx]);
      });
      // 원본 배열 길이도 보존
      expect(items.length).toBe(6);
    });
  });

  // ====== U-09: handleAddRow 순수 함수 ======
  describe('handleAddRow 순수 함수', () => {
    function addRowPure(items: CPItem[], cpNo: string): CPItem[] {
      const lastItem = items[items.length - 1];
      const newItem = createEmptyItem(cpNo, lastItem?.processNo || '', lastItem?.processName || '');
      return [...items, { ...newItem, sortOrder: items.length }];
    }

    it('U-09: 맨 아래 추가 — 6행 → 7행, 마지막 행 processNo/processName 복사', () => {
      const items = createTestItems();
      const result = addRowPure(items, 'cp-test');

      expect(result.length).toBe(7);
      // 마지막 행(r5=검사)의 processNo/processName 복사
      expect(result[6].processNo).toBe('30');
      expect(result[6].processName).toBe('검사');
      expect(result[6].sortOrder).toBe(6);
      // 새 행의 partName은 빈값
      expect(result[6].partName).toBe('');
      // 기존 행은 그대로
      expect(result[5].id).toBe('r5');
    });
  });

  // ====== U-10 ~ U-12: Undo/Redo 순수 함수 ======
  describe('Undo/Redo 순수 함수', () => {
    const MAX_HISTORY_COUNT = 10;

    function undoPure<T>(currentItems: T[], undoHistory: T[][]): { items: T[]; undoHistory: T[][]; redoHistory: T[][] } | null {
      if (undoHistory.length === 0) return null;
      const previousItems = undoHistory[undoHistory.length - 1];
      return {
        items: previousItems,
        undoHistory: undoHistory.slice(0, -1),
        redoHistory: [[...currentItems]],
      };
    }

    function redoPure<T>(currentItems: T[], redoHistory: T[][]): { items: T[]; undoHistory: T[][]; redoHistory: T[][] } | null {
      if (redoHistory.length === 0) return null;
      const nextItems = redoHistory[redoHistory.length - 1];
      return {
        items: nextItems,
        undoHistory: [[...currentItems]],
        redoHistory: redoHistory.slice(0, -1),
      };
    }

    function saveToHistoryPure<T>(currentItems: T[], undoHistory: T[][]): T[][] {
      const newHistory = [...undoHistory, [...currentItems]];
      if (newHistory.length > MAX_HISTORY_COUNT) {
        return newHistory.slice(-MAX_HISTORY_COUNT);
      }
      return newHistory;
    }

    it('U-10: saveToHistory + Undo → 이전 상태 복원', () => {
      const stateA = [makeItem({ id: 'a', sortOrder: 0 })];
      const stateB = [makeItem({ id: 'b', sortOrder: 0 })];

      // stateA를 히스토리에 저장
      const history = saveToHistoryPure(stateA, []);
      expect(history.length).toBe(1);

      // 현재 stateB에서 Undo → stateA로 복원
      const undoResult = undoPure(stateB, history);
      expect(undoResult).not.toBeNull();
      expect(undoResult!.items[0].id).toBe('a');      // 이전 상태 복원
      expect(undoResult!.undoHistory.length).toBe(0);  // undo 히스토리 소진
      expect(undoResult!.redoHistory.length).toBe(1);  // redo에 현재 상태 저장
      expect(undoResult!.redoHistory[0][0].id).toBe('b');
    });

    it('U-11: Undo + Redo → 원래 상태 복원', () => {
      const stateA = [makeItem({ id: 'a', sortOrder: 0 })];
      const stateB = [makeItem({ id: 'b', sortOrder: 0 })];

      // stateA → stateB 변경 후 Undo
      const history = saveToHistoryPure(stateA, []);
      const undoResult = undoPure(stateB, history)!;

      // undoResult.items = stateA, redoHistory에 stateB 있음
      // Redo 실행 → stateB로 복원
      const redoResult = redoPure(undoResult.items, undoResult.redoHistory);
      expect(redoResult).not.toBeNull();
      expect(redoResult!.items[0].id).toBe('b');       // 원래 상태 복원
      expect(redoResult!.undoHistory.length).toBe(1);   // undo에 현재(A) 저장
      expect(redoResult!.undoHistory[0][0].id).toBe('a');
      expect(redoResult!.redoHistory.length).toBe(0);   // redo 소진
    });

    it('U-12: MAX_HISTORY_COUNT(10) 초과 시 오래된 히스토리 제거', () => {
      let history: CPItem[][] = [];

      // 12번 저장 (MAX=10 초과)
      for (let i = 0; i < 12; i++) {
        const state = [makeItem({ id: `item-${i}`, sortOrder: 0 })];
        history = saveToHistoryPure(state, history);
      }

      // 최대 10개만 유지
      expect(history.length).toBe(10);
      // 가장 오래된 것(item-0, item-1)은 제거됨, item-2부터 시작
      expect(history[0][0].id).toBe('item-2');
      expect(history[9][0].id).toBe('item-11');
    });
  });

  // ====== U-13: handleMergeUp 순수 함수 ======
  describe('handleMergeUp 순수 함수', () => {
    function mergeUpPure(items: CPItem[], rowIdx: number, colKey: string): CPItem[] {
      if (rowIdx <= 0) return items;
      const aboveValue = (items[rowIdx - 1] as unknown as Record<string, unknown>)[colKey];
      return items.map((item, idx) =>
        idx === rowIdx ? { ...item, [colKey]: aboveValue } : item
      );
    }

    it('U-13: rowIdx=1, colKey=processNo → items[1].processNo가 items[0].processNo 값으로 병합', () => {
      const items = [
        makeItem({ id: 'a', processNo: 'P10', processName: 'A', sortOrder: 0 }),
        makeItem({ id: 'b', processNo: 'P20', processName: 'B', sortOrder: 1 }),
        makeItem({ id: 'c', processNo: 'P30', processName: 'C', sortOrder: 2 }),
      ];

      const result = mergeUpPure(items, 1, 'processNo');

      // items[1].processNo가 items[0].processNo('P10')로 변경
      expect(result[1].processNo).toBe('P10');
      // 나머지는 변경 없음
      expect(result[0].processNo).toBe('P10');
      expect(result[2].processNo).toBe('P30');
      // id 보존
      expect(result[1].id).toBe('b');
    });

    it('U-13 엣지: rowIdx=0에서 mergeUp → 변경 없이 원본 반환', () => {
      const items = createTestItems();
      const result = mergeUpPure(items, 0, 'processNo');

      // rowIdx=0이면 위 행 없음 → 그대로 반환
      expect(result).toBe(items);
    });
  });

  // ====== U-14: handleUnmerge 순수 함수 ======
  describe('handleUnmerge 순수 함수', () => {
    function unmergePure(items: CPItem[], rowIdx: number, colKey: string): CPItem[] {
      return items.map((item, idx) =>
        idx === rowIdx ? { ...item, [colKey]: `_unmerge_${Date.now()}` } : item
      );
    }

    it('U-14: rowIdx=1, colKey=processNo → items[1].processNo가 고유값("_"로 시작)', () => {
      const items = [
        makeItem({ id: 'a', processNo: 'P10', processName: 'A', sortOrder: 0 }),
        makeItem({ id: 'b', processNo: 'P10', processName: 'A', sortOrder: 1 }),
        makeItem({ id: 'c', processNo: 'P10', processName: 'A', sortOrder: 2 }),
      ];

      const result = unmergePure(items, 1, 'processNo');

      // items[1].processNo가 '_'로 시작하는 고유값으로 변경
      expect(result[1].processNo).toMatch(/^_/);
      // 원래 값과 다름
      expect(result[1].processNo).not.toBe('P10');
      // 나머지는 변경 없음
      expect(result[0].processNo).toBe('P10');
      expect(result[2].processNo).toBe('P10');
      // id 보존
      expect(result[1].id).toBe('b');
    });

    it('U-14 불변성: unmerge 후 원본 배열 미변경', () => {
      const items = createTestItems();
      const originalProcessNo = items[1].processNo;

      unmergePure(items, 1, 'processNo');

      // 원본 불변
      expect(items[1].processNo).toBe(originalProcessNo);
    });
  });
});

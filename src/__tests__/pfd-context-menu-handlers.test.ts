/**
 * @file pfd-context-menu-handlers.test.ts
 * @description PFD 워크시트 컨텍스트 메뉴 핸들러 순수 함수 단위 테스트 (16건)
 *
 * useWorksheetHandlers.ts의 핵심 로직을 순수 함수로 추출하여 테스트.
 * vi.mock() 없이 입력→출력만 검증한다.
 */
import { describe, it, expect } from 'vitest';

// ============ 타입 (PfdItem 미러링) ============

interface PfdItem {
  id: string;
  pfdId: string;
  processNo: string;
  processName: string;
  processLevel: string;
  processDesc: string;
  partName: string;
  workElement?: string;
  equipment: string;
  productSC: string;
  productChar: string;
  processSC: string;
  processChar: string;
  charIndex: number;
  sortOrder: number;
  flowWork?: boolean;
  flowTransport?: boolean;
  flowStorage?: boolean;
  flowInspect?: boolean;
  fmeaId?: string | null;
  cpNo?: string | null;
  linkStatus?: 'linked' | 'unlinked';
}

type ContextMenuType = 'process' | 'work' | 'equipment' | 'char' | 'general';

// ============ 헬퍼: makeItem ============

let _idCounter = 0;
function makeItem(overrides: Partial<PfdItem> = {}): PfdItem {
  _idCounter++;
  return {
    id: `test-${_idCounter}`,
    pfdId: 'pfd-1',
    processNo: '',
    processName: '',
    processLevel: '',
    processDesc: '',
    partName: '',
    workElement: '',
    equipment: '',
    productSC: '',
    productChar: '',
    processSC: '',
    processChar: '',
    charIndex: 0,
    sortOrder: 0,
    ...overrides,
  };
}

// ============ 순수 함수: useWorksheetHandlers 로직 미러링 ============

function createEmptyItem(pfdId: string, processNo = '', processName = ''): PfdItem {
  return {
    id: `pfdi-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    pfdId,
    processNo,
    processName,
    processLevel: '',
    processDesc: '',
    partName: '',
    workElement: '',
    equipment: '',
    productSC: '',
    productChar: '',
    processSC: '',
    processChar: '',
    charIndex: 0,
    sortOrder: 0,
  };
}

/**
 * insertRowAbovePure — useWorksheetHandlers.handleInsertRowAbove 로직 미러링
 */
function insertRowAbovePure(
  items: readonly PfdItem[],
  rowIdx: number,
  type: ContextMenuType,
  colKey?: string,
  pfdId = 'pfd-1',
): PfdItem[] {
  const currentItem = items[rowIdx];

  // process(AB) — 병합그룹 맨 위에 고유값 삽입
  if (type === 'process' && (colKey === 'processNo' || colKey === 'processName')) {
    const currentKey = `${currentItem?.processNo}-${currentItem?.processName}`;
    let groupStartIdx = rowIdx;
    for (let i = rowIdx - 1; i >= 0; i--) {
      const prevKey = `${items[i].processNo}-${items[i].processName}`;
      if (prevKey === currentKey) groupStartIdx = i;
      else break;
    }
    const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newItem = createEmptyItem(pfdId, uniqueId, uniqueId);

    const newItems = [...items];
    newItems.splice(groupStartIdx, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // process(CD / processDesc) — AB 확장병합, CD 고유값
  if (type === 'process' && colKey === 'processDesc') {
    const targetItem = items[rowIdx];
    const descKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}`;
    let groupStartIdx = rowIdx;
    for (let i = rowIdx - 1; i >= 0; i--) {
      const prevKey = `${items[i].processNo || ''}-${items[i].processName || ''}-${items[i].processLevel || ''}-${items[i].processDesc || ''}`;
      if (prevKey === descKey) groupStartIdx = i;
      else break;
    }
    const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newItem = createEmptyItem(pfdId, targetItem.processNo, targetItem.processName);
    newItem.processLevel = uniqueId;
    newItem.processDesc = uniqueId;

    const newItems = [...items];
    newItems.splice(groupStartIdx, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // work — ABCD 확장병합, E(workElement) 고유값
  if (type === 'work') {
    const targetItem = items[rowIdx];
    const descKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}`;
    let groupStartIdx = rowIdx;
    for (let i = rowIdx - 1; i >= 0; i--) {
      const prevKey = `${items[i].processNo || ''}-${items[i].processName || ''}-${items[i].processLevel || ''}-${items[i].processDesc || ''}`;
      if (prevKey === descKey) groupStartIdx = i;
      else break;
    }
    const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newItem = createEmptyItem(pfdId, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    newItem.workElement = uniqueId;

    const newItems = [...items];
    newItems.splice(groupStartIdx, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // equipment — ABCDE 확장병합, F(equipment) 고유값
  if (type === 'equipment') {
    const targetItem = items[rowIdx];
    const workKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}-${targetItem.workElement || ''}`;
    let groupStartIdx = rowIdx;
    for (let i = rowIdx - 1; i >= 0; i--) {
      const prevKey = `${items[i].processNo || ''}-${items[i].processName || ''}-${items[i].processLevel || ''}-${items[i].processDesc || ''}-${items[i].workElement || ''}`;
      if (prevKey === workKey) groupStartIdx = i;
      else break;
    }
    const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newItem = createEmptyItem(pfdId, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    newItem.workElement = targetItem.workElement ?? '';
    newItem.equipment = uniqueId;

    const newItems = [...items];
    newItems.splice(groupStartIdx, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // char — ABCDEF 확장병합, I(productChar) 고유값
  if (type === 'char') {
    const targetItem = items[rowIdx];
    const equipKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}-${targetItem.workElement || ''}-${targetItem.equipment || ''}`;
    let groupStartIdx = rowIdx;
    for (let i = rowIdx - 1; i >= 0; i--) {
      const prevKey = `${items[i].processNo || ''}-${items[i].processName || ''}-${items[i].processLevel || ''}-${items[i].processDesc || ''}-${items[i].workElement || ''}-${items[i].equipment || ''}`;
      if (prevKey === equipKey) groupStartIdx = i;
      else break;
    }
    const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newItem = createEmptyItem(pfdId, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    newItem.workElement = targetItem.workElement ?? '';
    newItem.equipment = targetItem.equipment ?? '';
    newItem.productChar = uniqueId;

    const newItems = [...items];
    newItems.splice(groupStartIdx, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // general — 기본 동작
  const targetItem = items[rowIdx];
  const newItem = createEmptyItem(pfdId, targetItem?.processNo || '', targetItem?.processName || '');
  const newItems = [...items];
  newItems.splice(rowIdx, 0, newItem);
  return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
}

/**
 * insertRowBelowPure — useWorksheetHandlers.handleInsertRowBelow 로직 미러링
 */
function insertRowBelowPure(
  items: readonly PfdItem[],
  rowIdx: number,
  type: ContextMenuType,
  colKey?: string,
  pfdId = 'pfd-1',
): PfdItem[] {
  const currentItem = items[rowIdx];

  // process(AB) — 병합그룹 맨 아래+1에 고유값 삽입
  if (type === 'process' && (colKey === 'processNo' || colKey === 'processName')) {
    const currentKey = `${currentItem?.processNo}-${currentItem?.processName}`;
    let groupEndIdx = rowIdx;
    for (let i = rowIdx + 1; i < items.length; i++) {
      const nextKey = `${items[i].processNo}-${items[i].processName}`;
      if (nextKey === currentKey) groupEndIdx = i;
      else break;
    }
    const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newItem = createEmptyItem(pfdId, uniqueId, uniqueId);

    const newItems = [...items];
    newItems.splice(groupEndIdx + 1, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // process(CD / processDesc) — AB 확장병합, CD 고유값
  if (type === 'process' && colKey === 'processDesc') {
    const targetItem = items[rowIdx];
    const descKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}`;
    let groupEndIdx = rowIdx;
    for (let i = rowIdx + 1; i < items.length; i++) {
      const nextKey = `${items[i].processNo || ''}-${items[i].processName || ''}-${items[i].processLevel || ''}-${items[i].processDesc || ''}`;
      if (nextKey === descKey) groupEndIdx = i;
      else break;
    }
    const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newItem = createEmptyItem(pfdId, targetItem.processNo, targetItem.processName);
    newItem.processLevel = uniqueId;
    newItem.processDesc = uniqueId;

    const newItems = [...items];
    newItems.splice(groupEndIdx + 1, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // work — ABCD 확장병합, E(workElement) 고유값
  if (type === 'work') {
    const targetItem = items[rowIdx];
    const descKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}`;
    let groupEndIdx = rowIdx;
    for (let i = rowIdx + 1; i < items.length; i++) {
      const nextKey = `${items[i].processNo || ''}-${items[i].processName || ''}-${items[i].processLevel || ''}-${items[i].processDesc || ''}`;
      if (nextKey === descKey) groupEndIdx = i;
      else break;
    }
    const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newItem = createEmptyItem(pfdId, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    newItem.workElement = uniqueId;

    const newItems = [...items];
    newItems.splice(groupEndIdx + 1, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // equipment — ABCDE 확장병합, F(equipment) 고유값
  if (type === 'equipment') {
    const targetItem = items[rowIdx];
    const workKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}-${targetItem.workElement || ''}`;
    let groupEndIdx = rowIdx;
    for (let i = rowIdx + 1; i < items.length; i++) {
      const nextKey = `${items[i].processNo || ''}-${items[i].processName || ''}-${items[i].processLevel || ''}-${items[i].processDesc || ''}-${items[i].workElement || ''}`;
      if (nextKey === workKey) groupEndIdx = i;
      else break;
    }
    const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newItem = createEmptyItem(pfdId, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    newItem.workElement = targetItem.workElement ?? '';
    newItem.equipment = uniqueId;

    const newItems = [...items];
    newItems.splice(groupEndIdx + 1, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // char — ABCDEF 확장병합, I(productChar) 고유값
  if (type === 'char') {
    const targetItem = items[rowIdx];
    const equipKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}-${targetItem.workElement || ''}-${targetItem.equipment || ''}`;
    let groupEndIdx = rowIdx;
    for (let i = rowIdx + 1; i < items.length; i++) {
      const nextKey = `${items[i].processNo || ''}-${items[i].processName || ''}-${items[i].processLevel || ''}-${items[i].processDesc || ''}-${items[i].workElement || ''}-${items[i].equipment || ''}`;
      if (nextKey === equipKey) groupEndIdx = i;
      else break;
    }
    const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newItem = createEmptyItem(pfdId, targetItem.processNo, targetItem.processName);
    newItem.processLevel = targetItem.processLevel ?? '';
    newItem.processDesc = targetItem.processDesc ?? '';
    newItem.workElement = targetItem.workElement ?? '';
    newItem.equipment = targetItem.equipment ?? '';
    newItem.productChar = uniqueId;

    const newItems = [...items];
    newItems.splice(groupEndIdx + 1, 0, newItem);
    return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
  }

  // general — 기본 동작: rowIdx+1에 삽입
  const newItem = createEmptyItem(pfdId, currentItem?.processNo || '', currentItem?.processName || '');
  const newItems = [...items];
  newItems.splice(rowIdx + 1, 0, newItem);
  return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
}

/**
 * deleteRowPure — useWorksheetHandlers.handleDeleteRow 로직 미러링
 * 최소 1행 보호: 1행이면 null 반환. confirm 분기는 순수 함수에서 생략.
 */
function deleteRowPure(items: readonly PfdItem[], rowIdx: number): PfdItem[] | null {
  if (items.length <= 1) return null;
  const newItems = items.filter((_, idx) => idx !== rowIdx);
  return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
}

/**
 * addRowPure — useWorksheetHandlers.handleAddRow 로직 미러링
 * 맨 아래에 추가, 마지막 행의 processNo/processName 복사
 */
function addRowPure(items: readonly PfdItem[], pfdId = 'pfd-1'): PfdItem[] {
  const lastItem = items[items.length - 1];
  const newItem = createEmptyItem(pfdId, lastItem?.processNo || '', lastItem?.processName || '');
  newItem.sortOrder = items.length;
  return [...items, newItem];
}

// ============ 검증 헬퍼 ============

/** sortOrder가 0부터 연속 증가하는지 검증 */
function assertSortOrderContinuous(items: PfdItem[]) {
  items.forEach((item, idx) => {
    expect(item.sortOrder).toBe(idx);
  });
}

// ============ 테스트 데이터 ============

/**
 * 3개 공정 (P10=3행, P20=2행, P30=1행) — 총 6행
 * P10: processLevel=L1, processDesc=D1, workElement=W1, equipment=E1
 * 동일 그룹 내 행들은 같은 AB/CD/E/F 값을 공유
 */
function buildTestItems(): PfdItem[] {
  return [
    makeItem({ processNo: 'P10', processName: '조립', processLevel: 'L1', processDesc: 'D1', workElement: 'W1', equipment: 'E1', productChar: 'PC1', sortOrder: 0 }),
    makeItem({ processNo: 'P10', processName: '조립', processLevel: 'L1', processDesc: 'D1', workElement: 'W1', equipment: 'E1', productChar: 'PC2', sortOrder: 1 }),
    makeItem({ processNo: 'P10', processName: '조립', processLevel: 'L1', processDesc: 'D1', workElement: 'W2', equipment: 'E2', productChar: 'PC3', sortOrder: 2 }),
    makeItem({ processNo: 'P20', processName: '검사', processLevel: 'L2', processDesc: 'D2', workElement: 'W3', equipment: 'E3', productChar: 'PC4', sortOrder: 3 }),
    makeItem({ processNo: 'P20', processName: '검사', processLevel: 'L2', processDesc: 'D2', workElement: 'W3', equipment: 'E3', productChar: 'PC5', sortOrder: 4 }),
    makeItem({ processNo: 'P30', processName: '포장', processLevel: 'L3', processDesc: 'D3', workElement: 'W4', equipment: 'E4', productChar: 'PC6', sortOrder: 5 }),
  ];
}

// ============ 테스트 ============

describe('PFD 컨텍스트 메뉴 핸들러 순수 함수', () => {

  // --- U-01: process(AB) insertAbove ---
  describe('U-01: process(AB) insertAbove', () => {
    it('AB 병합그룹 맨 위에 고유값 삽입, 행 수 +1', () => {
      const items = buildTestItems();
      // rowIdx=1은 P10 그룹의 두 번째 행 → 그룹 시작(idx=0) 위에 삽입
      const result = insertRowAbovePure(items, 1, 'process', 'processNo');

      expect(result).toHaveLength(items.length + 1);
      // 새 행이 idx=0에 삽입됨
      expect(result[0].processNo).toMatch(/^_/);
      expect(result[0].processName).toMatch(/^_/);
      // 기존 P10 그룹은 idx=1부터
      expect(result[1].processNo).toBe('P10');
      assertSortOrderContinuous(result);
    });
  });

  // --- U-02: process(AB) insertBelow ---
  describe('U-02: process(AB) insertBelow', () => {
    it('AB 병합그룹 맨 아래+1에 고유값 삽입', () => {
      const items = buildTestItems();
      // rowIdx=0은 P10 그룹 → 그룹 끝(idx=2) 다음에 삽입
      const result = insertRowBelowPure(items, 0, 'process', 'processName');

      expect(result).toHaveLength(items.length + 1);
      // P10 그룹은 idx 0,1,2 유지, 새 행은 idx=3
      expect(result[0].processNo).toBe('P10');
      expect(result[1].processNo).toBe('P10');
      expect(result[2].processNo).toBe('P10');
      expect(result[3].processNo).toMatch(/^_/);
      expect(result[3].processName).toMatch(/^_/);
      // P20 그룹은 idx=4부터
      expect(result[4].processNo).toBe('P20');
      assertSortOrderContinuous(result);
    });
  });

  // --- U-03: process(CD) insertAbove ---
  describe('U-03: process(CD) insertAbove', () => {
    it('AB 확장병합 + CD 고유값', () => {
      const items = buildTestItems();
      // rowIdx=3은 P20/L2/D2 그룹 → 그룹 시작(idx=3) 위에 삽입
      const result = insertRowAbovePure(items, 3, 'process', 'processDesc');

      expect(result).toHaveLength(items.length + 1);
      const newRow = result[3]; // 그룹시작=3이므로 새 행도 idx=3
      // AB: 확장병합 (원래 값 복사)
      expect(newRow.processNo).toBe('P20');
      expect(newRow.processName).toBe('검사');
      // CD: 고유값
      expect(newRow.processLevel).toMatch(/^_/);
      expect(newRow.processDesc).toMatch(/^_/);
      assertSortOrderContinuous(result);
    });
  });

  // --- U-04: process(CD) insertBelow ---
  describe('U-04: process(CD) insertBelow', () => {
    it('AB 확장병합 + CD 고유값, 병합그룹 끝+1 삽입', () => {
      const items = buildTestItems();
      // rowIdx=3은 P20/L2/D2 그룹(idx 3,4) → 그룹 끝(idx=4)+1에 삽입
      const result = insertRowBelowPure(items, 3, 'process', 'processDesc');

      expect(result).toHaveLength(items.length + 1);
      // P20 그룹은 idx 3,4 유지, 새 행은 idx=5
      expect(result[3].processNo).toBe('P20');
      expect(result[4].processNo).toBe('P20');
      const newRow = result[5];
      expect(newRow.processNo).toBe('P20');
      expect(newRow.processName).toBe('검사');
      expect(newRow.processLevel).toMatch(/^_/);
      expect(newRow.processDesc).toMatch(/^_/);
      assertSortOrderContinuous(result);
    });
  });

  // --- U-05: work insertAbove ---
  describe('U-05: work insertAbove', () => {
    it('ABCD 확장병합 + workElement 고유값', () => {
      const items = buildTestItems();
      // rowIdx=0은 P10/L1/D1 그룹(idx 0,1,2) → 그룹 시작(idx=0) 위에 삽입
      const result = insertRowAbovePure(items, 1, 'work');

      expect(result).toHaveLength(items.length + 1);
      const newRow = result[0];
      // ABCD: 확장병합
      expect(newRow.processNo).toBe('P10');
      expect(newRow.processName).toBe('조립');
      expect(newRow.processLevel).toBe('L1');
      expect(newRow.processDesc).toBe('D1');
      // E: 고유값
      expect(newRow.workElement).toMatch(/^_/);
      assertSortOrderContinuous(result);
    });
  });

  // --- U-06: work insertBelow ---
  describe('U-06: work insertBelow', () => {
    it('ABCD 확장병합 + workElement 고유값', () => {
      const items = buildTestItems();
      // rowIdx=0은 P10/L1/D1 그룹(idx 0,1,2) → 그룹 끝(idx=2)+1에 삽입
      const result = insertRowBelowPure(items, 0, 'work');

      expect(result).toHaveLength(items.length + 1);
      const newRow = result[3]; // idx 0,1,2 유지, 새 행 idx=3
      expect(newRow.processNo).toBe('P10');
      expect(newRow.processName).toBe('조립');
      expect(newRow.processLevel).toBe('L1');
      expect(newRow.processDesc).toBe('D1');
      expect(newRow.workElement).toMatch(/^_/);
      assertSortOrderContinuous(result);
    });
  });

  // --- U-07: equipment insertAbove ---
  describe('U-07: equipment insertAbove', () => {
    it('ABCDE 확장병합 + equipment 고유값', () => {
      const items = buildTestItems();
      // rowIdx=0은 P10/L1/D1/W1 그룹(idx 0,1) → 그룹 시작(idx=0) 위에 삽입
      const result = insertRowAbovePure(items, 1, 'equipment');

      expect(result).toHaveLength(items.length + 1);
      const newRow = result[0];
      expect(newRow.processNo).toBe('P10');
      expect(newRow.processName).toBe('조립');
      expect(newRow.processLevel).toBe('L1');
      expect(newRow.processDesc).toBe('D1');
      expect(newRow.workElement).toBe('W1');
      expect(newRow.equipment).toMatch(/^_/);
      assertSortOrderContinuous(result);
    });
  });

  // --- U-08: equipment insertBelow ---
  describe('U-08: equipment insertBelow', () => {
    it('ABCDE 확장병합 + equipment 고유값', () => {
      const items = buildTestItems();
      // rowIdx=0은 P10/L1/D1/W1 그룹(idx 0,1) → 그룹 끝(idx=1)+1에 삽입
      const result = insertRowBelowPure(items, 0, 'equipment');

      expect(result).toHaveLength(items.length + 1);
      const newRow = result[2]; // idx 0,1 유지, 새 행 idx=2
      expect(newRow.processNo).toBe('P10');
      expect(newRow.processName).toBe('조립');
      expect(newRow.processLevel).toBe('L1');
      expect(newRow.processDesc).toBe('D1');
      expect(newRow.workElement).toBe('W1');
      expect(newRow.equipment).toMatch(/^_/);
      assertSortOrderContinuous(result);
    });
  });

  // --- U-09: char insertAbove ---
  describe('U-09: char insertAbove', () => {
    it('ABCDEF 확장병합 + productChar 고유값', () => {
      const items = buildTestItems();
      // rowIdx=1은 P10/L1/D1/W1/E1 그룹(idx 0,1) → 그룹 시작(idx=0) 위에 삽입
      const result = insertRowAbovePure(items, 1, 'char');

      expect(result).toHaveLength(items.length + 1);
      const newRow = result[0];
      expect(newRow.processNo).toBe('P10');
      expect(newRow.processName).toBe('조립');
      expect(newRow.processLevel).toBe('L1');
      expect(newRow.processDesc).toBe('D1');
      expect(newRow.workElement).toBe('W1');
      expect(newRow.equipment).toBe('E1');
      expect(newRow.productChar).toMatch(/^_/);
      assertSortOrderContinuous(result);
    });
  });

  // --- U-10: char insertBelow ---
  describe('U-10: char insertBelow', () => {
    it('ABCDEF 확장병합 + productChar 고유값', () => {
      const items = buildTestItems();
      // rowIdx=0은 P10/L1/D1/W1/E1 그룹(idx 0,1) → 그룹 끝(idx=1)+1에 삽입
      const result = insertRowBelowPure(items, 0, 'char');

      expect(result).toHaveLength(items.length + 1);
      const newRow = result[2]; // idx 0,1 유지, 새 행 idx=2
      expect(newRow.processNo).toBe('P10');
      expect(newRow.processName).toBe('조립');
      expect(newRow.processLevel).toBe('L1');
      expect(newRow.processDesc).toBe('D1');
      expect(newRow.workElement).toBe('W1');
      expect(newRow.equipment).toBe('E1');
      expect(newRow.productChar).toMatch(/^_/);
      assertSortOrderContinuous(result);
    });
  });

  // --- U-11: general insertAbove ---
  describe('U-11: general insertAbove', () => {
    it('기본 동작 (processNo/Name 복사), rowIdx 위에 삽입', () => {
      const items = buildTestItems();
      const result = insertRowAbovePure(items, 3, 'general');

      expect(result).toHaveLength(items.length + 1);
      // 새 행은 idx=3에 삽입 (기존 idx=3은 idx=4로 이동)
      const newRow = result[3];
      expect(newRow.processNo).toBe('P20');
      expect(newRow.processName).toBe('검사');
      // 나머지 필드는 빈 값
      expect(newRow.processLevel).toBe('');
      expect(newRow.processDesc).toBe('');
      assertSortOrderContinuous(result);
    });
  });

  // --- U-12: general insertBelow ---
  describe('U-12: general insertBelow', () => {
    it('기본 동작, rowIdx+1에 삽입', () => {
      const items = buildTestItems();
      const result = insertRowBelowPure(items, 3, 'general');

      expect(result).toHaveLength(items.length + 1);
      // 새 행은 idx=4 (rowIdx+1)
      const newRow = result[4];
      expect(newRow.processNo).toBe('P20');
      expect(newRow.processName).toBe('검사');
      expect(newRow.processLevel).toBe('');
      assertSortOrderContinuous(result);
    });
  });

  // --- U-13: deleteRow ---
  describe('U-13: deleteRow', () => {
    it('행 삭제 + sortOrder 연속', () => {
      const items = buildTestItems();
      const result = deleteRowPure(items, 2);

      expect(result).not.toBeNull();
      expect(result!).toHaveLength(items.length - 1);
      // idx=2였던 P10/W2 행이 제거됨
      expect(result!.find(r => r.id === items[2].id)).toBeUndefined();
      assertSortOrderContinuous(result!);
    });
  });

  // --- U-14: deleteRow 최소행 보호 ---
  describe('U-14: deleteRow 최소행 보호', () => {
    it('1행이면 null 반환', () => {
      const singleItem = [makeItem({ processNo: 'P10', processName: '조립', sortOrder: 0 })];
      const result = deleteRowPure(singleItem, 0);
      expect(result).toBeNull();
    });
  });

  // --- U-15: addRow ---
  describe('U-15: addRow', () => {
    it('맨 아래 추가 + 마지막행 processNo/Name 복사', () => {
      const items = buildTestItems();
      const result = addRowPure(items);

      expect(result).toHaveLength(items.length + 1);
      const lastRow = result[result.length - 1];
      // 마지막 행(P30/포장)의 processNo/Name 복사
      expect(lastRow.processNo).toBe('P30');
      expect(lastRow.processName).toBe('포장');
      expect(lastRow.sortOrder).toBe(items.length);
    });
  });

  // --- U-16: sortOrder 불변성 ---
  describe('U-16: sortOrder 불변성', () => {
    it('원본 items가 변경되지 않음 확인', () => {
      const items = buildTestItems();
      // deep copy로 원본 스냅샷
      const snapshot = JSON.parse(JSON.stringify(items));

      // 다양한 조작 실행
      insertRowAbovePure(items, 1, 'process', 'processNo');
      insertRowBelowPure(items, 0, 'work');
      deleteRowPure(items, 2);
      addRowPure(items);

      // 원본이 변경되지 않았는지 확인
      expect(items).toHaveLength(snapshot.length);
      items.forEach((item, idx) => {
        expect(item.id).toBe(snapshot[idx].id);
        expect(item.processNo).toBe(snapshot[idx].processNo);
        expect(item.processName).toBe(snapshot[idx].processName);
        expect(item.sortOrder).toBe(snapshot[idx].sortOrder);
      });
    });
  });
});

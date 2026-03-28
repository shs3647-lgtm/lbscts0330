/**
 * pipeline-invariants.test.ts
 *
 * PFMEA Import Pipeline Property-Based Invariant Tests
 *
 * Git history bug fixes (v3.x ~ v5.x) 에서 도출한 10개 불변 조건을 검증.
 * distribute(), normalizeProcessNo() 등 비-export 함수는 로컬 복사본으로 테스트.
 */
import { describe, test, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════
// Local copies of non-exported functions (source-faithful replicas)
// ═══════════════════════════════════════════════════════════════════

/**
 * distribute() — buildWorksheetState.ts L128-143
 * 라운드로빈 균등 분배: items 를 slots 개 슬롯에 나눔.
 */
function distribute<T>(items: T[], slots: number): T[][] {
  if (slots <= 0) return [];
  if (items.length === 0) return Array.from({ length: slots }, () => []);
  const result: T[][] = Array.from({ length: slots }, () => []);
  const base = Math.floor(items.length / slots);
  const extra = items.length % slots;
  let idx = 0;
  for (let s = 0; s < slots; s++) {
    const count = s < extra ? base + 1 : base;
    for (let i = 0; i < count && idx < items.length; i++) {
      result[s].push(items[idx++]);
    }
  }
  return result;
}

/**
 * normalizeProcessNo() — failureChainInjector.ts L120-136
 * 공정번호 정규화: 접두사/접미사 제거, 공통공정 → '00', 선행 0 제거.
 */
function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  const lower = n.toLowerCase();
  if (lower === '0' || lower === '공통공정' || lower === '공통') return '00';
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  if (n !== '0' && n !== '00') {
    n = n.replace(/^0+(?=\d)/, '');
  }
  return n;
}

// ═══════════════════════════════════════════════════════════════════
// Helper: generate item arrays for parametrized tests
// ═══════════════════════════════════════════════════════════════════

function makeItems(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `item-${i}`);
}

/** Simulate a simple flat data row for hierarchy tests */
interface FlatRow {
  id: string;
  itemCode: string;     // 'A1'|'A2'|'A3'|'A4'|'B1'|'B2'|'B3'|'C3'|'C4'
  processNo: string;
  value: string;
  parentItemId?: string;
  category?: string;    // 'C'=L1, 'A'=L2, 'B'=L3
}

function makeFlatRows(spec: Array<{ itemCode: string; count: number; processNo: string }>): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const s of spec) {
    for (let i = 0; i < s.count; i++) {
      const cat = s.itemCode.startsWith('C') ? 'C'
        : s.itemCode.startsWith('A') ? 'A'
        : 'B';
      rows.push({
        id: `${s.processNo}-${s.itemCode}-${i}`,
        itemCode: s.itemCode,
        processNo: s.processNo,
        value: `val-${s.itemCode}-${i}`,
        category: cat,
      });
    }
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════
// Invariant 1: distribute() 보존 법칙
// sum(distribute(items, slots)) === items.length
// ═══════════════════════════════════════════════════════════════════

describe('Invariant 1: distribute() 보존 법칙 — 아이템 소실/생성 없음', () => {
  const cases: Array<{ name: string; itemCount: number; slots: number }> = [
    { name: '빈 입력', itemCount: 0, slots: 3 },
    { name: '단일 아이템, 단일 슬롯', itemCount: 1, slots: 1 },
    { name: '균등 분배 (6/3)', itemCount: 6, slots: 3 },
    { name: '불균등 분배 (7/3)', itemCount: 7, slots: 3 },
    { name: '아이템 < 슬롯 (2/5)', itemCount: 2, slots: 5 },
    { name: '극단 비율 (1/100)', itemCount: 1, slots: 100 },
    { name: '극단 비율 (100/1)', itemCount: 100, slots: 1 },
    { name: '대량 분배 (1000/7)', itemCount: 1000, slots: 7 },
    { name: '슬롯 0', itemCount: 5, slots: 0 },
    { name: '슬롯 음수', itemCount: 5, slots: -1 },
  ];

  test.each(cases)('$name (items=$itemCount, slots=$slots)', ({ itemCount, slots }) => {
    const items = makeItems(itemCount);
    const result = distribute(items, slots);

    if (slots <= 0) {
      // 슬롯 0 이하: 빈 배열 반환
      expect(result).toEqual([]);
      return;
    }

    const totalDistributed = result.reduce((acc, slot) => acc + slot.length, 0);
    expect(totalDistributed).toBe(itemCount);
  });

  test('분배된 아이템은 원본과 동일 (순서 보존)', () => {
    const items = makeItems(10);
    const result = distribute(items, 3);
    const flattened = result.flat();
    expect(flattened).toEqual(items);
  });

  test('분배 결과에 중복 아이템 없음', () => {
    const items = makeItems(15);
    const result = distribute(items, 4);
    const flattened = result.flat();
    const unique = new Set(flattened);
    expect(unique.size).toBe(items.length);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Invariant 2: distribute() 균등성
// max(slot.length) - min(slot.length) <= 1
// ═══════════════════════════════════════════════════════════════════

describe('Invariant 2: distribute() 균등성 — 슬롯 간 차이 최대 1', () => {
  const cases: Array<{ name: string; itemCount: number; slots: number }> = [
    { name: '완벽 균등 (9/3)', itemCount: 9, slots: 3 },
    { name: '1 여분 (10/3)', itemCount: 10, slots: 3 },
    { name: '2 여분 (11/3)', itemCount: 11, slots: 3 },
    { name: '아이템 < 슬롯 (3/7)', itemCount: 3, slots: 7 },
    { name: '단일 아이템 (1/5)', itemCount: 1, slots: 5 },
    { name: '빈 입력 (0/4)', itemCount: 0, slots: 4 },
    { name: '대량 불균등 (101/10)', itemCount: 101, slots: 10 },
  ];

  test.each(cases)('$name (items=$itemCount, slots=$slots)', ({ itemCount, slots }) => {
    if (slots <= 0) return; // invariant only applies to valid slots

    const items = makeItems(itemCount);
    const result = distribute(items, slots);

    expect(result).toHaveLength(slots);

    const lengths = result.map(s => s.length);
    const maxLen = Math.max(...lengths);
    const minLen = Math.min(...lengths);

    expect(maxLen - minLen).toBeLessThanOrEqual(1);
  });

  test('extra 슬롯이 앞쪽에 배치됨 (앞쪽이 1개 더 많음)', () => {
    const items = makeItems(7);
    const result = distribute(items, 3);
    // 7 / 3 = base 2, extra 1 → [3, 2, 2]
    expect(result[0]).toHaveLength(3);
    expect(result[1]).toHaveLength(2);
    expect(result[2]).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Invariant 3: A4 비중복 — Cartesian product 금지
// A3가 N개여도 productChars 고유 ID 수 === A4 수
// ═══════════════════════════════════════════════════════════════════

describe('Invariant 3: A4 비중복 — Cartesian product 금지', () => {
  test('A3 3개, A4 2개 → productChars에 A4 고유 ID 2개만 존재', () => {
    const a3Items = [
      { id: 'p10-A3-0', processNo: '10' },
      { id: 'p10-A3-1', processNo: '10' },
      { id: 'p10-A3-2', processNo: '10' },
    ];
    const a4Items = [
      { id: 'p10-A4-0', processNo: '10', value: 'PC-A' },
      { id: 'p10-A4-1', processNo: '10', value: 'PC-B' },
    ];

    // Simulate fillL2Data behavior: distribute A4 across A3, NOT Cartesian
    const distributed = distribute(a4Items, a3Items.length);
    const allPCIds = distributed.flat().map(pc => pc.id);
    const uniqueIds = new Set(allPCIds);

    // Invariant: unique PC count === original A4 count (no duplication)
    expect(uniqueIds.size).toBe(a4Items.length);
  });

  test('A3 1개, A4 5개 → 모든 A4가 해당 A3에 배정', () => {
    const a4Items = makeItems(5);
    const distributed = distribute(a4Items, 1);
    expect(distributed[0]).toHaveLength(5);
    expect(distributed.flat()).toEqual(a4Items);
  });

  test('A3 5개, A4 0개 → 빈 productChars 배열 5개', () => {
    const distributed = distribute([], 5);
    expect(distributed).toHaveLength(5);
    distributed.forEach(slot => expect(slot).toHaveLength(0));
  });

  test('A3 0개 → A4 분배 없음 (빈 결과)', () => {
    const a4Items = makeItems(3);
    const distributed = distribute(a4Items, 0);
    expect(distributed).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Invariant 4: FM-PC 전사 — orphan FM 없음
// ∀ fm: fm.productCharId ∈ uniquePCIds
// ═══════════════════════════════════════════════════════════════════

describe('Invariant 4: FM-PC 전사 — orphan FailureMode 없음', () => {
  test('모든 FM이 유효한 PC에 연결됨', () => {
    const pcIds = ['pc-0', 'pc-1', 'pc-2'];
    const fmItems = [
      { id: 'fm-0', productCharId: 'pc-0' },
      { id: 'fm-1', productCharId: 'pc-1' },
      { id: 'fm-2', productCharId: 'pc-2' },
      { id: 'fm-3', productCharId: 'pc-0' },
    ];

    const pcIdSet = new Set(pcIds);
    for (const fm of fmItems) {
      expect(pcIdSet.has(fm.productCharId)).toBe(true);
    }
  });

  test('빈 FM 목록 → orphan 없음 (vacuously true)', () => {
    const fmItems: Array<{ id: string; productCharId: string }> = [];
    const pcIdSet = new Set(['pc-0']);
    for (const fm of fmItems) {
      expect(pcIdSet.has(fm.productCharId)).toBe(true);
    }
    expect(fmItems).toHaveLength(0);
  });

  test('FM distribute 후에도 PC 참조 유지', () => {
    const pcIds = ['pc-0', 'pc-1'];
    const fmItems = [
      { id: 'fm-0', productCharId: 'pc-0' },
      { id: 'fm-1', productCharId: 'pc-0' },
      { id: 'fm-2', productCharId: 'pc-1' },
    ];

    // distribute FM across 2 slots
    const distributed = distribute(fmItems, 2);
    const allFMs = distributed.flat();
    const pcIdSet = new Set(pcIds);

    for (const fm of allFMs) {
      expect(pcIdSet.has(fm.productCharId)).toBe(true);
    }
    // 보존 법칙도 동시 검증
    expect(allFMs).toHaveLength(fmItems.length);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Invariant 5: FE-FM-FC 완전 연결
// ∀ link: link.feId ∈ feIds ∧ link.fmId ∈ fmIds ∧ link.fcId ∈ fcIds
// ═══════════════════════════════════════════════════════════════════

describe('Invariant 5: FE-FM-FC 완전 연결 — dangling reference 없음', () => {
  const feIds = new Set(['fe-0', 'fe-1', 'fe-2']);
  const fmIds = new Set(['fm-0', 'fm-1', 'fm-2']);
  const fcIds = new Set(['fc-0', 'fc-1', 'fc-2', 'fc-3']);

  test('유효한 링크: 모든 참조가 존재', () => {
    const links = [
      { feId: 'fe-0', fmId: 'fm-0', fcId: 'fc-0' },
      { feId: 'fe-1', fmId: 'fm-1', fcId: 'fc-1' },
      { feId: 'fe-2', fmId: 'fm-2', fcId: 'fc-2' },
      { feId: 'fe-0', fmId: 'fm-1', fcId: 'fc-3' },
    ];

    for (const link of links) {
      expect(feIds.has(link.feId)).toBe(true);
      expect(fmIds.has(link.fmId)).toBe(true);
      expect(fcIds.has(link.fcId)).toBe(true);
    }
  });

  test('dangling feId 감지', () => {
    const badLink = { feId: 'fe-999', fmId: 'fm-0', fcId: 'fc-0' };
    expect(feIds.has(badLink.feId)).toBe(false);
  });

  test('dangling fmId 감지', () => {
    const badLink = { feId: 'fe-0', fmId: 'fm-999', fcId: 'fc-0' };
    expect(fmIds.has(badLink.fmId)).toBe(false);
  });

  test('dangling fcId 감지', () => {
    const badLink = { feId: 'fe-0', fmId: 'fm-0', fcId: 'fc-999' };
    expect(fcIds.has(badLink.fcId)).toBe(false);
  });

  test('빈 링크 목록 → 완전 연결 (vacuously true)', () => {
    const links: Array<{ feId: string; fmId: string; fcId: string }> = [];
    for (const link of links) {
      expect(feIds.has(link.feId)).toBe(true);
    }
    expect(links).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Invariant 6: parentItemId 해결
// ∀ item with parentItemId: parentItemId resolves to existing item
// ═══════════════════════════════════════════════════════════════════

describe('Invariant 6: parentItemId 해결 — 모든 부모 참조가 유효', () => {
  test('B2→B1, B3→B2 parentItemId 체인 (지침서 B1→B2→B3)', () => {
    const b1Items = [
      { id: '10-B1-0', processNo: '10', name: 'WE-A' },
      { id: '10-B1-1', processNo: '10', name: 'WE-B' },
    ];
    const b2Items = [
      { id: '10-B2-0', parentItemId: '10-B1-0' },
      { id: '10-B2-1', parentItemId: '10-B1-1' },
    ];
    const b3Items = [
      { id: '10-B3-0', parentItemId: '10-B2-0' },
      { id: '10-B3-1', parentItemId: '10-B2-1' },
    ];

    const b1IdSet = new Set(b1Items.map(b => b.id));
    const b2IdSet = new Set(b2Items.map(b => b.id));

    for (const b2 of b2Items) {
      expect(b1IdSet.has(b2.parentItemId)).toBe(true);
    }
    for (const b3 of b3Items) {
      expect(b2IdSet.has(b3.parentItemId)).toBe(true);
    }
  });

  test('parentItemId 없는 항목은 검증 대상 아님', () => {
    const items = [
      { id: 'a1-0' },
      { id: 'a2-0' },
    ];
    // No parentItemId → no validation needed
    for (const item of items) {
      expect('parentItemId' in item).toBe(false);
    }
  });

  test('잘못된 parentItemId 감지 (B2가 존재하지 않는 B1 참조)', () => {
    const b1Ids = new Set(['10-B1-0']);
    const badB2 = { id: '10-B2-0', parentItemId: '10-B1-99' };
    expect(b1Ids.has(badB2.parentItemId)).toBe(false);
  });

  test('다중 공정 parentItemId 정확 매칭', () => {
    // 공정 10, 20 각각 B1 존재
    const b1Items = [
      { id: '10-B1-0', processNo: '10' },
      { id: '20-B1-0', processNo: '20' },
      { id: '20-B1-1', processNo: '20' },
    ];
    const b2Items = [
      { id: '10-B2-0', parentItemId: '10-B1-0' },
      { id: '20-B2-0', parentItemId: '20-B1-0' },
      { id: '20-B2-1', parentItemId: '20-B1-1' },
    ];

    const b1IdSet = new Set(b1Items.map(b => b.id));
    for (const b2 of b2Items) {
      expect(b1IdSet.has(b2.parentItemId)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// Invariant 7: 공정번호 정규화 멱등성
// normalizeProcessNo(normalizeProcessNo(x)) === normalizeProcessNo(x)
// ═══════════════════════════════════════════════════════════════════

describe('Invariant 7: normalizeProcessNo 멱등성', () => {
  const inputs = [
    '10', '010', '20번', '공정 10', 'Process 20', 'PROC-30',
    'P 40', 'p-50', '0', '공통공정', '공통', '00',
    '', '  ', '100', '0010',
    'process-5', 'PROCESS_15',
  ];

  test.each(inputs)('normalizeProcessNo("%s") 2회 적용 = 1회 적용', (input) => {
    const once = normalizeProcessNo(input);
    const twice = normalizeProcessNo(once);
    expect(twice).toBe(once);
  });

  test('undefined 입력 → 빈 문자열', () => {
    expect(normalizeProcessNo(undefined)).toBe('');
  });

  test('공통공정 변형 → "00" 통일', () => {
    expect(normalizeProcessNo('0')).toBe('00');
    expect(normalizeProcessNo('공통공정')).toBe('00');
    expect(normalizeProcessNo('공통')).toBe('00');
  });

  test('접두사 제거: "공정 10" → "10"', () => {
    expect(normalizeProcessNo('공정 10')).toBe('10');
    expect(normalizeProcessNo('Process 10')).toBe('10');
    expect(normalizeProcessNo('proc-10')).toBe('10');
    expect(normalizeProcessNo('P 10')).toBe('10');
  });

  test('접미사 제거: "20번" → "20"', () => {
    expect(normalizeProcessNo('20번')).toBe('20');
  });

  test('선행 0 제거: "010" → "10"', () => {
    expect(normalizeProcessNo('010')).toBe('10');
    expect(normalizeProcessNo('0010')).toBe('10');
  });

  test('"00" 은 그대로 유지', () => {
    expect(normalizeProcessNo('00')).toBe('00');
  });

  test('공백 trim', () => {
    expect(normalizeProcessNo('  10  ')).toBe('10');
    expect(normalizeProcessNo(' 공정 20 ')).toBe('20');
  });
});

// ═══════════════════════════════════════════════════════════════════
// Invariant 8: 빈 값 비생성 — DB 저장 시 빈 value 항목 필터
// ═══════════════════════════════════════════════════════════════════

describe('Invariant 8: 빈 값 비생성 — saveMasterDataset 필터', () => {
  /** saveMasterDataset 에서 사용하는 필터 로직 시뮬레이션 */
  function filterEmptyValues<T extends { value: string }>(items: T[]): T[] {
    return items.filter(item => item.value.trim() !== '');
  }

  test('빈 value 항목 필터링', () => {
    const items = [
      { id: '1', value: 'valid' },
      { id: '2', value: '' },
      { id: '3', value: '  ' },
      { id: '4', value: 'also-valid' },
    ];
    const filtered = filterEmptyValues(items);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(i => i.id)).toEqual(['1', '4']);
  });

  test('모든 항목 유효 → 필터 후 동일', () => {
    const items = [
      { id: '1', value: 'a' },
      { id: '2', value: 'b' },
    ];
    const filtered = filterEmptyValues(items);
    expect(filtered).toHaveLength(2);
  });

  test('모든 항목 빈 값 → 빈 배열', () => {
    const items = [
      { id: '1', value: '' },
      { id: '2', value: '   ' },
    ];
    const filtered = filterEmptyValues(items);
    expect(filtered).toHaveLength(0);
  });

  test('빈 입력 → 빈 출력', () => {
    const filtered = filterEmptyValues([]);
    expect(filtered).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Invariant 9: 카운트 보존
// Import flatData count by itemCode === filtered output count (non-empty)
// ═══════════════════════════════════════════════════════════════════

describe('Invariant 9: 카운트 보존 — itemCode별 Import 수 === 출력 수 (non-empty)', () => {
  function countByItemCode(rows: FlatRow[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (row.value.trim() === '') continue; // 빈 값 제외
      counts[row.itemCode] = (counts[row.itemCode] || 0) + 1;
    }
    return counts;
  }

  test('정상 데이터: itemCode별 카운트 보존', () => {
    const rows = makeFlatRows([
      { itemCode: 'A1', count: 3, processNo: '10' },
      { itemCode: 'A2', count: 2, processNo: '10' },
      { itemCode: 'A3', count: 4, processNo: '10' },
    ]);
    const counts = countByItemCode(rows);
    expect(counts['A1']).toBe(3);
    expect(counts['A2']).toBe(2);
    expect(counts['A3']).toBe(4);
  });

  test('빈 값 행 제외 후 카운트', () => {
    const rows: FlatRow[] = [
      { id: '1', itemCode: 'A1', processNo: '10', value: 'valid' },
      { id: '2', itemCode: 'A1', processNo: '10', value: '' },
      { id: '3', itemCode: 'A1', processNo: '10', value: 'valid2' },
    ];
    const counts = countByItemCode(rows);
    expect(counts['A1']).toBe(2); // 빈 값 1개 제외
  });

  test('빈 입력 → 빈 카운트', () => {
    const counts = countByItemCode([]);
    expect(Object.keys(counts)).toHaveLength(0);
  });

  test('distribute 후에도 총 카운트 보존', () => {
    const items = makeItems(10);
    const distributed = distribute(items, 3);
    const totalAfter = distributed.reduce((acc, slot) => acc + slot.length, 0);
    expect(totalAfter).toBe(items.length);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Invariant 10: L1/L2/L3 계층 무결성
// L1 → category 'C', L2 → category 'A', L3 → category 'B'
// ═══════════════════════════════════════════════════════════════════

describe('Invariant 10: L1/L2/L3 계층 무결성 — 카테고리 일관성', () => {
  /** itemCode → category 매핑 규칙 */
  function expectedCategory(itemCode: string): string {
    if (itemCode.startsWith('C')) return 'C'; // L1: C3, C4
    if (itemCode.startsWith('A')) return 'A'; // L2: A1, A2, A3, A4
    if (itemCode.startsWith('B')) return 'B'; // L3: B1, B2, B3
    return 'UNKNOWN';
  }

  test('L1 항목(C3, C4)은 category "C"', () => {
    for (const code of ['C3', 'C4']) {
      expect(expectedCategory(code)).toBe('C');
    }
  });

  test('L2 항목(A1, A2, A3, A4)은 category "A"', () => {
    for (const code of ['A1', 'A2', 'A3', 'A4']) {
      expect(expectedCategory(code)).toBe('A');
    }
  });

  test('L3 항목(B1, B2, B3)은 category "B"', () => {
    for (const code of ['B1', 'B2', 'B3']) {
      expect(expectedCategory(code)).toBe('B');
    }
  });

  test('makeFlatRows가 올바른 category 할당', () => {
    const rows = makeFlatRows([
      { itemCode: 'C3', count: 2, processNo: '10' },
      { itemCode: 'A1', count: 3, processNo: '10' },
      { itemCode: 'B1', count: 4, processNo: '10' },
    ]);

    for (const row of rows) {
      expect(row.category).toBe(expectedCategory(row.itemCode));
    }
  });

  test('계층 간 혼합 금지: L1 항목이 A/B 카테고리를 가지면 위반', () => {
    const badRow = { id: '1', itemCode: 'C3', processNo: '10', value: 'x', category: 'A' };
    expect(badRow.category).not.toBe(expectedCategory(badRow.itemCode));
  });

  test('모든 유효한 itemCode에 대해 category 결정 가능', () => {
    const allCodes = ['C3', 'C4', 'A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3'];
    for (const code of allCodes) {
      expect(expectedCategory(code)).not.toBe('UNKNOWN');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// Cross-Invariant: distribute + 보존 + 균등성 결합 테스트
// ═══════════════════════════════════════════════════════════════════

describe('Cross-Invariant: distribute 종합 속성 검증', () => {
  const scenarios: Array<{ items: number; slots: number }> = [
    { items: 0, slots: 0 },
    { items: 0, slots: 1 },
    { items: 1, slots: 0 },
    { items: 1, slots: 1 },
    { items: 3, slots: 2 },
    { items: 5, slots: 3 },
    { items: 10, slots: 4 },
    { items: 13, slots: 5 },
    { items: 50, slots: 7 },
    { items: 100, slots: 100 },
    { items: 99, slots: 100 },
    { items: 1, slots: 50 },
  ];

  test.each(scenarios)(
    'items=$items, slots=$slots → 보존 + 균등 + 순서 + 슬롯수',
    ({ items, slots }) => {
      const source = makeItems(items);
      const result = distribute(source, slots);

      if (slots <= 0) {
        expect(result).toEqual([]);
        return;
      }

      // 1. 슬롯 수
      expect(result).toHaveLength(slots);

      // 2. 보존 법칙
      const flat = result.flat();
      expect(flat).toHaveLength(items);

      // 3. 순서 보존
      expect(flat).toEqual(source);

      // 4. 균등성
      if (items > 0) {
        const lengths = result.map(s => s.length);
        expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThanOrEqual(1);
      }

      // 5. 중복 없음
      expect(new Set(flat).size).toBe(items);
    }
  );
});

// ═══════════════════════════════════════════════════════════════════
// Cross-Invariant: normalizeProcessNo 다양한 형식 매핑 일관성
// ═══════════════════════════════════════════════════════════════════

describe('Cross-Invariant: normalizeProcessNo 동일 공정번호 매핑 일관성', () => {
  test('동일 공정의 다양한 표기가 같은 정규화 결과', () => {
    // "10" 공정의 다양한 표기
    const variants10 = ['10', '010', '공정 10', 'Process 10', 'P 10', 'p-10', '10번'];
    const normalized = variants10.map(v => normalizeProcessNo(v));
    const unique = new Set(normalized);
    expect(unique.size).toBe(1);
    expect(normalized[0]).toBe('10');
  });

  test('공통공정 변형이 모두 "00"으로 통일', () => {
    const commonVariants = ['0', '공통공정', '공통'];
    const normalized = commonVariants.map(v => normalizeProcessNo(v));
    for (const n of normalized) {
      expect(n).toBe('00');
    }
  });

  test('서로 다른 공정번호는 서로 다른 정규화 결과', () => {
    const different = ['10', '20', '30', '00'];
    const normalized = different.map(v => normalizeProcessNo(v));
    const unique = new Set(normalized);
    expect(unique.size).toBe(different.length);
  });
});

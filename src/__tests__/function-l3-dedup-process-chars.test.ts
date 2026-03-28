/**
 * 동일 작업요소기능 하위 동일 공정특성명 복수 행 유지 (이름 기준 dedup 금지)
 * + WE 병합 후 공정특성 복합키 dedup 테스트 (2026-03-28)
 */
import { describe, expect, it } from 'vitest';
import {
  deduplicateFunctionsL3,
  deduplicateProcessCharsAfterWeMerge,
  filterMeaningfulProcessChars,
  remapFailureCauseCharIds,
} from '@/app/(fmea-core)/pfmea/worksheet/tabs/function/functionL3Utils';

describe('deduplicateFunctionsL3', () => {
  it('keeps multiple process chars with the same name and different ids', () => {
    const { functions, cleaned } = deduplicateFunctionsL3([
      {
        id: 'f1',
        name: '요소기능A',
        processChars: [
          { id: 'pc-a', name: '두께' },
          { id: 'pc-b', name: '두께' },
        ],
      },
    ]);
    expect(cleaned).toBe(false);
    expect(functions[0].processChars).toHaveLength(2);
  });

  it('drops duplicate id only when same id appears twice after merge', () => {
    const { functions, cleaned } = deduplicateFunctionsL3([
      {
        id: 'f1',
        name: '요소기능A',
        processChars: [{ id: 'pc-a', name: '두께' }],
      },
      {
        id: 'f1',
        name: '요소기능A',
        processChars: [{ id: 'pc-a', name: '두께' }],
      },
    ]);
    expect(cleaned).toBe(true);
    expect(functions[0].processChars).toHaveLength(1);
  });
});

describe('filterMeaningfulProcessChars', () => {
  it('does not collapse duplicate names when removeDuplicates is false', () => {
    const out = filterMeaningfulProcessChars(
      [
        { id: '1', name: '실측값' },
        { id: '2', name: '실측값' },
      ],
      false
    );
    expect(out).toHaveLength(2);
  });
});

describe('remapFailureCauseCharIds', () => {
  it('does not remap when processCharId still exists in validCharIds', () => {
    const oldIdToName = new Map<string, string>([
      ['id-2', '실측값'],
    ]);
    const canonical = new Map<string, string>([['실측값', 'id-1']]);
    const valid = new Set<string>(['id-2']);
    const { causes, cleaned } = remapFailureCauseCharIds(
      [{ id: 'fc1', processCharId: 'id-2' }],
      oldIdToName,
      canonical,
      valid
    );
    expect(cleaned).toBe(false);
    expect(causes[0].processCharId).toBe('id-2');
  });
});

describe('deduplicateProcessCharsAfterWeMerge', () => {
  it('deduplicates processChars with the same name after WE merge', () => {
    // 두 개의 다른 L3Structure에서 온 같은 function+processChar (WE 병합 결과)
    const functions = [
      {
        id: 'f1',
        name: 'PDA 스캐너이/가 자재입고 공정의 품질 기준을 충족한다',
        processChars: [
          { id: 'l3f-001', name: '인식상태' },
          { id: 'l3f-002', name: '인식상태' },
          { id: 'l3f-003', name: '인식상태' },
          { id: 'l3f-004', name: '인식상태' },
        ],
      },
    ];
    const { functions: result, cleaned } = deduplicateProcessCharsAfterWeMerge(functions);
    expect(cleaned).toBe(true);
    expect(result[0].processChars).toHaveLength(1);
    expect(result[0].processChars[0].name).toBe('인식상태');
  });

  it('keeps processChars with different names', () => {
    const functions = [
      {
        id: 'f1',
        name: '기능A',
        processChars: [
          { id: 'pc-1', name: '인식상태' },
          { id: 'pc-2', name: '두께' },
          { id: 'pc-3', name: '온도' },
        ],
      },
    ];
    const { functions: result, cleaned } = deduplicateProcessCharsAfterWeMerge(functions);
    expect(cleaned).toBe(false);
    expect(result[0].processChars).toHaveLength(3);
  });

  it('preserves specialChar from first occurrence', () => {
    const functions = [
      {
        id: 'f1',
        name: '기능A',
        processChars: [
          { id: 'pc-1', name: '인식상태', specialChar: 'CC' },
          { id: 'pc-2', name: '인식상태', specialChar: '' },
        ],
      },
    ];
    const { functions: result, cleaned } = deduplicateProcessCharsAfterWeMerge(functions);
    expect(cleaned).toBe(true);
    expect(result[0].processChars).toHaveLength(1);
    expect(result[0].processChars[0].specialChar).toBe('CC');
  });

  it('does not collapse empty-name processChars', () => {
    const functions = [
      {
        id: 'f1',
        name: '기능A',
        processChars: [
          { id: 'pc-1', name: '' },
          { id: 'pc-2', name: '' },
        ],
      },
    ];
    const { functions: result, cleaned } = deduplicateProcessCharsAfterWeMerge(functions);
    expect(cleaned).toBe(false);
    expect(result[0].processChars).toHaveLength(2);
  });

  it('handles mixed: dedup same-name + keep different-name', () => {
    const functions = [
      {
        id: 'f1',
        name: '기능A',
        processChars: [
          { id: 'pc-1', name: '인식상태' },
          { id: 'pc-2', name: '두께' },
          { id: 'pc-3', name: '인식상태' },
          { id: 'pc-4', name: '두께' },
          { id: 'pc-5', name: '온도' },
        ],
      },
    ];
    const { functions: result, cleaned } = deduplicateProcessCharsAfterWeMerge(functions);
    expect(cleaned).toBe(true);
    expect(result[0].processChars).toHaveLength(3);
    const names = result[0].processChars.map((c: any) => c.name);
    expect(names).toContain('인식상태');
    expect(names).toContain('두께');
    expect(names).toContain('온도');
  });
});

/**
 * 동일 작업요소기능 하위 동일 공정특성명 복수 행 유지 (이름 기준 dedup 금지)
 */
import { describe, expect, it } from 'vitest';
import {
  deduplicateFunctionsL3,
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

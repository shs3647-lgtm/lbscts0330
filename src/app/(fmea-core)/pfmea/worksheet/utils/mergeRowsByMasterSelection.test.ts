import { describe, expect, it } from 'vitest';
import { mergeRowsByMasterSelection } from './mergeRowsByMasterSelection';

type Row = { id: string; name: string; order?: number };

describe('mergeRowsByMasterSelection', () => {
  const opts = {
    isEmpty: (r: Row) => !r.name?.trim(),
    patchNamed: (r: Row, item: { id: string; name: string }) => ({ ...r, name: item.name }),
    patchEmpty: (r: Row, item: { id: string; name: string }) => ({ ...r, id: item.id, name: item.name }),
    append: (item: { id: string; name: string }, _i: number) => ({ id: item.id, name: item.name }),
  };

  it('3 empty + select 2 → 1 empty + 2 filled', () => {
    const current: Row[] = [
      { id: 'p1', name: '' },
      { id: 'p2', name: '' },
      { id: 'p3', name: '' },
    ];
    const selected = [
      { id: 'm1', name: 'A' },
      { id: 'm2', name: 'B' },
    ];
    const out = mergeRowsByMasterSelection(current, selected, opts);
    expect(out).toHaveLength(3);
    const named = out.filter(r => r.name?.trim());
    expect(named.map(r => r.name).sort()).toEqual(['A', 'B']);
    expect(out.filter(r => !r.name?.trim())).toHaveLength(1);
  });

  it('removes named row not in selection, keeps empty', () => {
    const current: Row[] = [
      { id: 'm1', name: 'A' },
      { id: 'p1', name: '' },
    ];
    const selected = [{ id: 'm2', name: 'B' }];
    const out = mergeRowsByMasterSelection(current, selected, opts);
    expect(out.some(r => r.id === 'm1')).toBe(false);
    expect(out.some(r => r.id === 'm2' && r.name === 'B')).toBe(true);
    expect(out.filter(r => !r.name?.trim())).toHaveLength(0);
  });

  it('syncs name on kept id', () => {
    const current: Row[] = [{ id: 'm1', name: 'Old' }];
    const selected = [{ id: 'm1', name: 'New' }];
    const out = mergeRowsByMasterSelection(current, selected, opts);
    expect(out).toEqual([{ id: 'm1', name: 'New' }]);
  });
});

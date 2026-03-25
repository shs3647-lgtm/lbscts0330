import { describe, it, expect } from 'vitest';
import { createStrictModeDedupedUpdater } from './strictModeStateUpdater';
import type { WorksheetState } from '../constants';

/** Strict Mode에서 동일 prev로 업데이터가 두 번 호출될 때 splice 이중 적용 방지 */
describe('createStrictModeDedupedUpdater', () => {
  it('computes once and returns cached result on second call with same prev', () => {
    const prev = {
      l1: { id: 'l1', name: '', types: [], failureScopes: [] },
      l2: [
        {
          id: 'p1',
          no: '',
          name: 'A',
          order: 0,
          l3: [],
          functions: [],
          failureModes: [],
          failureCauses: [],
        },
      ],
      selected: { type: 'L2' as const, id: 'p1' },
      tab: 'structure',
      levelView: 'all',
      search: '',
      visibleSteps: [],
    } as WorksheetState;

    let computeRuns = 0;
    const updater = createStrictModeDedupedUpdater((p) => {
      computeRuns += 1;
      const next = JSON.parse(JSON.stringify(p)) as WorksheetState;
      next.l2.splice(1, 0, {
        id: 'p-new',
        no: '',
        name: '',
        order: 1,
        l3: [{ id: 'w1', name: '', m4: '', order: 0, functions: [], processChars: [] }],
        functions: [],
        failureModes: [],
        failureCauses: [],
      });
      next.l2.forEach((proc, i) => {
        proc.order = i;
      });
      return next;
    });

    const first = updater(prev);
    const second = updater(prev);

    expect(computeRuns).toBe(1);
    expect(first).toBe(second);
    expect(first.l2.length).toBe(2);
  });
});

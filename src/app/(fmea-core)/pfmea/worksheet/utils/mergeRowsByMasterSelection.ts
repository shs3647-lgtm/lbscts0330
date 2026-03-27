/**
 * 마스터 선택 모달 공통: 빈 행 유지 → 선택 해제된 이름 행 제거 → 이름 동기화
 * → 아직 행에 없는 선택은 위→아래 빈 슬롯에 채움 → 나머지는 append.
 * (구조분석 작업요소 / L1 C2·C3 / 공정 state 동기화 규칙과 동일)
 */

export type MasterPick = { id: string; name: string; m4?: string };

export function mergeRowsByMasterSelection<T extends { id: string }>(
  current: T[],
  selected: MasterPick[],
  opts: {
    isEmpty: (row: T) => boolean;
    patchNamed: (row: T, item: MasterPick) => T;
    patchEmpty: (row: T, item: MasterPick) => T;
    append: (item: MasterPick, nextIndex: number) => T;
  }
): T[] {
  const selectedIds = new Set(selected.map(s => s.id));
  const map = new Map(selected.map(s => [s.id, s]));

  let work = current.filter(r => opts.isEmpty(r) || selectedIds.has(r.id));

  work = work.map(r => {
    if (opts.isEmpty(r)) return r;
    const item = map.get(r.id);
    return item ? opts.patchNamed(r, item) : r;
  });

  const placedIds = new Set(
    work.filter(r => !opts.isEmpty(r)).map(r => r.id)
  );
  const toPlace = selected.filter(s => !placedIds.has(s.id));

  let pi = 0;
  work = work.map(r => {
    if (!opts.isEmpty(r)) return r;
    if (pi < toPlace.length) return opts.patchEmpty(r, toPlace[pi++]);
    return r;
  });

  while (pi < toPlace.length) {
    work.push(opts.append(toPlace[pi++], work.length));
  }

  return work;
}

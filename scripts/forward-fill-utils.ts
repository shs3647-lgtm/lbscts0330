/**
 * 엑셀 병합 해제용: 빈 셀을 바로 위 행 값으로 채움.
 * 선행 빈칸은 아래 행 첫 값으로 보정(backward fill).
 * skipCols(0-based): 특별특성 등 비지정 시 빈칸 유지
 */
export function fillDownRows(rows: string[][], skipCols: Set<number>): string[][] {
  if (rows.length === 0) return [];
  const width = Math.max(...rows.map((r) => r.length), 0);
  if (width === 0) return rows.map((r) => [...r]);
  const out = rows.map((r) => {
    const copy = [...r];
    while (copy.length < width) copy.push('');
    return copy;
  });
  const cumulative: string[] = new Array(width).fill('');
  for (let i = 0; i < out.length; i++) {
    const r = out[i];
    for (let j = 0; j < width; j++) {
      if (skipCols.has(j)) continue;
      const v = (r[j] ?? '').trim();
      if (v === '') {
        r[j] = cumulative[j] || '';
      } else {
        cumulative[j] = v;
      }
    }
  }
  // backward fill: 선행 빈칸을 아래 첫 값으로 채움
  const nextVal: string[] = new Array(width).fill('');
  for (let i = out.length - 1; i >= 0; i--) {
    const r = out[i];
    for (let j = 0; j < width; j++) {
      if (skipCols.has(j)) continue;
      const v = (r[j] ?? '').trim();
      if (v) nextVal[j] = v;
      else if (nextVal[j]) r[j] = nextVal[j];
    }
  }
  return out;
}

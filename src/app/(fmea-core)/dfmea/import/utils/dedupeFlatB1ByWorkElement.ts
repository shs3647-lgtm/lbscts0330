/**
 * 동일 공정번호 + 4M + 작업요소명인 B1이 엑셀 행 반복으로 여러 번 생긴 경우
 * 첫 B1만 남기고 나머지 B1 행을 제거하며, B2/B3/B4의 parentItemId를 첫 B1 id로 리맵한다.
 * (EN/FFU 등 동일 WE가 FC 행마다 반복될 때 누락 N건 부풀림 완화)
 */
import type { ImportedFlatData } from '../types';

function weKey(b: ImportedFlatData): string {
  const p = (b.processNo || '').trim();
  const m4 = (b.m4 || '').trim();
  const v = (b.value || '').trim();
  return `${p}|${m4}|${v}`;
}

export function dedupeFlatB1ByWorkElement(flat: ImportedFlatData[]): ImportedFlatData[] {
  const firstB1IdByKey = new Map<string, string>();
  const dupB1IdToKeep = new Map<string, string>();

  for (const row of flat) {
    if (row.itemCode !== 'B1' || !row.id) continue;
    const k = weKey(row);
    const existing = firstB1IdByKey.get(k);
    if (existing === undefined) {
      firstB1IdByKey.set(k, row.id);
    } else if (existing !== row.id) {
      dupB1IdToKeep.set(row.id, existing);
    }
  }

  if (dupB1IdToKeep.size === 0) return flat;

  const out: ImportedFlatData[] = [];
  for (const row of flat) {
    if (row.itemCode === 'B1' && row.id && dupB1IdToKeep.has(row.id)) {
      continue;
    }
    const pid = row.parentItemId;
    const mapped =
      pid && dupB1IdToKeep.has(pid) ? dupB1IdToKeep.get(pid)! : pid;
    if (mapped !== pid) {
      out.push({ ...row, parentItemId: mapped });
    } else {
      out.push(row);
    }
  }
  return out;
}

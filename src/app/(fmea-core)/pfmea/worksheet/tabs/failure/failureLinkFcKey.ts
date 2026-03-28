/**
 * 고장연결 — FC 링크↔fcData 매칭용 복합키 (공정|4M|작업요소|원인문구).
 * computeFailureLinkStats · FailureLinkTab 누락 배너에서 동일 정의 사용.
 */

function normText(s: string): string {
  return s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function fcCompositeRowKey(proc: string, m4: string, we: string, text: string): string {
  const p = proc.trim().replace(/\s+/g, ' ').toLowerCase();
  const m = (m4 ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  const w = (we ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  const t = normText(text);
  return [p, m, w, t].join('|');
}

/** 링크에 m4/we 없을 때 fc 시트와의 느슨한 매칭 (공정+원인만) */
export function fcLooseProcTextKey(proc: string, text: string): string {
  const p = proc.trim().replace(/\s+/g, ' ').toLowerCase();
  const t = normText(text);
  return `${p}|${t}`;
}

/**
 * L2 공정번호 표시·정렬 안정화: 선행 숫자 부분을 최소 3자리 zero-pad (001, 020, 100).
 * 문자열 정렬 시 20이 140 뒤로 가는 문제를 방지한다.
 */
export function normalizeL2ProcessNo(no: string | undefined | null): string {
  const s = (no ?? '').trim();
  if (!s) return '';
  const m = s.match(/^(\d+)/);
  if (!m) return s;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n)) return s;
  const padded = String(n).padStart(3, '0');
  const rest = s.slice(m[1].length);
  return rest ? padded + rest : padded;
}

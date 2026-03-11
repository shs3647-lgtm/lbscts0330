/**
 * @file terminology.ts
 * @description PFMEA 표준 용어 유틸리티
 */

// ★★★ 2026-02-03: L1 이름에 "생산공정" 접미사 추가 ★★★
export function formatL1Name(name: string | undefined | null): string {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.includes('입력') || trimmed.includes('클릭') || trimmed.includes('구조분석')) {
    return trimmed || '(구조분석에서 입력)';
  }
  if (trimmed.endsWith('생산공정') || trimmed.endsWith('제조공정') || trimmed.endsWith('공정')) {
    return trimmed;
  }
  return `${trimmed} 생산공정`;
}

/* CODEFREEZE – 2026-02-16 FMEA Master Data 독립 DB 아키텍처 */
/**
 * @file bd-id.ts
 * @description FMEA ID → Data ID 변환 유틸리티
 * @created 2026-02-08
 * @updated 2026-02-16 - MBD/FBD/PBD 명칭 변경
 *
 * 변환 규칙:
 *  pfm26-m001      → MBD-26-001
 *  pfm26-f001      → FBD-26-001
 *  pfm26-p001-l01  → PBD-26-001
 */

/** FMEA 타입별 Data 명칭 */
export const BD_TYPE_LABELS: Record<string, string> = {
  M: 'Master FMEA Basic Data',
  F: 'Family FMEA Basic Data',
  P: 'Part FMEA Basic Data',
};

/**
 * FMEA ID를 Data ID로 변환
 * @param fmeaId - FMEA 프로젝트 ID (예: pfm26-m001)
 * @returns Data ID (예: MBD-26-001)
 */
export function fmeaIdToBdId(fmeaId: string): string {
  const match = fmeaId.match(/^(?:pfm|dfm)(\d+)-([mfp])(\d+)/i);
  if (!match) return `BD-${fmeaId.toUpperCase()}`;
  const [, year, type, seq] = match;
  const prefix = type.toUpperCase() === 'M' ? 'MBD' : type.toUpperCase() === 'F' ? 'FBD' : 'PBD';
  return `${prefix}-${year}-${seq.padStart(3, '0')}`;
}

/** Data ID의 유형 뱃지 색상 */
export const BD_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  M: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  F: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  P: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
};

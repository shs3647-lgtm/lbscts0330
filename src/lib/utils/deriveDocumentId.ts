/**
 * @file deriveDocumentId.ts
 * @description FMEA/CP/PFD ID 상호 변환 유틸리티 (표준화)
 *
 * 표준 ID 규칙:
 *   fmeaId: pfm{YY}-{t}{NNN}     예: pfm26-m002
 *   cpNo:   cp{YY}-{t}{NNN}      예: cp26-m002
 *   pfdNo:  pfd{YY}-{t}{NNN}-NN  예: pfd26-m002-01
 *
 * 변환: prefix 치환 (pfm→cp, pfm→pfd, cp→pfd 등)
 * 금지: `cp-${id.replace(...)}` 방식 (하이픈 중복 발생)
 */

type DocPrefix = 'pfm' | 'cp' | 'pfd' | 'dfm';

/**
 * 문서 ID의 prefix를 치환하여 다른 모듈의 ID를 도출합니다.
 *
 * @example
 * deriveId('pfm26-m002', 'cp')  → 'cp26-m002'
 * deriveId('pfm26-m002', 'pfd') → 'pfd26-m002'
 * deriveId('cp26-m002', 'pfd')  → 'pfd26-m002'
 * deriveId('pfd26-m065', 'cp')  → 'cp26-m065'
 */
export function deriveId(sourceId: string, targetPrefix: DocPrefix): string {
  if (!sourceId) return '';
  const normalized = sourceId.trim().toLowerCase();
  // prefix 치환: pfm/cp/pfd/dfm → targetPrefix
  return normalized.replace(/^(pfm|cp|pfd|dfm)/i, targetPrefix);
}

/**
 * fmeaId → cpNo 도출
 * pfm26-m002 → cp26-m002
 */
export function deriveCpNoFromFmeaId(fmeaId: string): string {
  return deriveId(fmeaId, 'cp');
}

/**
 * fmeaId → pfdNo 도출 (순번 포함)
 * pfm26-m002 → pfd26-m002  (순번 없이)
 * derivePfdNoFromFmeaId(src/lib/utils/derivePfdNo.ts)와 달리
 * 이 함수는 단순 prefix 치환만 수행.
 */
export function derivePfdNoFromFmeaIdSimple(fmeaId: string): string {
  return deriveId(fmeaId, 'pfd');
}

/**
 * cpNo → pfdNo 도출
 * cp26-m002 → pfd26-m002
 */
export function derivePfdNoFromCpNo(cpNo: string): string {
  return deriveId(cpNo, 'pfd');
}

/**
 * cpNo → fmeaId 도출
 * cp26-m002 → pfm26-m002
 */
export function deriveFmeaIdFromCpNo(cpNo: string): string {
  return deriveId(cpNo, 'pfm');
}

/**
 * pfdNo → fmeaId 도출
 * pfd26-m002 → pfm26-m002
 */
export function deriveFmeaIdFromPfdNo(pfdNo: string): string {
  return deriveId(pfdNo, 'pfm');
}

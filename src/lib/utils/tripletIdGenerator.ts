/**
 * @file tripletIdGenerator.ts
 * @description Triplet(PFMEA+CP+PFD) ID 생성 유틸리티
 *
 * ID 규칙:
 *   M/F: {prefix}{year}-{typeCode}{serial}       (linkGroup 없음)
 *   P:   {prefix}{year}-{typeCode}{serial}-i{GG}  (linkGroup 있음)
 *
 * TripletGroup ID: tg{year}-{typeCode}{serial}
 *
 * 시리얼 계산:
 *   M/F: 각 prefix별 독립 (pfm m타입 MAX+1, cp m타입 MAX+1, pfd m타입 MAX+1)
 *   P:   pfm+cp+pfd 3개 prefix 통합 MAX+1 (충돌 방지)
 *
 * @created 2026-03-13
 */

type DocType = 'master' | 'family' | 'part';

interface TripletIds {
  tripletGroupId: string;
  pfmeaId: string;
  cpId: string | null;
  pfdId: string | null;
}

interface SerialResult {
  pfmeaSerial: number;
  cpSerial: number;
  pfdSerial: number;
  unifiedSerial: number;
}

const YEAR = () => new Date().getFullYear().toString().slice(-2);

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * ID 문자열에서 시리얼 번호 추출
 * pfm26-m001 → 1, cp26-p003-i01 → 3
 */
export function extractSerial(id: string, prefix: string, typeCode: string): number {
  const year = YEAR();
  const pattern = new RegExp(`^${prefix}${year}-${typeCode}(\\d{3})`, 'i');
  const match = id.match(pattern);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * 기존 ID 목록에서 특정 prefix+typeCode의 MAX 시리얼 계산
 */
export function getMaxSerial(ids: string[], prefix: string, typeCode: string): number {
  const serials = ids
    .map(id => extractSerial(id, prefix, typeCode))
    .filter(n => n > 0);
  return serials.length > 0 ? Math.max(...serials) : 0;
}

/**
 * M/F 타입: 각 prefix별 독립 시리얼 계산
 * tgIds를 받으면 TripletGroup ID 충돌도 방지 (pfmeaSerial ≥ tgMaxSerial+1)
 */
export function calcMFSerials(
  pfmeaIds: string[],
  cpIds: string[],
  pfdIds: string[],
  typeCode: string,
  tgIds?: string[]
): SerialResult {
  const pfmeaSerial = getMaxSerial(pfmeaIds, 'pfm', typeCode) + 1;
  const cpSerial = getMaxSerial(cpIds, 'cp', typeCode) + 1;
  const pfdSerial = getMaxSerial(pfdIds, 'pfd', typeCode) + 1;
  const tgSerial = tgIds ? getMaxSerial(tgIds, 'tg', typeCode) + 1 : 0;
  const safePfmeaSerial = Math.max(pfmeaSerial, tgSerial);
  return { pfmeaSerial: safePfmeaSerial, cpSerial, pfdSerial, unifiedSerial: 0 };
}

/**
 * P 타입: 3개 prefix + TripletGroup 통합 시리얼 계산
 */
export function calcPartUnifiedSerial(
  pfmeaIds: string[],
  cpIds: string[],
  pfdIds: string[],
  tgIds?: string[]
): number {
  const pfmMax = getMaxSerial(pfmeaIds, 'pfm', 'p');
  const cpMax = getMaxSerial(cpIds, 'cp', 'p');
  const pfdMax = getMaxSerial(pfdIds, 'pfd', 'p');
  const tgMax = tgIds ? getMaxSerial(tgIds, 'tg', 'p') : 0;
  return Math.max(pfmMax, cpMax, pfdMax, tgMax) + 1;
}

/**
 * linkGroup MAX 계산 (TripletGroup 테이블에서)
 */
export function calcNextLinkGroup(existingLinkGroups: number[]): number {
  if (existingLinkGroups.length === 0) return 1;
  return Math.max(...existingLinkGroups) + 1;
}

/**
 * TripletGroup ID 생성
 */
export function generateTripletGroupId(typeCode: string, serial: number): string {
  return `tg${YEAR()}-${typeCode}${pad3(serial)}`.toLowerCase();
}

/**
 * Master/Family Triplet ID 세트 생성
 * M/F는 linkGroup 없음, 각 prefix별 독립 시리얼
 */
export function generateMFTripletIds(
  typeCode: 'm' | 'f',
  serials: SerialResult
): TripletIds {
  const year = YEAR();
  const pfmeaId = `pfm${year}-${typeCode}${pad3(serials.pfmeaSerial)}`.toLowerCase();
  const cpId = `cp${year}-${typeCode}${pad3(serials.cpSerial)}`.toLowerCase();
  const pfdId = `pfd${year}-${typeCode}${pad3(serials.pfdSerial)}`.toLowerCase();
  const tripletGroupId = generateTripletGroupId(typeCode, serials.pfmeaSerial);

  return { tripletGroupId, pfmeaId, cpId, pfdId };
}

/**
 * Part Triplet ID 세트 생성
 * P는 통합 시리얼 + linkGroup
 */
export function generatePartTripletIds(
  unifiedSerial: number,
  linkGroup: number
): TripletIds {
  const year = YEAR();
  const lg = `i${pad2(linkGroup)}`;
  const serial = pad3(unifiedSerial);

  return {
    tripletGroupId: generateTripletGroupId('p', unifiedSerial),
    pfmeaId: `pfm${year}-p${serial}-${lg}`.toLowerCase(),
    cpId: null,
    pfdId: null,
  };
}

/**
 * Lazy 생성용 CP/PFD ID 생성 (기존 TripletGroup 정보에서)
 */
export function generateLazyDocId(
  docKind: 'cp' | 'pfd',
  typeCode: string,
  serial: number,
  linkGroup?: number | null
): string {
  const year = YEAR();
  const prefix = docKind === 'cp' ? 'cp' : 'pfd';
  const base = `${prefix}${year}-${typeCode}${pad3(serial)}`;

  if (typeCode === 'p' && linkGroup) {
    return `${base}-i${pad2(linkGroup)}`.toLowerCase();
  }
  return base.toLowerCase();
}

/**
 * TripletGroup ID에서 typeCode와 serial 추출
 * tg26-m001 → { typeCode: 'm', serial: 1 }
 */
export function parseTripletGroupId(tgId: string): { typeCode: string; serial: number } | null {
  const match = tgId.match(/^tg\d{2}-([mfp])(\d{3})$/i);
  if (!match) return null;
  return { typeCode: match[1].toLowerCase(), serial: parseInt(match[2], 10) };
}

/**
 * 문서 ID에서 typeCode와 serial 추출
 * pfm26-m001 → { typeCode: 'm', serial: 1 }
 * cp26-p003-i01 → { typeCode: 'p', serial: 3 }
 */
export function parseDocId(docId: string): { prefix: string; typeCode: string; serial: number; linkGroup: number | null } | null {
  const match = docId.match(/^(pfm|cp|pfd|dfm)\d{2}-([mfp])(\d{3})(?:-i(\d{2}))?/i);
  if (!match) return null;
  return {
    prefix: match[1].toLowerCase(),
    typeCode: match[2].toLowerCase(),
    serial: parseInt(match[3], 10),
    linkGroup: match[4] ? parseInt(match[4], 10) : null,
  };
}

export type { DocType, TripletIds, SerialResult };

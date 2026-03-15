/**
 * @file buildAtomicHelpers.ts
 * @description buildAtomicDB.ts에서 사용하는 공통 헬퍼 함수 모음
 *
 * 분리 사유: buildAtomicDB.ts 700행 제한 준수
 * - processNo 정규화/그룹핑
 * - itemCode 필터링
 * - m4 그룹핑
 * - distribute 균등 배분
 *
 * @created 2026-03-15
 */

import type { ImportedFlatData } from '../types';

// ════════════════════════════════════════════
// 공통 헬퍼
// ════════════════════════════════════════════

/** 공통공정 processNo 판별 (0, 00, 공통공정, 공통 등) */
export function isCommonProcessNo(pNo: string): boolean {
  const n = pNo.trim().toLowerCase();
  return n === '0' || n === '00' || n === '공통공정' || n === '공통';
}

/**
 * processNo 정규화 — '01' vs '1' 불일치 방지
 * 순수 숫자이면 앞자리 0 제거, 비숫자 접두사(공정/process 등) 제거
 */
export function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  if (!n) return '';
  const lower = n.toLowerCase();
  if (lower === '0' || lower === '공통공정' || lower === '공통') return '00';
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  if (n !== '0' && n !== '00') n = n.replace(/^0+(?=\d)/, '');
  return n;
}

/** itemCode 필터 */
export function byCode(items: ImportedFlatData[], code: string): ImportedFlatData[] {
  return items.filter(i => i.itemCode === code);
}

/** m4별로 그룹핑 */
export function groupByM4(items: ImportedFlatData[]): Map<string, ImportedFlatData[]> {
  const map = new Map<string, ImportedFlatData[]>();
  for (const item of items) {
    const key = item.m4 || '';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

/**
 * processNo별로 flat items 그룹핑 (정규화 적용)
 * 첫 번째 등장한 원본 processNo를 canonical key로 사용
 */
export function groupByProcessNo(data: ImportedFlatData[]): Map<string, ImportedFlatData[]> {
  const map = new Map<string, ImportedFlatData[]>();
  const normToCanonical = new Map<string, string>();
  for (const item of data) {
    const raw = item.processNo;
    const norm = normalizeProcessNo(raw);
    if (!normToCanonical.has(norm)) normToCanonical.set(norm, raw);
    const key = normToCanonical.get(norm)!;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

/**
 * M개 아이템을 N개 슬롯에 균등 배분 (앞쪽 슬롯 우선)
 *
 * 비유: 카드를 N명에게 돌리듯, 앞쪽 사람이 1장 더 받음
 *
 * 예: distribute(4items, 2slots) → [[0,1], [2,3]]  (2:2 균등)
 * 예: distribute(5items, 2slots) → [[0,1,2], [3,4]] (3:2 나머지→처음)
 */
export function distribute<T>(items: T[], slots: number): T[][] {
  if (slots <= 0) return [];
  if (items.length === 0) return Array.from({ length: slots }, () => []);
  const result: T[][] = Array.from({ length: slots }, () => []);
  const base = Math.floor(items.length / slots);
  const extra = items.length % slots;
  let idx = 0;
  for (let s = 0; s < slots; s++) {
    const count = s < extra ? base + 1 : base;
    for (let i = 0; i < count && idx < items.length; i++) {
      result[s].push(items[idx++]);
    }
  }
  return result;
}

/** C1 값 → L1Function.category 변환 */
export function mapC1Category(c1Value: string): string {
  return c1Value || 'YP';
}

/** ProcessProductChar 공용 타입 (공정 단위 1회 생성, FK 참조 전용) */
export interface ProcessProductCharRecord {
  id: string;
  fmeaId: string;
  l2StructId: string;
  name: string;
  specialChar: string;
  orderIndex: number;
}

/** B1 원본 ID → L3Structure UUID 매핑 */
export type B1IdMapping = Map<string, string>;

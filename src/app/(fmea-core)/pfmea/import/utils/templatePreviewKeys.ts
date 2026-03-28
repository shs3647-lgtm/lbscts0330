/**
 * Import 미리보기 L1/L2/L3 키열 — ID 꼬리 4자 + 툴팁용 텍스트 눈금(복합키 표시)
 */

import type { ARow, BRow, CRow } from './template-delete-logic';

export type L1KeyedCode = 'C1' | 'C2' | 'C3' | 'C4';
export type L2KeyedCode = 'A2' | 'A3' | 'A4' | 'A5';
export type L3KeyedCode = 'B1' | 'B2' | 'B3' | 'B4' | 'B5';

/** 확정 ID 마지막 4자 (4자 이하면 전체, 없으면 —) */
export function crossTabKeyTail4(id: string | undefined): string {
  const s = id?.trim();
  if (!s) return '—';
  return s.length <= 4 ? s : s.slice(-4);
}

export function l1ItemKeyDisplayTail4(r: CRow, code: L1KeyedCode): string {
  return crossTabKeyTail4(r._ids[code]);
}

function l1ItemSemanticCompositeTooltipLine(r: CRow, code: L1KeyedCode): string {
  const cat = (r.category ?? '').toString().trim();
  const v = (r[code] ?? '').toString().trim();
  return `텍스트 눈금: ${cat}|${code}|${v.length ? v : '—'}`;
}

export function l1ItemKeyCellTooltip(r: CRow, code: L1KeyedCode): string {
  const full = r._ids[code]?.trim() || '—';
  return `${l1ItemSemanticCompositeTooltipLine(r, code)}\n전체 UUID: ${full}`;
}

export function l2ItemKeyDisplayTail4(r: ARow, code: L2KeyedCode): string {
  return crossTabKeyTail4(r._ids[code]);
}

function l2ItemSemanticCompositeTooltipLine(r: ARow, code: L2KeyedCode): string {
  const p = (r.processNo ?? '').toString().trim();
  const v = (r[code] ?? '').toString().trim();
  return `텍스트 눈금: ${p}|${code}|${v.length ? v : '—'}`;
}

export function l2ItemKeyCellTooltip(r: ARow, code: L2KeyedCode): string {
  const full = r._ids[code]?.trim() || '—';
  return `${l2ItemSemanticCompositeTooltipLine(r, code)}\n전체 UUID: ${full}`;
}

export function l3ItemKeyDisplayTail4(r: BRow, code: L3KeyedCode): string {
  return crossTabKeyTail4(r._ids[code]);
}

function l3ItemSemanticCompositeTooltipLine(r: BRow, code: L3KeyedCode): string {
  const p = (r.processNo ?? '').toString().trim();
  const m = (r.m4 ?? '').toString().trim();
  const v = (r[code] ?? '').toString().trim();
  return `텍스트 눈금: ${p}|${m}|${code}|${v.length ? v : '—'}`;
}

function l3RowCompositeIdsTooltip(r: BRow): string {
  return (['B1', 'B2', 'B3', 'B4', 'B5'] as const)
    .map((c) => `${c}: ${r._ids[c] ?? '—'}`)
    .join('\n');
}

export function l3ItemKeyCellTooltip(r: BRow, code: L3KeyedCode): string {
  const full = r._ids[code]?.trim() || '—';
  return `${l3ItemSemanticCompositeTooltipLine(r, code)}\n전체 UUID: ${full}\n\n행 전체:\n${l3RowCompositeIdsTooltip(r)}`;
}

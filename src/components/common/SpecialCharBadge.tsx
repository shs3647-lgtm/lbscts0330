/**
 * @file SpecialCharBadge.tsx
 * @description 특별특성 배지 공통 컴포넌트 + SC 마스터 해석 유틸
 *
 * SC 마스터 DB 기반 동적 기호 매칭:
 * - localStorage → DB API 자동 폴백
 * - API 로드 완료 시 'sc-master-loaded' 이벤트 → 리렌더
 * - resolveSpecialChar() export — SpecialCharCell, RiskOptHelperCells 등 공용
 */

'use client';

import React, { useEffect, useState } from 'react';

// 하위 호환 export
export const SPECIAL_CHAR_DATA: { symbol: string; meaning: string; color: string; icon: string }[] = [];

export interface ResolvedChar {
  displaySymbol: string;
  meaning: string;
  color: string;
  icon: string;
}

const SC_MASTER_LS_KEY = 'pfmea_special_char_master';
const SC_LOADED_EVENT = 'sc-master-loaded';

type MasterRaw = { customerSymbol?: string; internalSymbol?: string; meaning?: string; color?: string; icon?: string };

let _masterCache: { byInternal: Map<string, ResolvedChar>; byCustomer: Map<string, ResolvedChar>; ts: number } | null = null;
let _fetchScheduled = false;

function buildMaps(items: MasterRaw[]): { byInternal: Map<string, ResolvedChar>; byCustomer: Map<string, ResolvedChar> } {
  const byInternal = new Map<string, ResolvedChar>();
  const byCustomer = new Map<string, ResolvedChar>();
  for (const m of items) {
    const cs = (m.customerSymbol || '').trim();
    const is_ = (m.internalSymbol || '').trim();
    if (!cs && !is_) continue;
    const entry: ResolvedChar = {
      displaySymbol: cs || is_,
      meaning: m.meaning || '',
      color: m.color || '#9e9e9e',
      icon: cs || is_,
    };
    if (is_ && !byInternal.has(is_)) byInternal.set(is_, entry);
    if (cs && !byCustomer.has(cs)) byCustomer.set(cs, entry);
  }
  return { byInternal, byCustomer };
}

function scheduleFetchFromApi() {
  if (_fetchScheduled || typeof window === 'undefined') return;
  _fetchScheduled = true;
  fetch('/api/special-char')
    .then(r => r.json())
    .then(json => {
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem(SC_MASTER_LS_KEY, JSON.stringify(json.data));
        _masterCache = null;
        window.dispatchEvent(new Event(SC_LOADED_EVENT));
      }
    })
    .catch(() => {})
    .finally(() => { _fetchScheduled = false; });
}

function loadMasterLookup(): { byInternal: Map<string, ResolvedChar>; byCustomer: Map<string, ResolvedChar> } {
  const now = Date.now();
  if (_masterCache && now - _masterCache.ts < 30_000) return _masterCache;

  let items: MasterRaw[] = [];
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(SC_MASTER_LS_KEY);
      if (saved) items = JSON.parse(saved) as MasterRaw[];
    } catch {}
  }

  if (items.length === 0) scheduleFetchFromApi();

  const maps = buildMaps(items);
  _masterCache = { ...maps, ts: now };
  return _masterCache;
}

export function invalidateSpecialCharCache() { _masterCache = null; }

/**
 * DB 저장값 → SC 마스터 색상/의미 해석 (3곳 공용: SpecialCharBadge, SpecialCharCell, RiskOptHelperCells)
 * 화면에 그리는 글자는 항상 입력/저장 원문을 쓰고, 마스터는 색·툴팁(의미)만 보조한다.
 * @returns { displaySymbol, color, meaning, icon } 또는 null (미지정/미매칭)
 */
export function resolveSpecialChar(value: string | undefined | null): ResolvedChar | null {
  const v = String(value || '').trim();
  if (!v) return null;
  const { byInternal, byCustomer } = loadMasterLookup();
  return byCustomer.get(v) || byInternal.get(v) || null;
}

/** resolveSpecialChar의 결과에서 CSS 배지 스타일만 반환 */
export function getResolvedBadgeStyle(value: string | undefined | null): React.CSSProperties {
  const r = resolveSpecialChar(value);
  if (!r) return {};
  return { backgroundColor: r.color, color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 };
}

/** 화면 표시용 원문 (마스터 기호로 치환하지 않음) */
export function getResolvedSymbol(value: string | undefined | null): string {
  return String(value ?? '');
}

// ─── Badge 컴포넌트 ───

export interface SpecialCharBadgeProps {
  value: string;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const SpecialCharBadge = React.memo(function SpecialCharBadge({ value, onClick, size = 'md' }: SpecialCharBadgeProps) {
  // API fetch 완료 후 리렌더
  const [, setTick] = useState(0);
  useEffect(() => {
    const h = () => { invalidateSpecialCharCache(); setTick(t => t + 1); };
    window.addEventListener(SC_LOADED_EVENT, h);
    return () => window.removeEventListener(SC_LOADED_EVENT, h);
  }, []);

  const displayValue = String(value ?? '');
  const resolved = displayValue.trim() ? resolveSpecialChar(displayValue) : null;

  const sizeStyles = {
    sm: { fontSize: '10px', padding: '1px 4px', gap: '1px' },
    md: { fontSize: '11px', padding: '2px 6px', gap: '2px' },
    lg: { fontSize: '12px', padding: '3px 8px', gap: '3px' },
  };
  const style = sizeStyles[size];

  if (!displayValue.trim()) {
    return (
      <div onClick={onClick} className="cursor-pointer flex items-center justify-center h-full hover:bg-gray-100"
        style={{ padding: '4px', minHeight: '24px' }} title="클릭하여 특별특성 지정">
        <span style={{ color: '#ccc', fontSize: '10px' }}>-</span>
      </div>
    );
  }

  const bgColor = resolved?.color || '#9e9e9e';

  return (
    <div onClick={onClick} className="cursor-pointer flex items-center justify-center h-full" style={{ padding: '4px' }}>
      <span
        style={{
          background: bgColor, color: 'white', padding: style.padding, borderRadius: '4px',
          fontSize: style.fontSize, fontWeight: 600, display: 'inline-flex', alignItems: 'center',
          gap: style.gap, boxShadow: '0 1px 3px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
          border: `2px solid ${bgColor}`,
        }}
        title={resolved?.meaning ? `${resolved.meaning} (${displayValue})` : displayValue}
      >
        {displayValue}
      </span>
    </div>
  );
});
export default SpecialCharBadge;

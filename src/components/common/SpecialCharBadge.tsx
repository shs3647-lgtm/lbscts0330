/**
 * @file SpecialCharBadge.tsx
 * @description 특별특성 배지 공통 컴포넌트 (2L/3L/고장분석 모든 화면에서 사용)
 *
 * SC 마스터 DB(localStorage 'pfmea_special_char_master') 기반 동적 기호 매칭:
 * - 마스터에 등록된 customerSymbol/internalSymbol/color 그대로 표시
 * - 하드코딩 기호 없음 — 마스터 등록 기호와 화면 표시 100% 일치
 */

'use client';

import React from 'react';

// 하위 호환용 export (다른 파일에서 참조 시) — 빈 배열, 실제 데이터는 마스터에서 로드
export const SPECIAL_CHAR_DATA: { symbol: string; meaning: string; color: string; icon: string }[] = [];

interface ResolvedChar {
  displaySymbol: string;
  meaning: string;
  color: string;
  icon: string;
}

const SC_MASTER_LS_KEY = 'pfmea_special_char_master';

/** SC 마스터 캐시 — localStorage + DB API 자동 로드 (30초 TTL) */
let _masterCache: { byInternal: Map<string, ResolvedChar>; byCustomer: Map<string, ResolvedChar>; ts: number } | null = null;
let _fetchScheduled = false;

type MasterRaw = { customerSymbol?: string; internalSymbol?: string; meaning?: string; color?: string; icon?: string };

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

/** localStorage 비어있으면 DB API에서 자동 로드 후 localStorage + 캐시 갱신 */
function scheduleFetchFromApi() {
  if (_fetchScheduled || typeof window === 'undefined') return;
  _fetchScheduled = true;
  fetch('/api/special-char')
    .then(r => r.json())
    .then(json => {
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem(SC_MASTER_LS_KEY, JSON.stringify(json.data));
        _masterCache = null; // 다음 resolveCharData 호출 시 재로드
      }
    })
    .catch(() => { /* API 실패 — 다음 세션에서 재시도 */ })
    .finally(() => { _fetchScheduled = false; });
}

function loadMasterLookup(): { byInternal: Map<string, ResolvedChar>; byCustomer: Map<string, ResolvedChar> } {
  const now = Date.now();
  if (_masterCache && now - _masterCache.ts < 30_000) {
    return _masterCache;
  }

  let items: MasterRaw[] = [];

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(SC_MASTER_LS_KEY);
      if (saved) {
        items = JSON.parse(saved) as MasterRaw[];
      }
    } catch { /* parse error */ }
  }

  // localStorage 비어있으면 DB API에서 비동기 로드 예약
  if (items.length === 0) {
    scheduleFetchFromApi();
  }

  const maps = buildMaps(items);
  _masterCache = { ...maps, ts: now };
  return _masterCache;
}

/** SC 마스터 캐시 강제 갱신 (마스터 모달 저장 후 호출) */
export function invalidateSpecialCharCache() {
  _masterCache = null;
}

/** value(DB 저장값) -> 마스터 기호/색상 해석 */
function resolveCharData(value: string): ResolvedChar | null {
  if (!value || value === '-') return null;
  const { byInternal, byCustomer } = loadMasterLookup();
  // 1순위: customerSymbol 직접 매칭
  const byCust = byCustomer.get(value);
  if (byCust) return byCust;
  // 2순위: internalSymbol 매칭 -> customerSymbol 변환
  const byInt = byInternal.get(value);
  if (byInt) return byInt;
  return null;
}

export interface SpecialCharBadgeProps {
  value: string;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 특별특성 배지 컴포넌트
 * - SC 마스터 등록 기호와 100% 일치하는 기호/색상 표시
 */
const SpecialCharBadge = React.memo(function SpecialCharBadge({ value, onClick, size = 'md' }: SpecialCharBadgeProps) {
  const resolved = resolveCharData(value);
  const displayValue = resolved?.displaySymbol || value;

  // 크기별 스타일
  const sizeStyles = {
    sm: { fontSize: '10px', padding: '1px 4px', gap: '1px' },
    md: { fontSize: '11px', padding: '2px 6px', gap: '2px' },
    lg: { fontSize: '12px', padding: '3px 8px', gap: '3px' },
  };

  const style = sizeStyles[size];

  // 미지정 상태 - 빈 칸으로 표시 (클릭하면 선택 가능)
  if (!displayValue) {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer flex items-center justify-center h-full hover:bg-gray-100"
        style={{ padding: '4px', minHeight: '24px' }}
        title="클릭하여 특별특성 지정"
      >
        <span style={{ color: '#ccc', fontSize: '10px' }}>-</span>
      </div>
    );
  }

  // 지정됨 상태 — 마스터 등록 색상 사용, 미등록이면 회색
  const bgColor = resolved?.color || '#9e9e9e';
  const icon = resolved?.icon || '';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer flex items-center justify-center h-full"
      style={{ padding: '4px' }}
    >
      <span
        style={{
          background: bgColor,
          color: 'white',
          padding: style.padding,
          borderRadius: '4px',
          fontSize: style.fontSize,
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: style.gap,
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
          border: `2px solid ${bgColor}`,
        }}
        title={resolved?.meaning || displayValue}
      >
        {icon && icon !== displayValue && <span style={{ fontSize: '10px' }}>{icon}</span>}
        {displayValue}
      </span>
    </div>
  );
});
export default SpecialCharBadge;

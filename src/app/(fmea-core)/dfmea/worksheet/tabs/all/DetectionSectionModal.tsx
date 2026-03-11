/**
 * @file DetectionSectionModal.tsx
 * @description 검출관리(DC) 2섹션 선택 모달 — AIAG-VDA 표준 준수
 * - 1순위: 고장형태(FM) 검출 → [FM] 마커
 * - 2순위: 고장원인(FC) 검출 → [FC] 마커
 * - 저장 형식: "[FM]D:SPC공정능력\n[FC]D:육안검사\n[FC]D:PDA스캔검사"
 * - 하위호환: 마커 없는 기존 데이터 → FC 섹션으로 기본 배치
 * @created 2026-02-28
 */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDraggableModal } from '@/components/modals/useDraggableModal';
import type { DataItem } from '@/components/modals/data/defaultItems';
import {
  recommendDetection, FM_ALLOWED_RATINGS, FC_ALLOWED_RATINGS,
} from './hooks/detectionRatingMap';

interface DetectionSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 저장: [FM]D:xxx, [FC]D:yyy 형식 문자열 배열 (P:/D: 접두어 없이) */
  onSave: (selectedValues: string[]) => void;
  onDelete?: () => void;
  fmText?: string;
  fcText?: string;
  processNo?: string;
  processName?: string;
  /** 현재 저장된 값 (P:/D: 접두어 제거 후 전달됨) */
  currentValues: string[];
  sodInfo?: { s?: number; o?: number; d?: number; ap?: string };
}

/** [FM]/[FC] 마커를 파싱하여 섹션별 값 분리 */
function parseSectionValues(values: string[]): { fmValues: string[]; fcValues: string[] } {
  const fmValues: string[] = [];
  const fcValues: string[] = [];
  for (const v of values) {
    if (v.startsWith('[FM]')) {
      fmValues.push(v.slice(4)); // [FM] 제거
    } else if (v.startsWith('[FC]')) {
      fcValues.push(v.slice(4)); // [FC] 제거
    } else {
      fcValues.push(v); // 마커 없음 → FC 기본 배치 (하위호환)
    }
  }
  return { fmValues, fcValues };
}

export default function DetectionSectionModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  fmText,
  fcText,
  processNo,
  processName,
  currentValues,
  sodInfo,
}: DetectionSectionModalProps) {
  // 드래그 가능 모달
  const { position, handleMouseDown } = useDraggableModal({
    initialPosition: { top: 100, right: 100 },
    modalWidth: 600,
    modalHeight: 500,
    isOpen,
  });

  // ── 아이템 풀 로드 ──
  const [allItems, setAllItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // ── 섹션별 선택 상태 ──
  const [fmSelectedIds, setFmSelectedIds] = useState<Set<string>>(new Set());
  const [fcSelectedIds, setFcSelectedIds] = useState<Set<string>>(new Set());

  // 아이템 풀 로드
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/dfmea/master?includeItems=true');
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const flatItems: DataItem[] = (data.active?.flatItems || [])
          .filter((it: { itemCode?: string }) => it.itemCode === 'A6')
          .map((it: { id?: string; value?: string; category?: string; processNo?: string }) => ({
            id: it.id || `dc-${it.value}`,
            value: it.value || '',
            category: it.category || '',
            processNo: it.processNo || '',
          }));
        // 공정번호 필터 (해당 공정 + 공통공정)
        const filtered = processNo
          ? flatItems.filter(it => {
              const pn = String(it.processNo ?? '').trim();
              return pn === String(processNo) || pn === '0' || !pn;
            })
          : flatItems;
        // 중복 제거 (value 기준)
        const seen = new Set<string>();
        const unique = filtered.filter(it => {
          const key = it.value.trim();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (!cancelled) setAllItems(unique);
      } catch (err) {
        console.error('[DetectionSectionModal] 아이템 로드 오류:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, processNo]);

  // 초기 선택 상태 복원
  useEffect(() => {
    if (!isOpen) return;
    const { fmValues, fcValues } = parseSectionValues(currentValues);
    setFmSelectedIds(new Set(fmValues.map(v => v.replace(/^D:/, ''))));
    setFcSelectedIds(new Set(fcValues.map(v => v.replace(/^D:/, ''))));
  }, [isOpen, currentValues]);

  // 검색 포커스
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 검색 필터링
  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return allItems;
    const q = searchText.trim().toLowerCase();
    return allItems.filter(it => it.value.toLowerCase().includes(q));
  }, [allItems, searchText]);

  // ★ FM에서 선택된 항목들의 최고(최저) D등급 계산
  const fmBestD = useMemo(() => {
    if (fmSelectedIds.size === 0) return 0;
    let best = 11;
    fmSelectedIds.forEach(v => {
      const d = recommendDetection(v, 'fm');
      if (d > 0 && d < best) best = d;
    });
    return best <= 10 ? best : 0;
  }, [fmSelectedIds]);

  // ★ FC 섹션에 표시할 아이템 필터링
  // 규칙: FC 검출은 FM 검출보다 등급이 좋은(낮은) 것만 표시
  const fcFilteredItems = useMemo(() => {
    if (fmBestD === 0) return filteredItems; // FM 미선택 → 전체 표시
    return filteredItems.filter(it => {
      const d = recommendDetection(it.value, 'fc');
      // D값 매칭 안 되는 항목(d=0)도 표시 (사용자가 판단)
      return d === 0 || d < fmBestD;
    });
  }, [filteredItems, fmBestD]);

  // ── 핸들러 ──
  const toggleFm = (value: string) => {
    setFmSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const toggleFc = (value: string) => {
    setFcSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const selectAllFm = () => setFmSelectedIds(new Set(filteredItems.map(it => it.value)));
  const deselectAllFm = () => setFmSelectedIds(new Set());
  const selectAllFc = () => setFcSelectedIds(new Set(fcFilteredItems.map(it => it.value)));
  const deselectAllFc = () => setFcSelectedIds(new Set());

  const handleApply = () => {
    // [FM]D:xxx 형식으로 결합 → onSave에 전달
    const values: string[] = [];
    fmSelectedIds.forEach(v => values.push(`[FM]${v}`));
    fcSelectedIds.forEach(v => values.push(`[FC]${v}`));
    onSave(values);
  };

  const handleDeleteAll = () => {
    if (onDelete) onDelete();
  };

  const fmCount = fmSelectedIds.size;
  const fcCount = fcSelectedIds.size;
  const totalCount = fmCount + fcCount;

  if (!isOpen) return null;

  return createPortal(
    <div style={{
      position: 'fixed', top: `${position.top}px`, right: `${position.right}px`,
      width: '600px', maxHeight: '80vh', zIndex: 99990,
      background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column',
    }}>
      {/* ──── 헤더 ──── */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '8px 12px', background: '#1e40af', color: '#fff', borderRadius: '8px 8px 0 0',
          cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>검출관리 선택</span>
          {sodInfo && (
            <span style={{ fontSize: '10px', opacity: 0.85 }}>
              S:{sodInfo.s || '-'} O:{sodInfo.o || '-'} D:{sodInfo.d || '-'}
              {sodInfo.ap && <span style={{ marginLeft: '4px', fontWeight: 700 }}>AP:{sodInfo.ap}</span>}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {processName && (
            <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: '4px' }}>
              {processName}
            </span>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
        </div>
      </div>

      {/* ──── 검색바 + 버튼 ──── */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          ref={searchRef}
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="검출관리 검색..."
          style={{ flex: 1, padding: '4px 8px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '4px', outline: 'none' }}
        />
        <button onClick={handleApply} disabled={totalCount === 0}
          style={{ padding: '3px 12px', fontSize: '11px', fontWeight: 600, background: totalCount > 0 ? '#2563eb' : '#9ca3af', color: '#fff', border: 'none', borderRadius: '4px', cursor: totalCount > 0 ? 'pointer' : 'default' }}>
          적용
        </button>
        <button onClick={handleDeleteAll}
          style={{ padding: '3px 8px', fontSize: '11px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          삭제
        </button>
      </div>

      {/* ──── 스크롤 영역 ──── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>로딩 중...</div>
        ) : allItems.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
            검출관리 기초정보가 없습니다.<br />Import에서 검출관리 데이터를 먼저 등록해주세요.
          </div>
        ) : (
          <>
            {/* ── 1순위: 고장형태(FM) 검출 ── */}
            <SectionPanel
              title="1순위: 고장형태(FM) 검출"
              badgeText={fmText || '(미지정)'}
              badgeColor="#16a34a"
              items={filteredItems}
              selectedIds={fmSelectedIds}
              onToggle={toggleFm}
              onSelectAll={selectAllFm}
              onDeselectAll={deselectAllFm}
              selectedCount={fmCount}
              ratingInfo="D:2~10"
            />

            {/* ── 구분선 ── */}
            <div style={{ height: '1px', background: '#d1d5db', margin: '0 10px' }} />

            {/* ── 2순위: 고장원인(FC) 검출 ── */}
            <SectionPanel
              title="2순위: 고장원인(FC) 검출"
              badgeText={fcText || '(미지정)'}
              badgeColor="#ea580c"
              items={fcFilteredItems}
              selectedIds={fcSelectedIds}
              onToggle={toggleFc}
              onSelectAll={selectAllFc}
              onDeselectAll={deselectAllFc}
              selectedCount={fcCount}
              ratingInfo={fmBestD > 0 ? `D<${fmBestD} 허용` : 'D:2,5,6,7,8'}
            />
          </>
        )}
      </div>

      {/* ──── 푸터 ──── */}
      <div style={{
        padding: '6px 12px', borderTop: '1px solid #e5e7eb', background: '#f9fafb',
        borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'center', gap: '12px',
        fontSize: '11px', color: '#374151',
      }}>
        {fmCount > 0 && <span style={{ color: '#16a34a', fontWeight: 600 }}>FM:{fmCount}개</span>}
        {fcCount > 0 && <span style={{ color: '#ea580c', fontWeight: 600 }}>FC:{fcCount}개</span>}
        {totalCount > 0
          ? <span>총 {totalCount}개 선택</span>
          : <span style={{ color: '#9ca3af' }}>선택된 항목 없음</span>
        }
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════
// 섹션 패널 (FM / FC)
// ═══════════════════════════════════════════
interface SectionPanelProps {
  title: string;
  badgeText: string;
  badgeColor: string;
  items: DataItem[];
  selectedIds: Set<string>;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selectedCount: number;
  ratingInfo?: string;
}

function SectionPanel({
  title, badgeText, badgeColor, items, selectedIds,
  onToggle, onSelectAll, onDeselectAll, selectedCount, ratingInfo,
}: SectionPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ padding: '6px 10px' }}>
      {/* 섹션 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#374151', padding: 0 }}
        >
          {collapsed ? '▶' : '▼'}
        </button>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>{title}</span>
        <span style={{
          fontSize: '10px', fontWeight: 600, color: '#fff', background: badgeColor,
          padding: '1px 6px', borderRadius: '4px', maxWidth: '250px', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={badgeText}>
          {badgeText}
        </span>
        {selectedCount > 0 && (
          <span style={{ fontSize: '10px', color: badgeColor, fontWeight: 600 }}>({selectedCount})</span>
        )}
        {ratingInfo && (
          <span style={{ fontSize: '9px', color: '#6b7280', background: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>
            {ratingInfo}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button onClick={onSelectAll}
            style={{ fontSize: '9px', padding: '1px 6px', border: '1px solid #d1d5db', borderRadius: '3px', background: '#f3f4f6', cursor: 'pointer' }}>
            전체
          </button>
          <button onClick={onDeselectAll}
            style={{ fontSize: '9px', padding: '1px 6px', border: '1px solid #d1d5db', borderRadius: '3px', background: '#f3f4f6', cursor: 'pointer' }}>
            해제
          </button>
        </div>
      </div>

      {/* 아이템 그리드 */}
      {!collapsed && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px',
          maxHeight: '180px', overflowY: 'auto',
        }}>
          {items.map(item => {
            const isSelected = selectedIds.has(item.value);
            return (
              <label
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 6px',
                  fontSize: '11px', cursor: 'pointer', borderRadius: '3px',
                  background: isSelected ? `${badgeColor}10` : 'transparent',
                  border: isSelected ? `1px solid ${badgeColor}40` : '1px solid transparent',
                }}
                title={item.value}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(item.value)}
                  style={{ width: '13px', height: '13px', accentColor: badgeColor }}
                />
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: isSelected ? '#1f2937' : '#4b5563',
                  fontWeight: isSelected ? 600 : 400,
                }}>
                  {item.value}
                </span>
              </label>
            );
          })}
          {items.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '8px', textAlign: 'center', color: '#9ca3af', fontSize: '10px' }}>
              검색 결과 없음
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * @file PreventionSectionModal.tsx
 * @description 예방관리(PC) 2섹션 선택 모달 — AIAG-VDA 발생도 평가 기준
 * - 1순위: 예방관리 효과성 (B5 마스터) → O등급 표시
 * - 2순위: 추가 예방관리 추천 (산업DB) → B/T/BP 분류 + O→O 개선 표시
 * - DetectionSectionModal과 통일된 UI/UX
 * @created 2026-02-28
 */
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDraggableModal } from '@/components/modals/useDraggableModal';
import type { DataItem } from '@/components/modals/data/defaultItems';
import {
  recommendOccurrence, analyzePCControlType, type PCControlType,
} from './hooks/occurrenceRecommendMap';

// ═══════════════════════════════════════════
// B/T/BP 분류 상수
// ═══════════════════════════════════════════
type BadgeType = 'B' | 'T' | 'BP';

function toBadgeType(ct: PCControlType): BadgeType {
  if (ct === 'technical') return 'T';
  if (ct === 'bestPractice' || ct === 'designPrevent') return 'BP';
  return 'B'; // systematic, none → 행동적
}

const BADGE_COLORS: Record<BadgeType, string> = {
  B: '#007BFF',   // 행동적 — 파란색
  T: '#28A745',   // 기술적 — 초록색
  BP: '#FFC107',  // 모범사례 — 노란색
};
const BADGE_LABELS: Record<BadgeType, string> = {
  B: '행동적', T: '기술적', BP: '모범사례',
};

// ═══════════════════════════════════════════
// 산업DB 아이템 타입
// ═══════════════════════════════════════════
interface KrPreventionItem {
  id: string;
  method: string;
  fcKeyword: string;
  m4Category: string;
  category: string;
  /** 분류 결과 */
  badge: BadgeType;
  /** 추천 O */
  recommendedO: number;
}

interface PreventionSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedValues: string[]) => void;
  onDelete?: () => void;
  fcText?: string;
  processNo?: string;
  processName?: string;
  currentValues: string[];
  sodInfo?: { s?: number; o?: number; d?: number; ap?: string };
}

export default function PreventionSectionModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  fcText,
  processNo,
  processName,
  currentValues,
  sodInfo,
}: PreventionSectionModalProps) {
  const { position, handleMouseDown } = useDraggableModal({
    initialPosition: { top: 100, right: 100 },
    modalWidth: 600,
    modalHeight: 500,
    isOpen,
  });

  // ── 상태 ──
  const [masterItems, setMasterItems] = useState<DataItem[]>([]);
  const [krItems, setKrItems] = useState<KrPreventionItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 섹션별 선택 상태
  const [sec1SelectedIds, setSec1SelectedIds] = useState<Set<string>>(new Set());
  const [sec2SelectedIds, setSec2SelectedIds] = useState<Set<string>>(new Set());
  // 2순위 필터
  const [badgeFilter, setBadgeFilter] = useState<'all' | BadgeType>('all');

  // ── 데이터 로드 ──
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // 1순위: B5 마스터 + 2순위: 산업DB 병렬 로드
        const [masterRes, krRes] = await Promise.all([
          fetch('/api/dfmea/master?includeItems=true'),
          fetch('/api/kr-industry?type=prevention'),
        ]);

        // B5 마스터 아이템
        if (masterRes.ok) {
          const data = await masterRes.json();
          const flatItems: DataItem[] = (data.active?.flatItems || [])
            .filter((it: { itemCode?: string }) => it.itemCode === 'B5')
            .map((it: { id?: string; value?: string; category?: string; processNo?: string }) => ({
              id: it.id || `pc-${it.value}`,
              value: it.value || '',
              category: it.category || '',
              processNo: it.processNo || '',
            }));
          const filtered = processNo
            ? flatItems.filter(it => {
                const pn = String(it.processNo ?? '').trim();
                return pn === String(processNo) || pn === '0' || !pn;
              })
            : flatItems;
          const seen = new Set<string>();
          const unique = filtered.filter(it => {
            const key = it.value.trim();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          if (!cancelled) setMasterItems(unique);
        }

        // 산업DB 아이템
        if (krRes.ok) {
          const krData = await krRes.json();
          const prevention: Array<{
            id: string; method: string; fcKeyword: string;
            m4Category: string; category: string;
          }> = krData.prevention || [];
          const items: KrPreventionItem[] = prevention.map(entry => {
            const { controlType } = analyzePCControlType(entry.method);
            return {
              id: entry.id || `kr-${entry.method}`,
              method: entry.method,
              fcKeyword: entry.fcKeyword || '',
              m4Category: entry.m4Category || '',
              category: entry.category || '',
              badge: toBadgeType(controlType),
              recommendedO: recommendOccurrence(entry.method),
            };
          });
          if (!cancelled) setKrItems(items);
        }
      } catch (err) {
        console.error('[PreventionSectionModal] 데이터 로드 오류:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, processNo]);

  // ── 초기 선택 복원 ──
  useEffect(() => {
    if (!isOpen) return;
    const sec1 = new Set<string>();
    const sec2 = new Set<string>();
    for (const v of currentValues) {
      const clean = v.replace(/^P:/, '');
      // 마스터 목록에 있으면 1순위, 없으면 2순위
      sec1.add(clean);
    }
    setSec1SelectedIds(sec1);
    setSec2SelectedIds(sec2);
  }, [isOpen, currentValues]);

  // ── 1순위 bestO 계산 ──
  const sec1BestO = useMemo(() => {
    if (sec1SelectedIds.size === 0) return 0;
    let best = 11;
    sec1SelectedIds.forEach(v => {
      const o = recommendOccurrence(v);
      if (o > 0 && o < best) best = o;
    });
    return best <= 10 ? best : 0;
  }, [sec1SelectedIds]);

  // ── 2순위: FC 키워드 매칭 + O 개선 필터 ──
  const filteredKrItems = useMemo(() => {
    const currentO = sec1BestO || (sodInfo?.o ?? 0);
    let items = krItems;

    // FC 키워드 매칭 (fcText와 산업DB fcKeyword)
    if (fcText) {
      const fcLower = fcText.toLowerCase();
      const matched = items.filter(it => {
        const keywords = it.fcKeyword.split(',').map(k => k.trim().toLowerCase());
        return keywords.some(kw => kw && fcLower.includes(kw));
      });
      // 매칭된 항목이 있으면 매칭된 것만, 없으면 전체 표시
      if (matched.length > 0) items = matched;
    }

    // B/T/BP 필터
    if (badgeFilter !== 'all') {
      items = items.filter(it => it.badge === badgeFilter);
    }

    // 마스터에 이미 있는 항목 제거 (중복 방지)
    const masterValues = new Set(masterItems.map(it => it.value));
    items = items.filter(it => !masterValues.has(it.method));

    // O 개선 가능 항목 정렬 (개선폭 큰 순)
    return [...items].sort((a, b) => {
      const aO = a.recommendedO || 10;
      const bO = b.recommendedO || 10;
      return aO - bO; // O가 낮은(좋은) 항목 상단
    });
  }, [krItems, fcText, badgeFilter, masterItems, sec1BestO, sodInfo]);

  // ── 실시간 O 예측 ──
  const predictedO = useMemo(() => {
    let best = sec1BestO || 0;
    sec2SelectedIds.forEach(v => {
      const item = krItems.find(it => it.method === v);
      const o = item?.recommendedO ?? recommendOccurrence(v);
      if (o > 0 && (best === 0 || o < best)) best = o;
    });
    return best;
  }, [sec1BestO, sec2SelectedIds, krItems]);

  // ── 핸들러 ──
  const toggleSec1 = useCallback((value: string) => {
    setSec1SelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  }, []);

  const toggleSec2 = useCallback((value: string) => {
    setSec2SelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  }, []);

  const selectAllSec1 = useCallback((values: string[]) => setSec1SelectedIds(new Set(values)), []);
  const deselectAllSec1 = useCallback(() => setSec1SelectedIds(new Set()), []);
  const selectAllSec2 = useCallback((values: string[]) => setSec2SelectedIds(new Set(values)), []);
  const deselectAllSec2 = useCallback(() => setSec2SelectedIds(new Set()), []);

  const handleApply = () => {
    const values: string[] = [];
    sec1SelectedIds.forEach(v => values.push(v));
    sec2SelectedIds.forEach(v => values.push(v));
    onSave(values);
  };

  const sec1Count = sec1SelectedIds.size;
  const sec2Count = sec2SelectedIds.size;
  const totalCount = sec1Count + sec2Count;

  if (!isOpen) return null;

  const currentO = sodInfo?.o ?? 0;

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
          padding: '8px 12px', background: '#0d47a1', color: '#fff', borderRadius: '8px 8px 0 0',
          cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>예방관리 선택</span>
          {sodInfo && (
            <span style={{ fontSize: '10px', opacity: 0.85 }}>
              S:{sodInfo.s || '-'}{' '}
              O:{currentO || '-'}
              {predictedO > 0 && predictedO !== currentO && (
                <span style={{ color: '#90caf9' }}> → {predictedO}</span>
              )}
              {' '}D:{sodInfo.d || '-'}
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

      {/* ──── 버튼 바 ──── */}
      <div style={{ padding: '4px 10px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
        <button onClick={handleApply} disabled={totalCount === 0}
          style={{ padding: '3px 12px', fontSize: '11px', fontWeight: 600, background: totalCount > 0 ? '#0d47a1' : '#9ca3af', color: '#fff', border: 'none', borderRadius: '4px', cursor: totalCount > 0 ? 'pointer' : 'default' }}>
          적용<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(OK)</span>
        </button>
        <button onClick={() => onDelete?.()}
          style={{ padding: '3px 8px', fontSize: '11px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          삭제<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(Del)</span>
        </button>
      </div>

      {/* ──── 스크롤 영역 ──── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>로딩 중...</div>
        ) : masterItems.length === 0 && krItems.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
            예방관리 기초정보가 없습니다.<br />Import에서 예방관리 데이터를 먼저 등록해주세요.
          </div>
        ) : (
          <>
            {/* ── 1순위: 예방관리 효과성 ── */}
            <Section1Panel
              items={masterItems}
              selectedIds={sec1SelectedIds}
              onToggle={toggleSec1}
              onSelectAll={selectAllSec1}
              onDeselectAll={deselectAllSec1}
              selectedCount={sec1Count}
              fcText={fcText}
            />

            <div style={{ height: '1px', background: '#d1d5db', margin: '0 10px' }} />

            {/* ── 2순위: 추가 예방관리 추천 ── */}
            <Section2Panel
              items={filteredKrItems}
              selectedIds={sec2SelectedIds}
              onToggle={toggleSec2}
              onSelectAll={selectAllSec2}
              onDeselectAll={deselectAllSec2}
              selectedCount={sec2Count}
              currentO={sec1BestO || currentO}
              badgeFilter={badgeFilter}
              setBadgeFilter={setBadgeFilter}
              fcText={fcText}
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
        {sec1Count > 0 && <span style={{ color: '#0d47a1', fontWeight: 600 }}>1순위:{sec1Count}개</span>}
        {sec2Count > 0 && <span style={{ color: '#28A745', fontWeight: 600 }}>2순위:{sec2Count}개</span>}
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
// 1순위: 예방관리 효과성 (B5 마스터)
// ═══════════════════════════════════════════
interface Section1PanelProps {
  items: DataItem[];
  selectedIds: Set<string>;
  onToggle: (value: string) => void;
  onSelectAll: (values: string[]) => void;
  onDeselectAll: () => void;
  selectedCount: number;
  fcText?: string;
}

function Section1Panel({
  items, selectedIds, onToggle, onSelectAll, onDeselectAll, selectedCount, fcText,
}: Section1PanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchText, setSearchText] = useState('');
  const badgeColor = '#FF8C00'; // 주황

  // 검색 필터 + O등급순 정렬
  const filteredItems = useMemo(() => {
    let list = items;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(it => it.value.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const aO = recommendOccurrence(a.value) || 11;
      const bO = recommendOccurrence(b.value) || 11;
      return aO - bO;
    });
  }, [items, searchText]);

  return (
    <div style={{ padding: '6px 10px' }}>
      {/* 헤더 행 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#374151', padding: 0 }}>
          {collapsed ? '▶' : '▼'}
        </button>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>1순위: 예방관리 효과성</span>
        {fcText && (
          <span style={{
            fontSize: '10px', fontWeight: 600, color: '#fff', background: badgeColor,
            padding: '1px 6px', borderRadius: '4px', flex: 1, minWidth: 0, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={fcText}>
            {fcText}
          </span>
        )}
        {selectedCount > 0 && (
          <span style={{ fontSize: '10px', color: badgeColor, fontWeight: 600 }}>({selectedCount})</span>
        )}
        <span style={{ fontSize: '9px', color: '#6b7280', background: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>
          O:2~10
        </span>
      </div>
      {!collapsed && (
        <>
          {/* 검색 + 전체/해제 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="1순위 검색..."
              style={{
                flex: 1, padding: '3px 6px', fontSize: '10px', border: '1px solid #d1d5db',
                borderRadius: '4px', outline: 'none', background: '#f9fafb',
              }}
            />
            <button onClick={() => onSelectAll(filteredItems.map(it => it.value))} style={miniBtn}>전체<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(All)</span></button>
            <button onClick={onDeselectAll} style={miniBtn}>해제<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(Clr)</span></button>
          </div>
          {/* 아이템 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
            {filteredItems.map(item => {
              const isSelected = selectedIds.has(item.value);
              const oVal = recommendOccurrence(item.value);
              return (
                <label key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 6px',
                  fontSize: '11px', cursor: 'pointer', borderRadius: '3px',
                  background: isSelected ? '#0d47a110' : 'transparent',
                  border: isSelected ? '1px solid #0d47a140' : '1px solid transparent',
                }} title={item.value}>
                  <input type="checkbox" checked={isSelected} onChange={() => onToggle(item.value)}
                    style={{ width: '13px', height: '13px', accentColor: '#0d47a1' }} />
                  {oVal > 0 && (
                    <span style={{
                      fontSize: '9px', fontWeight: 700, color: '#fff',
                      background: oVal <= 3 ? '#28A745' : oVal <= 6 ? '#FF8C00' : '#dc3545',
                      padding: '0 4px', borderRadius: '3px', minWidth: '26px', textAlign: 'center',
                    }}>O:{oVal}</span>
                  )}
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: isSelected ? '#1f2937' : '#4b5563', fontWeight: isSelected ? 600 : 400,
                  }}>{item.value}</span>
                </label>
              );
            })}
            {filteredItems.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '8px', textAlign: 'center', color: '#9ca3af', fontSize: '10px' }}>
                검색 결과 없음
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// 2순위: 추가 예방관리 추천 (산업DB)
// ═══════════════════════════════════════════
interface Section2PanelProps {
  items: KrPreventionItem[];
  selectedIds: Set<string>;
  onToggle: (value: string) => void;
  onSelectAll: (values: string[]) => void;
  onDeselectAll: () => void;
  selectedCount: number;
  currentO: number;
  badgeFilter: 'all' | BadgeType;
  setBadgeFilter: (v: 'all' | BadgeType) => void;
  fcText?: string;
}

function Section2Panel({
  items, selectedIds, onToggle, onSelectAll, onDeselectAll,
  selectedCount, currentO, badgeFilter, setBadgeFilter, fcText,
}: Section2PanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchText, setSearchText] = useState('');

  // 검색 필터 (B/T/BP 필터는 이미 부모에서 적용됨)
  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;
    const q = searchText.trim().toLowerCase();
    return items.filter(it => it.method.toLowerCase().includes(q));
  }, [items, searchText]);

  return (
    <div style={{ padding: '6px 10px' }}>
      {/* 헤더 행 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#374151', padding: 0 }}>
          {collapsed ? '▶' : '▼'}
        </button>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>2순위: 추가 예방관리 추천</span>
        <span style={{
          fontSize: '10px', fontWeight: 600, color: '#fff', background: '#28A745',
          padding: '1px 6px', borderRadius: '4px',
        }}>개선 가능</span>
        {selectedCount > 0 && (
          <span style={{ fontSize: '10px', color: '#28A745', fontWeight: 600 }}>({selectedCount})</span>
        )}

        {/* B/T/BP 필터 탭 */}
        <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
          {(['all', 'B', 'T', 'BP'] as const).map(f => (
            <button key={f} onClick={() => setBadgeFilter(f)}
              style={{
                fontSize: '9px', padding: '1px 5px', borderRadius: '3px', cursor: 'pointer',
                border: badgeFilter === f ? '1px solid #333' : '1px solid #d1d5db',
                background: badgeFilter === f ? '#374151' : '#f3f4f6',
                color: badgeFilter === f ? '#fff' : '#374151',
                fontWeight: badgeFilter === f ? 700 : 400,
              }}>
              {f === 'all' ? '전체' : f}
            </button>
          ))}
        </div>
      </div>
      {!collapsed && (
        <>
          {/* 검색 + 전체/해제 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="2순위 검색..."
              style={{
                flex: 1, padding: '3px 6px', fontSize: '10px', border: '1px solid #d1d5db',
                borderRadius: '4px', outline: 'none', background: '#f9fafb',
              }}
            />
            <button onClick={() => onSelectAll(filteredItems.map(it => it.method))} style={miniBtn}>전체<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(All)</span></button>
            <button onClick={onDeselectAll} style={miniBtn}>해제<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(Clr)</span></button>
          </div>
          {/* 아이템 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
            {filteredItems.map(item => {
              const isSelected = selectedIds.has(item.method);
              const impO = item.recommendedO;
              return (
                <label key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 6px',
                  fontSize: '11px', cursor: 'pointer', borderRadius: '3px',
                  background: isSelected ? '#28A74510' : 'transparent',
                  border: isSelected ? '1px solid #28A74540' : '1px solid transparent',
                }} title={`${item.method} (${item.category})`}>
                  <input type="checkbox" checked={isSelected} onChange={() => onToggle(item.method)}
                    style={{ width: '13px', height: '13px', accentColor: '#28A745' }} />
                  {/* O→O 개선 화살표 */}
                  {currentO > 0 && impO > 0 && (
                    <span style={{ fontSize: '9px', color: '#28A745', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      O:{currentO}→{impO}
                    </span>
                  )}
                  {impO > 0 && currentO === 0 && (
                    <span style={{
                      fontSize: '9px', fontWeight: 700, color: '#fff',
                      background: impO <= 3 ? '#28A745' : impO <= 6 ? '#FF8C00' : '#dc3545',
                      padding: '0 4px', borderRadius: '3px', minWidth: '26px', textAlign: 'center',
                    }}>O:{impO}</span>
                  )}
                  {/* B/T/BP 뱃지 */}
                  <span style={{
                    fontSize: '9px', fontWeight: 700, color: item.badge === 'BP' ? '#000' : '#fff',
                    background: BADGE_COLORS[item.badge],
                    padding: '0 4px', borderRadius: '3px', minWidth: '18px', textAlign: 'center',
                  }}>{item.badge}</span>
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: isSelected ? '#1f2937' : '#4b5563', fontWeight: isSelected ? 600 : 400,
                  }}>{item.method}</span>
                </label>
              );
            })}
            {filteredItems.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '8px', textAlign: 'center', color: '#9ca3af', fontSize: '10px' }}>
                {fcText ? '매칭되는 산업DB 항목 없음' : '고장원인 정보 없음'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// 공용 스타일
// ═══════════════════════════════════════════
const miniBtn: React.CSSProperties = {
  fontSize: '9px', padding: '1px 6px', border: '1px solid #d1d5db',
  borderRadius: '3px', background: '#f3f4f6', cursor: 'pointer',
};

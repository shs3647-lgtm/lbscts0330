/**
 * @file PreventionSectionModal.tsx
 * @description 예방관리(PC) 2섹션 선택 모달 — AIAG-VDA 발생도 평가 기준
 * - 1순위: 예방관리 효과성 (B5 마스터) → O등급 표시
 * - 2순위: 추가 예방관리 추천 (산업DB) → B/T/BP 분류 + O→O 개선 표시
 * - DetectionSectionModal과 통일된 UI/UX
 * @created 2026-02-28
 */
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { downloadStyledExcel } from '@/lib/excel-utils';
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
    initialPosition: { top: 120, right: 20 },
    modalWidth: 1020,
    modalHeight: 380,
    isOpen,
  });

  // ── 상태 ──
  const [masterItems, setMasterItems] = useState<DataItem[]>([]);
  const [krItems, setKrItems] = useState<KrPreventionItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 뷰 모드: 기초정보 | 해당공정 추천 | 전체공정 추천
  const [viewMode, setViewMode] = useState<'master' | 'recommend' | 'allProcess'>('master');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // LLD 추천 아이템
  const [lldPrevItems, setLldPrevItems] = useState<Array<{
    id: string; lldNo: string; improvement: string; processNo: string;
    processName: string; occurrence: number | null; status: string;
    failureMode: string; cause: string; productName: string;
  }>>([]);
  const [lldSelectedIds, setLldSelectedIds] = useState<Set<string>>(new Set());

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
        const [masterRes, krRes, lldRes] = await Promise.all([
          fetch('/api/pfmea/master?includeItems=true'),
          fetch('/api/kr-industry?type=prevention'),
          fetch('/api/lld'),
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
        // LLD 추천 아이템 (예방관리)
        if (lldRes.ok) {
          const lldData = await lldRes.json();
          if (lldData.success && lldData.items) {
            const prevLlds = (lldData.items as Array<Record<string, unknown>>)
              .filter(it => it.applyTo === 'prevention' && it.status !== 'R' && String(it.improvement || '').trim().length > 0)
              .map(it => ({
                id: String(it.id || ''),
                lldNo: String(it.lldNo || ''),
                improvement: String(it.improvement || ''),
                processNo: String(it.processNo || ''),
                processName: String(it.processName || ''),
                occurrence: typeof it.occurrence === 'number' ? it.occurrence : null,
                status: String(it.status || ''),
                failureMode: String(it.failureMode || ''),
                cause: String(it.cause || ''),
                productName: String(it.productName || ''),
              }));
            if (!cancelled) setLldPrevItems(prevLlds);
          }
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

  // LLD 추천 핸들러
  const toggleLld = useCallback((id: string) => {
    setLldSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const selectAllLld = useCallback((ids: string[]) => setLldSelectedIds(new Set(ids)), []);
  const deselectAllLld = useCallback(() => setLldSelectedIds(new Set()), []);

  // LLD 추천 필터 (해당공정 매칭)
  const filteredLldItems = useMemo(() => {
    return lldPrevItems.filter(it => {
      if (!processNo) return true;
      const pn = it.processNo?.trim();
      const pName = it.processName?.trim().toLowerCase();
      const curName = (processName || '').trim().toLowerCase();
      return pn === String(processNo) || (!pn && pName && curName && (pName.includes(curName) || curName.includes(pName))) || !pn;
    });
  }, [lldPrevItems, processNo, processName]);

  // LLD 전체공정 (필터 없음)
  const filteredLldAll = useMemo(() => lldPrevItems, [lldPrevItems]);

  // ── LLD Import ──
  const handleImport = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) { alert('시트가 없습니다.'); return; }
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      if (json.length === 0) { alert('데이터가 없습니다.'); return; }
      const imported = json.map((row, idx) => ({
        lldNo: `PCMAP${new Date().getFullYear().toString().slice(-2)}-${String(idx + 1).padStart(3, '0')}`,
        classification: 'PC_MAP',
        applyTo: 'prevention',
        processNo: String(row['공정번호'] || '').trim(),
        processName: '',
        productName: '',
        failureMode: '',
        cause: String(row['고장원인'] || '').trim(),
        occurrence: row['O값'] ? parseInt(String(row['O값']), 10) || null : null,
        detection: null,
        improvement: String(row['예방관리내용'] || '').trim(),
        vehicle: '', target: '', m4Category: '', location: '', completedDate: '',
        status: 'G', sourceType: 'import', priority: 0,
      }));
      const res = await fetch('/api/lld', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: imported }) });
      const result = await res.json();
      if (result.success) alert(`Import 완료: ${imported.length}건 저장`);
      else alert('Import 저장 실패: ' + (result.error || ''));
    } catch (error) { console.error('[Import] 오류:', error); alert('엑셀 읽기 오류'); }
    e.target.value = '';
  };

  // ── LLD Export ──
  const handleExport = () => {
    const HEADERS = ['공정번호','고장원인','예방관리내용','O값','비고'];
    const COL_WIDTHS = [12,25,35,8,20];
    const rows = lldPrevItems.length > 0 
      ? lldPrevItems.map(it => [it.processNo, it.cause, it.improvement, it.occurrence ?? '', ''])
      : [['', '', '', '', '']];
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadStyledExcel(HEADERS, rows, COL_WIDTHS, 'PC_Import양식', `PC_ImportTemplate_${today}.xlsx`);
  };

  const handleApply = () => {
    const values: string[] = [];
    sec1SelectedIds.forEach(v => values.push(v));
    sec2SelectedIds.forEach(v => values.push(v));
    lldSelectedIds.forEach(id => {
      const item = lldPrevItems.find(it => it.id === id);
      if (item) values.push(item.improvement);
    });
    onSave(values);
  };

  const sec1Count = sec1SelectedIds.size;
  const sec2Count = sec2SelectedIds.size;
  const lldCount = lldSelectedIds.size;
  const totalCount = sec1Count + sec2Count + lldCount;

  if (!isOpen) return null;

  const currentO = sodInfo?.o ?? 0;

  return createPortal(
    <div style={{
      position: 'fixed', top: `${position.top}px`, right: `${position.right}px`,
      width: '1020px', height: '380px', maxHeight: '90vh', zIndex: 99990,
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
          <span style={{ fontSize: '13px', fontWeight: 700 }}>예방관리 집중 매핑 (3-Panel)</span>
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

      {/* ──── 탭 없이 버튼 바만 ──── */}
      <div style={{ padding: '4px 10px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563' }}>※ 3단 편집을 통해 신속하게 매핑하세요.</span>
        <div style={{ flex: 1 }} />
        <button onClick={handleApply} disabled={totalCount === 0}
          style={{ padding: '3px 12px', fontSize: '11px', fontWeight: 600, background: totalCount > 0 ? '#0d47a1' : '#9ca3af', color: '#fff', border: 'none', borderRadius: '4px', cursor: totalCount > 0 ? 'pointer' : 'default' }}>
          일괄 적용<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(OK)</span>
        </button>
        <button onClick={() => onDelete?.()}
          style={{ padding: '3px 8px', fontSize: '11px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          삭제<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(Del)</span>
        </button>
        <button onClick={handleImport}
          style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600, background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          ↑양식 Import
        </button>
        <button onClick={handleExport}
          style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600, background: '#f97316', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          ↓양식 Export
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {/* ──── 3 Flex 열 구조 ──── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: 0 }}>
        {/* 0순위: 내 매핑 (Import) */}
        <div style={{ flex: 1, borderRight: '1px solid #d1d5db', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <LldRecommendPanel
            items={filteredLldItems} // 우선 해당공정만 보여주되 패널 내부에서 전체 검색 가능
            selectedIds={lldSelectedIds}
            onToggle={toggleLld}
            onSelectAll={selectAllLld}
            onDeselectAll={deselectAllLld}
            processName={processName}
            type="prevention"
            isAllProcess={false}
          />
        </div>

        {/* 1순위: 표준기반 */}
        <div style={{ flex: 1, borderRight: '1px solid #d1d5db', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <Section1Panel
            items={masterItems}
            selectedIds={sec1SelectedIds}
            onToggle={toggleSec1}
            onSelectAll={selectAllSec1}
            onDeselectAll={deselectAllSec1}
            selectedCount={sec1Count}
            fcText={fcText}
          />
        </div>

        {/* 2순위: 산업DB */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
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
        </div>
      </div>

      {/* ──── 푸터 ──── */}
      <div style={{
        padding: '6px 12px', borderTop: '1px solid #e5e7eb', background: '#f9fafb',
        borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'center', gap: '12px',
        fontSize: '11px', color: '#374151',
      }}>
        {viewMode === 'master' ? (
          <>
            {sec1Count > 0 && <span style={{ color: '#0d47a1', fontWeight: 600 }}>1순위:{sec1Count}개</span>}
            {sec2Count > 0 && <span style={{ color: '#28A745', fontWeight: 600 }}>2순위:{sec2Count}개</span>}
          </>
        ) : (
          lldCount > 0 && <span style={{ color: '#7c3aed', fontWeight: 600 }}>추천:{lldCount}개</span>
        )}
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
    <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 헤더 행 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#374151', padding: 0 }}>
          {collapsed ? '▶' : '▼'}
        </button>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>1순위: 표준기반(발생도기준)</span>
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
            <button onClick={() => onSelectAll(filteredItems.map(it => it.value))} style={{ fontSize: '9px', padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: '3px', background: '#f3f4f6', cursor: 'pointer' }}>전체<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(All)</span></button>
            <button onClick={onDeselectAll} style={{ fontSize: '9px', padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: '3px', background: '#f3f4f6', cursor: 'pointer' }}>해제<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(Clr)</span></button>
          </div>
          {/* 아이템 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '4px', flex: 1, minHeight: 0, overflowY: 'auto', alignContent: 'start' }}>
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
    <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            <button onClick={() => onSelectAll(filteredItems.map(it => it.method))} style={{ fontSize: '9px', padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: '3px', background: '#f3f4f6', cursor: 'pointer' }}>전체<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(All)</span></button>
            <button onClick={onDeselectAll} style={{ fontSize: '9px', padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: '3px', background: '#f3f4f6', cursor: 'pointer' }}>해제<span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '2px' }}>(Clr)</span></button>
          </div>
          {/* 아이템 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '4px', flex: 1, minHeight: 0, overflowY: 'auto', alignContent: 'start' }}>
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
// LLD 추천 패널
// ═══════════════════════════════════════════
interface LldItem {
  id: string; lldNo: string; improvement: string; processNo: string;
  processName: string; occurrence: number | null; status: string;
  failureMode: string; cause: string; productName: string;
}

interface LldRecommendPanelProps {
  items: LldItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: () => void;
  processName?: string;
  type: 'prevention' | 'detection';
  isAllProcess?: boolean;
}

function LldRecommendPanel({ items, selectedIds, onToggle, onSelectAll, onDeselectAll, processName, type, isAllProcess }: LldRecommendPanelProps) {
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    if (!searchText.trim()) return items;
    const q = searchText.trim().toLowerCase();
    return items.filter(it =>
      it.improvement.toLowerCase().includes(q) ||
      it.lldNo.toLowerCase().includes(q) ||
      it.processName.toLowerCase().includes(q)
    );
  }, [items, searchText]);

  const accentColor = type === 'prevention' ? '#7c3aed' : '#0891b2';
  const ratingKey = type === 'prevention' ? 'O' : 'D';

  return (
    <div style={{ padding: '6px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', padding: '1px 6px', background: '#f3f4f6', borderRadius: '4px' }}>
          내 매핑 (Import 정보)
        </span>
        {!isAllProcess && processName && (
          <span style={{ fontSize: '10px', background: `${accentColor}20`, color: accentColor, padding: '1px 6px', borderRadius: '4px' }}>
            {processName}
          </span>
        )}
        <span style={{ fontSize: '9px', color: '#6b7280' }}>({filtered.length}건)</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        <input
          type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)}
          placeholder="추천 검색..."
          style={{ flex: 1, padding: '3px 6px', fontSize: '10px', border: '1px solid #d1d5db', borderRadius: '4px', outline: 'none', background: '#f9fafb' }}
        />
        <button onClick={() => onSelectAll(filtered.map(it => it.id))}
          style={{ fontSize: '9px', padding: '1px 6px', border: '1px solid #d1d5db', borderRadius: '3px', background: '#f3f4f6', cursor: 'pointer' }}>
          전체
        </button>
        <button onClick={onDeselectAll}
          style={{ fontSize: '9px', padding: '1px 6px', border: '1px solid #d1d5db', borderRadius: '3px', background: '#f3f4f6', cursor: 'pointer' }}>
          해제
        </button>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '11px' }}>
            매칭되는 LLD 추천이 없습니다.
          </div>
        ) : (
          filtered.map(item => {
            const isSelected = selectedIds.has(item.id);
            const ratingVal = item.occurrence;
            return (
              <label key={item.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '4px 6px',
                fontSize: '11px', cursor: 'pointer', borderRadius: '4px',
                background: isSelected ? `${accentColor}10` : 'transparent',
                border: isSelected ? `1px solid ${accentColor}40` : '1px solid transparent',
                marginBottom: '2px',
              }}>
                <input type="checkbox" checked={isSelected} onChange={() => onToggle(item.id)}
                  style={{ width: '13px', height: '13px', accentColor, marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '9px', fontWeight: 700, color: '#fff', background: accentColor,
                      padding: '0 4px', borderRadius: '3px',
                    }}>{item.lldNo}</span>
                    {ratingVal != null && ratingVal > 0 && (
                      <span style={{
                        fontSize: '9px', fontWeight: 700, color: '#fff',
                        background: ratingVal <= 3 ? '#28A745' : ratingVal <= 6 ? '#FF8C00' : '#dc3545',
                        padding: '0 4px', borderRadius: '3px',
                      }}>{ratingKey}:{ratingVal}</span>
                    )}
                    {item.processName && (
                      <span style={{ fontSize: '9px', color: '#6b7280' }}>{item.processName}</span>
                    )}
                    {isAllProcess && item.productName && (
                      <span style={{ fontSize: '9px', color: '#9ca3af' }}>({item.productName})</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '10px', color: isSelected ? '#1f2937' : '#4b5563',
                    fontWeight: isSelected ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                  }}>{item.improvement}</div>
                </div>
              </label>
            );
          })
        )}
      </div>
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

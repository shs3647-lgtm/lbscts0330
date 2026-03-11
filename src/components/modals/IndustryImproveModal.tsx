/**
 * @file IndustryImproveModal.tsx
 * @description 산업DB 기반 개선안 선택 모달
 *
 * 6단계 최적화에서 예방관리개선/검출관리개선 셀 클릭 시 열림.
 * 산업DB(kr-industry) 방법 목록을 보여주고, 예상 O/D 값 및 AP 변화를 미리보기.
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDraggableModal } from './useDraggableModal';
import HelpIcon from '@/components/common/HelpIcon';
import { correctOccurrence } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/hooks/pcOccurrenceMap';
import { recommendDetection } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/hooks/detectionRatingMap';
import { calcAP } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/riskOptUtils';

// ─── 타입 ───

interface IndustryImproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedValues: string[]) => void;
  onDelete?: () => void;
  mode: 'prevention' | 'detection';
  fcText?: string;
  fmText?: string;
  processNo?: string;
  processName?: string;
  pcText?: string;            // 현재 예방관리(PC) 텍스트
  dcText?: string;            // 현재 검출관리(DC) 텍스트
  currentValues: string[];
  sodInfo?: { s: number; o: number; d: number; ap?: string };
}

interface EnrichedPrevention {
  id: string;
  category: string;
  fcKeyword: string;
  method: string;
  m4Category: string;
  description: string;
  estimatedO: number | null;
  matchedLevel: string;
}

interface EnrichedDetection {
  id: string;
  category: string;
  fmKeyword: string;
  method: string;
  methodType: string;
  description: string;
  estimatedD: number;
}

// ─── 카테고리 한글 레이블 ───

const CATEGORY_LABELS: Record<string, string> = {
  jig: '지그/치구', mold: '금형/다이', 'torque-tool': '체결공구/토크',
  dispenser: '도포기/디스펜서', pressure: '압력/유압/공압', sensor: '센서/검사기',
  motor: '구동부/모터', welding: '용접/스팟', temperature: '온도/가열',
  conveyor: '이송/로봇', operator: '작업자/숙련도', contamination: '오염/이물',
  storage: '보관/환경', fifo: '선입선출/LOT', wear: '마모/수명',
  parameter: '파라미터/설정값', fastening: '체결/토크',
  identification: '사양/품명/규격', luminance: '휘도/점등/영상',
  dimension: '치수/형상', pin: '핀휨/단자', function: '동작/기능',
  dispense: '도포/접착', assembly: '조립/체결', appearance: '외관/파손',
  uniformity: '균일도/색상', packaging: '포장/수량', environment: '환경/산화',
  msa: 'MSA/검교정', leak: '누설/기밀', electrical: '전기/통전',
  equipment: '설비/파라미터', hardness: '경도/물성',
  'hud-display': 'HUD 디스플레이', 'pcb-smt': 'PCB/SMT',
  'injection-press': '사출/프레스', coating: '도장/코팅', 'heat-treatment': '열처리',
};

// ─── AP 색상 ───

const AP_COLORS: Record<string, { bg: string; text: string }> = {
  H: { bg: '#ef5350', text: '#fff' },
  M: { bg: '#ffc107', text: '#000' },
  L: { bg: '#4caf50', text: '#fff' },
};

// ─── 컴포넌트 ───

export default function IndustryImproveModal({
  isOpen, onClose, onSave, onDelete,
  mode, fcText, fmText, processNo, processName,
  pcText, dcText,
  currentValues, sodInfo,
}: IndustryImproveModalProps) {
  // 드래그 지원
  const { position, handleMouseDown } = useDraggableModal({
    initialPosition: { top: 80, right: Math.max(50, (typeof window !== 'undefined' ? window.innerWidth / 2 - 350 : 200)) },
    modalWidth: 700, modalHeight: 550, isOpen,
  });

  // 탭/필터/선택 상태
  const [activeTab, setActiveTab] = useState<'prevention' | 'detection'>(mode);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // 데이터
  const [preventionItems, setPreventionItems] = useState<EnrichedPrevention[]>([]);
  const [detectionItems, setDetectionItems] = useState<EnrichedDetection[]>([]);
  const [loading, setLoading] = useState(false);

  // 탭 변경 시 필터/선택 리셋
  useEffect(() => {
    setCategoryFilter('all');
    setSearchText('');
    setSelectedMethod(null);
  }, [activeTab]);

  // 모달 열릴 때 초기 탭 설정
  useEffect(() => {
    if (isOpen) setActiveTab(mode);
  }, [isOpen, mode]);

  // 산업DB 데이터 로딩
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/kr-industry?type=all')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Prevention: O값 계산
          const pItems: EnrichedPrevention[] = (data.prevention || []).map((item: Record<string, string>) => {
            const oResult = correctOccurrence(item.method || '');
            return {
              id: item.id, category: item.category || '', fcKeyword: item.fcKeyword || '',
              method: item.method || '', m4Category: item.m4Category || '',
              description: item.description || '',
              estimatedO: oResult.correctedO, matchedLevel: oResult.matchedLevel,
            };
          });
          // Detection: D값 계산
          const dItems: EnrichedDetection[] = (data.detection || []).map((item: Record<string, string>) => {
            const dVal = recommendDetection(item.method || '');
            return {
              id: item.id, category: item.category || '', fmKeyword: item.fmKeyword || '',
              method: item.method || '', methodType: item.methodType || '',
              description: item.description || '', estimatedD: dVal,
            };
          });
          setPreventionItems(pItems);
          setDetectionItems(dItems);
        }
      })
      .catch(err => console.error('[IndustryImproveModal] fetch error:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // 카테고리 목록
  const categories = useMemo(() => {
    const items = activeTab === 'prevention' ? preventionItems : detectionItems;
    const cats = [...new Set(items.map(it => it.category).filter(Boolean))];
    return cats.sort();
  }, [activeTab, preventionItems, detectionItems]);

  // 키워드 매칭 점수 (FC/FM 텍스트와 item의 keyword 유사도)
  const getMatchScore = useCallback((item: EnrichedPrevention | EnrichedDetection): number => {
    const kwField = activeTab === 'prevention'
      ? (item as EnrichedPrevention).fcKeyword
      : (item as EnrichedDetection).fmKeyword;
    const targetText = activeTab === 'prevention' ? (fcText || '') : (fmText || '');
    if (!kwField || !targetText) return 0;
    const keywords = kwField.toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
    const target = targetText.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (target.includes(kw)) score += 2;
    }
    return score;
  }, [activeTab, fcText, fmText]);

  // 필터링 + 정렬
  const filteredItems = useMemo(() => {
    let items: (EnrichedPrevention | EnrichedDetection)[] =
      activeTab === 'prevention' ? [...preventionItems] : [...detectionItems];

    // 카테고리 필터
    if (categoryFilter !== 'all') {
      items = items.filter(it => it.category === categoryFilter);
    }
    // 검색
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      items = items.filter(it =>
        it.method.toLowerCase().includes(q) ||
        (it.description || '').toLowerCase().includes(q) ||
        (CATEGORY_LABELS[it.category] || it.category).toLowerCase().includes(q)
      );
    }
    // 매칭 점수순 정렬 (높은 것 먼저), 같으면 예상 O/D 낮은 순
    items.sort((a, b) => {
      const scoreA = getMatchScore(a);
      const scoreB = getMatchScore(b);
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (activeTab === 'prevention') {
        const oA = (a as EnrichedPrevention).estimatedO ?? 99;
        const oB = (b as EnrichedPrevention).estimatedO ?? 99;
        return oA - oB;
      }
      return (a as EnrichedDetection).estimatedD - (b as EnrichedDetection).estimatedD;
    });
    return items;
  }, [activeTab, preventionItems, detectionItems, categoryFilter, searchText, getMatchScore]);

  // AP 미리보기 계산
  const apPreview = useMemo(() => {
    if (!selectedMethod || !sodInfo) return null;
    const { s, o, d } = sodInfo;
    const currentAP = calcAP(s, o, d);

    if (activeTab === 'prevention') {
      const found = preventionItems.find(it => it.method === selectedMethod);
      if (!found || found.estimatedO == null || found.estimatedO <= 0) return { currentAP, newAP: currentAP, newO: o, newD: d, changed: false };
      const effectiveO = Math.min(o, found.estimatedO);
      const newAP = calcAP(s, effectiveO, d);
      return { currentAP, newAP, newO: effectiveO, newD: d, changed: newAP !== currentAP };
    } else {
      const found = detectionItems.find(it => it.method === selectedMethod);
      if (!found || found.estimatedD <= 0) return { currentAP, newAP: currentAP, newO: o, newD: d, changed: false };
      const effectiveD = Math.min(d, found.estimatedD);
      const newAP = calcAP(s, o, effectiveD);
      return { currentAP, newAP, newO: o, newD: effectiveD, changed: newAP !== currentAP };
    }
  }, [selectedMethod, sodInfo, activeTab, preventionItems, detectionItems]);

  // 적용 핸들러
  const handleApply = useCallback(() => {
    if (!selectedMethod) return;
    onSave([selectedMethod]);
    onClose();
  }, [selectedMethod, onSave, onClose]);

  // 삭제 핸들러
  const handleDeleteClick = useCallback(() => {
    onDelete?.();
    onClose();
  }, [onDelete, onClose]);

  if (!isOpen) return null;

  const tabBtnStyle = (active: boolean, tabMode: 'prevention' | 'detection') => ({
    padding: '4px 16px', fontSize: '11px', fontWeight: active ? 700 : 400,
    background: active ? '#fff' : 'rgba(255,255,255,0.15)',
    color: active ? '#1565c0' : 'rgba(255,255,255,0.9)',
    border: active ? '1px solid #90caf9' : '1px solid transparent',
    borderBottom: active ? '2px solid #1976d2' : 'none',
    borderRadius: '4px 4px 0 0', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4,
  });

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      }}
    >
      {/* 배경 오버레이 */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* 모달 본체 */}
      <div
        style={{
          position: 'absolute', top: position.top, right: position.right,
          width: 700, maxHeight: '80vh',
          background: '#fff', borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* 헤더 (드래그 가능) */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            background: 'linear-gradient(135deg, #1565c0, #1976d2)',
            color: '#fff', padding: '8px 14px',
            cursor: 'grab', userSelect: 'none',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }} title="Industry Improvement Database">
              업계 개선사례(Industry Improvement)
            </span>
            <HelpIcon compact iconSize={14} title="업계 개선사례 도움말" popoverWidth={420}>
              <div style={{ lineHeight: 1.8 }}>
                <b>업계 개선사례란?</b>
                <p>한국 자동차 산업의 <b>예방관리/검출관리 방법 DB</b>에서 현재 고장원인(FC)에 적합한 개선안을 검색하고 선택하는 기능입니다.</p>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>사용 방법</b>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
                  <tbody>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, width: 80 }}>탭 전환</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>예방관리 / 검출관리 탭으로 전환하여 각각의 방법 목록을 확인</td></tr>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>카테고리</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>드롭다운으로 카테고리별 필터링 (지그/치구, 센서/검사기 등)</td></tr>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>검색</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>방법명/설명 키워드 검색으로 빠르게 찾기</td></tr>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>선택</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>라디오 버튼으로 방법 선택 → <b>적용(Apply)</b> 클릭</td></tr>
                  </tbody>
                </table>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>테이블 컬럼 설명</b>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
                  <tbody>
                    <tr><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, width: 70 }}>예상O/D</td><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>이 방법 적용 시 예상되는 O 또는 D 점수</td></tr>
                    <tr><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>AP변화</td><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>적용 후 AP 등급 변화 미리보기 (예: M→L)</td></tr>
                    <tr><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>★ 표시</td><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>FC/FM 키워드와 매칭되는 항목 (우선 추천)</td></tr>
                  </tbody>
                </table>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>상단 컨텍스트 정보</b>
                <p>S/O/D/AP = 현재 위험도, PC = 현재 예방관리, DC = 현재 검출관리 (5단계 기입값)</p>
              </div>
            </HelpIcon>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {currentValues.length > 0 && onDelete && (
              <button
                onClick={handleDeleteClick}
                style={{
                  padding: '3px 10px', fontSize: 10, fontWeight: 600,
                  background: 'rgba(255,255,255,0.15)', color: '#ffcdd2', border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 4, cursor: 'pointer',
                }}
              >
                삭제(Del)
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '3px 10px', fontSize: 10, fontWeight: 600,
                background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 4, cursor: 'pointer',
              }}
            >
              취소(Cancel)
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedMethod}
              style={{
                padding: '3px 12px', fontSize: 10, fontWeight: 700,
                background: selectedMethod ? '#4caf50' : 'rgba(255,255,255,0.2)',
                color: '#fff', border: 'none', borderRadius: 4,
                cursor: selectedMethod ? 'pointer' : 'default',
                opacity: selectedMethod ? 1 : 0.5,
              }}
            >
              적용(Apply)
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', fontWeight: 700, marginLeft: 2 }}>✕</button>
          </div>
        </div>

        {/* 컨텍스트 정보 — 1줄 컴팩트 */}
        <div style={{ background: '#e8eaf6', padding: '3px 14px', borderBottom: '1px solid #c5cae9', fontSize: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', overflow: 'hidden' }}>
          {sodInfo && (
            <>
              <span style={{ padding: '0 4px', borderRadius: 3, background: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: 10 }}>S={sodInfo.s}</span>
              <span style={{ padding: '0 4px', borderRadius: 3, background: '#fff3e0', color: '#e65100', fontWeight: 700, fontSize: 10 }}>O={sodInfo.o}</span>
              <span style={{ padding: '0 4px', borderRadius: 3, background: '#e8f5e9', color: '#2e7d32', fontWeight: 700, fontSize: 10 }}>D={sodInfo.d}</span>
              {sodInfo.ap && (
                <span style={{ padding: '0 4px', borderRadius: 3, background: AP_COLORS[sodInfo.ap]?.bg || '#999', color: AP_COLORS[sodInfo.ap]?.text || '#fff', fontWeight: 700, fontSize: 10 }}>
                  AP={sodInfo.ap}
                </span>
              )}
            </>
          )}
          <span style={{ width: 1, height: 12, background: '#ccc' }} />
          {processNo && <span style={{ color: '#666', whiteSpace: 'nowrap' }}>공정:{processNo}</span>}
          {fmText && <span style={{ color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }} title={fmText}>FM:{fmText}</span>}
          {fcText && <span style={{ color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }} title={fcText}>FC:{fcText}</span>}
          {(pcText || dcText) && <span style={{ width: 1, height: 12, background: '#ccc' }} />}
          {pcText && <span style={{ color: '#2e7d32', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }} title={pcText}>PC:{pcText}</span>}
          {dcText && <span style={{ color: '#1565c0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }} title={dcText}>DC:{dcText}</span>}
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 2, padding: '4px 14px 0', background: '#1565c0' }}>
          <button onClick={() => setActiveTab('prevention')} style={tabBtnStyle(activeTab === 'prevention', 'prevention')}>
            <span style={{ fontSize: 12 }}>🛡</span> 예방관리(Prevention) <span style={{ fontSize: 9, opacity: 0.7 }}>({preventionItems.length})</span>
          </button>
          <button onClick={() => setActiveTab('detection')} style={tabBtnStyle(activeTab === 'detection', 'detection')}>
            <span style={{ fontSize: 12 }}>🔍</span> 검출관리(Detection) <span style={{ fontSize: 9, opacity: 0.7 }}>({detectionItems.length})</span>
          </button>
        </div>

        {/* 필터 바 */}
        <div style={{ display: 'flex', gap: 6, padding: '5px 14px', borderBottom: '1px solid #e0e0e0', alignItems: 'center', background: '#fafafa' }}>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ fontSize: 11, padding: '3px 6px', border: '1px solid #ccc', borderRadius: 3 }}
          >
            <option value="all">전체 카테고리</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
            ))}
          </select>
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="방법 검색..."
            style={{ flex: 1, fontSize: 11, padding: '3px 8px', border: '1px solid #ccc', borderRadius: 3 }}
          />
          <span style={{ fontSize: 10, color: '#999' }}>{filteredItems.length}건</span>
        </div>

        {/* AP 미리보기 바 */}
        {apPreview && selectedMethod && (
          <div style={{
            padding: '4px 14px', borderBottom: '1px solid #e0e0e0',
            background: apPreview.changed ? '#e8f5e9' : '#fff8e1',
            fontSize: 11, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontWeight: 700, color: '#333' }}>적용 시:</span>
            <span>S={sodInfo?.s}</span>
            {activeTab === 'prevention' ? (
              <span style={{ fontWeight: 700, color: '#e65100' }}>
                O={sodInfo?.o}{apPreview.newO !== sodInfo?.o && <>&rarr;{apPreview.newO}</>}
              </span>
            ) : (
              <span style={{ fontWeight: 700, color: '#2e7d32' }}>
                D={sodInfo?.d}{apPreview.newD !== sodInfo?.d && <>&rarr;{apPreview.newD}</>}
              </span>
            )}
            {activeTab === 'prevention' ? <span>D={sodInfo?.d}</span> : <span>O={sodInfo?.o}</span>}
            <span style={{ fontWeight: 700 }}>AP:</span>
            {apPreview.currentAP && (
              <span style={{ padding: '1px 6px', borderRadius: 3, background: AP_COLORS[apPreview.currentAP]?.bg, color: AP_COLORS[apPreview.currentAP]?.text, fontWeight: 700 }}>
                {apPreview.currentAP}
              </span>
            )}
            {apPreview.changed && apPreview.newAP && (
              <>
                <span>&rarr;</span>
                <span style={{ padding: '1px 6px', borderRadius: 3, background: AP_COLORS[apPreview.newAP]?.bg, color: AP_COLORS[apPreview.newAP]?.text, fontWeight: 700 }}>
                  {apPreview.newAP}
                </span>
                {(apPreview.currentAP === 'H' && apPreview.newAP === 'L') && <span style={{ color: '#2e7d32', fontWeight: 700 }}>++ 대폭 개선</span>}
              </>
            )}
            {!apPreview.changed && <span style={{ color: '#999' }}>(변화 없음)</span>}
          </div>
        )}

        {/* 테이블 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>데이터 로딩 중...</div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              {preventionItems.length === 0 && detectionItems.length === 0
                ? '산업DB 데이터 없음 — /api/admin/seed/kr-industry POST로 시딩 필요'
                : '검색 결과 없음'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f5f5f5', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ width: 30, padding: '4px 2px', borderBottom: '1px solid #ddd' }}></th>
                  <th style={{ padding: '4px 6px', borderBottom: '1px solid #ddd', textAlign: 'left' }} title="Method"><div style={{ lineHeight: 1.2 }}><div style={{ fontSize: 11 }}>방법</div><div style={{ fontSize: 8, fontWeight: 400, opacity: 0.6 }}>(Method)</div></div></th>
                  <th style={{ width: 90, padding: '4px 4px', borderBottom: '1px solid #ddd', textAlign: 'center' }} title="Category"><div style={{ lineHeight: 1.2 }}><div style={{ fontSize: 11 }}>카테고리</div><div style={{ fontSize: 8, fontWeight: 400, opacity: 0.6 }}>(Cat.)</div></div></th>
                  <th style={{ width: 55, padding: '4px 4px', borderBottom: '1px solid #ddd', textAlign: 'center' }} title={activeTab === 'prevention' ? 'Estimated Occurrence' : 'Estimated Detection'}>
                    <div style={{ lineHeight: 1.2 }}><div style={{ fontSize: 11 }}>{activeTab === 'prevention' ? '예상O' : '예상D'}</div><div style={{ fontSize: 8, fontWeight: 400, opacity: 0.6 }}>(Est.)</div></div>
                  </th>
                  <th style={{ width: 65, padding: '4px 4px', borderBottom: '1px solid #ddd', textAlign: 'center' }} title="AP Change"><div style={{ lineHeight: 1.2 }}><div style={{ fontSize: 11 }}>AP변화</div><div style={{ fontSize: 8, fontWeight: 400, opacity: 0.6 }}>(Chg.)</div></div></th>
                  <th style={{ padding: '4px 6px', borderBottom: '1px solid #ddd', textAlign: 'left' }} title="Description"><div style={{ lineHeight: 1.2 }}><div style={{ fontSize: 11 }}>설명</div><div style={{ fontSize: 8, fontWeight: 400, opacity: 0.6 }}>(Desc.)</div></div></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isSelected = selectedMethod === item.method;
                  const matchScore = getMatchScore(item);

                  // AP 변화 계산
                  let itemAP: string | null = null;
                  if (sodInfo) {
                    const { s, o, d } = sodInfo;
                    if (activeTab === 'prevention') {
                      const eO = (item as EnrichedPrevention).estimatedO;
                      if (eO != null && eO > 0) itemAP = calcAP(s, Math.min(o, eO), d);
                    } else {
                      const eD = (item as EnrichedDetection).estimatedD;
                      if (eD > 0) itemAP = calcAP(s, o, Math.min(d, eD));
                    }
                  }
                  const currentAP = sodInfo ? calcAP(sodInfo.s, sodInfo.o, sodInfo.d) : null;
                  const apChanged = itemAP !== null && currentAP !== null && itemAP !== currentAP;

                  const estimatedVal = activeTab === 'prevention'
                    ? (item as EnrichedPrevention).estimatedO
                    : (item as EnrichedDetection).estimatedD;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedMethod(item.method)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? '#e3f2fd' : matchScore > 0 ? '#fffde7' : 'transparent',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <td style={{ textAlign: 'center', padding: '4px 2px' }}>
                        <input type="radio" checked={isSelected} readOnly style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '4px 6px', fontWeight: isSelected ? 700 : 400 }}>
                        {matchScore > 0 && <span style={{ color: '#ff8f00', marginRight: 3, fontSize: 10 }} title="FC/FM 키워드 매칭">★</span>}
                        {item.method}
                      </td>
                      <td style={{ textAlign: 'center', padding: '4px 4px' }}>
                        <span style={{
                          fontSize: 9, padding: '1px 4px', borderRadius: 3,
                          background: '#e0e0e0', color: '#555',
                        }}>
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '4px 4px', fontWeight: 700 }}>
                        {estimatedVal != null && estimatedVal > 0 ? (
                          <span style={{
                            color: (estimatedVal <= 3) ? '#2e7d32' : (estimatedVal <= 5) ? '#e65100' : '#c62828',
                          }}>
                            {activeTab === 'prevention' ? 'O' : 'D'}={estimatedVal}
                          </span>
                        ) : (
                          <span style={{ color: '#bbb' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '4px 4px' }}>
                        {apChanged && itemAP && currentAP ? (
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            padding: '1px 4px', borderRadius: 3,
                            background: AP_COLORS[itemAP]?.bg, color: AP_COLORS[itemAP]?.text,
                          }}>
                            {currentAP}&rarr;{itemAP}
                          </span>
                        ) : itemAP && currentAP ? (
                          <span style={{ fontSize: 10, color: '#999' }}>{currentAP}</span>
                        ) : (
                          <span style={{ color: '#bbb' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '4px 6px', color: '#666', fontSize: 10, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>
                        {item.description || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

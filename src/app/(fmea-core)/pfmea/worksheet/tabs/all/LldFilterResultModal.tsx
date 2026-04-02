/**
 * @file LldFilterResultModal.tsx
 * @description LLD(필터코드) 추천 결과 — 전체화면 작업 뷰
 * LLD 페이지(lld/page.tsx)와 동일한 메뉴바/테이블 패턴 사용
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getFmeaLabels } from '@/lib/fmea-labels';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { downloadStyledExcel } from '@/lib/excel-utils';
import type { LldFilterModalState } from './hooks/useAutoLldFilter';

interface Props {
  modal: LldFilterModalState;
  onClose: () => void;
  onApply: () => void;
  onSelectMatchedAndApply: () => void;
  onDelete: () => void;
  onToggleCheck: (uniqueKey: string) => void;
  onToggleAll: (checked: boolean) => void;
}

// 등급 색상 — LLD 페이지 CLASSIFICATION_COLORS와 동일 패턴
const TIER_META: Record<number, { label: string; color: string }> = {
  1: { label: '정확', color: '#22c55e' },
  2: { label: '공정', color: '#3b82f6' },
  3: { label: '수평', color: '#a855f7' },
  0: { label: 'Miss', color: '#94a3b8' },
};

type TierFilter = 'all' | 1 | 2 | 3 | 0;
type TargetFilter = 'all' | 'prevention' | 'detection';
type ApFilter = 'all' | 'H' | 'M' | 'L';
const AP_COLORS: Record<string, string> = { H: '#ef5350', M: '#ffc107', L: '#4caf50' };
const AP_TEXT: Record<string, string> = { H: '#fff', M: '#000', L: '#fff' };

// 구분(Classification) 배지 색상
const CLS_META: Record<string, { color: string; bg: string }> = {
  CIP: { color: '#fff', bg: '#2563eb' },
  RMA: { color: '#fff', bg: '#dc2626' },
  ABN: { color: '#fff', bg: '#ea580c' },
  ECN: { color: '#fff', bg: '#7c3aed' },
  FieldIssue: { color: '#fff', bg: '#0891b2' },
  DevIssue: { color: '#fff', bg: '#4f46e5' },
};

const MODAL_W = 960;
const MODAL_H_MAX = 620;

// SOD 점수 색상 (녹≤2, 노3~4, 주5~6, 빨7~)
const sodStyle = (v: number | null | undefined): string => {
  if (v == null) return '';
  if (v <= 2) return 'bg-[#C6EFCE] text-[#006100]';
  if (v <= 4) return 'bg-[#FFEB9C] text-[#9C6500]';
  if (v <= 6) return 'bg-[#FCD5B4] text-[#974706]';
  return 'bg-[#FFC7CE] text-[#9C0006] font-bold';
};

// 지브라 행 색상
const zebraRow = (idx: number) => idx % 2 === 0 ? 'bg-white' : 'bg-[#F0F0F0]';
// 셀 공통 — 굵은 구분선
const cellBase = 'px-1 py-[3px] border-b border-r border-slate-300 text-[10px] align-middle';

export default function LldFilterResultModal({ modal, onClose, onApply, onSelectMatchedAndApply, onDelete, onToggleCheck, onToggleAll }: Props) {
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  const lb = getFmeaLabels(isDfmea);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('all');
  const [apFilter, setApFilter] = useState<ApFilter>('all');
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 모달 열릴 때 화면 중앙 배치
  useEffect(() => {
    if (modal.isOpen) {
      setPos({ x: Math.round((window.innerWidth - MODAL_W) / 2), y: 120 });
      setTierFilter('all');
      setTargetFilter('all');
      setApFilter('all');
    }
  }, [modal.isOpen]);

  // 드래그
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({ x: dragRef.current.ox + ev.clientX - dragRef.current.startX, y: dragRef.current.oy + ev.clientY - dragRef.current.startY });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  if (!modal.isOpen) return null;

  const candidates = modal.candidates;

  // 카운트
  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 0: 0 };
  const targetCounts = { prevention: 0, detection: 0 };
  for (const c of candidates) {
    tierCounts[c.matchTier]++;
    targetCounts[c.applyTarget]++;
  }
  const matchedTotal = tierCounts[1] + tierCounts[2] + tierCounts[3];

  // AP 카운트
  const apCounts: Record<string, number> = { H: 0, M: 0, L: 0 };
  for (const c of candidates) {
    if (c.ap) apCounts[c.ap]++;
  }

  // 필터
  const filtered = candidates.filter(c => {
    if (tierFilter !== 'all' && c.matchTier !== tierFilter) return false;
    if (targetFilter !== 'all' && c.applyTarget !== targetFilter) return false;
    if (apFilter !== 'all' && c.ap !== apFilter) return false;
    return true;
  });

  const checkedCount = candidates.filter(c => c.checked).length;
  const filteredChecked = filtered.filter(c => c.checked).length;
  const allFilteredChecked = filtered.length > 0 && filteredChecked === filtered.length;

  const handleFilteredToggleAll = (checked: boolean) => {
    for (const c of filtered) {
      if (c.checked !== checked && (checked ? c.matchedLld : true)) {
        onToggleCheck(c.uniqueKey);
      }
    }
  };

  const handleSelectMatched = () => {
    for (const c of candidates) {
      const shouldCheck = c.matchedLld !== null;
      if (c.checked !== shouldCheck) onToggleCheck(c.uniqueKey);
    }
  };

  const handleDeselectAll = () => {
    for (const c of candidates) {
      if (c.checked) onToggleCheck(c.uniqueKey);
    }
  };

  // ── LLD 엑셀 Import ──
  const handleImport = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) { alert('시트가 없습니다.'); return; }
      const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
      if (rawRows.length === 0) { alert('데이터가 없습니다.'); return; }

      let headerIdx = -1;
      for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
        if (rawRows[i] && typeof rawRows[i][0] === 'string' && rawRows[i][0].includes('LLD')) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) { alert('헤더(LLD No.)를 찾을 수 없습니다.'); return; }

      const headers = rawRows[headerIdx];
      let dataStartIdx = headerIdx + 1;
      if (rawRows[headerIdx + 1] && typeof rawRows[headerIdx + 1][0] === 'string' && rawRows[headerIdx + 1][0].includes('LLD')) {
        dataStartIdx = headerIdx + 2;
      }

      const imported: any[] = [];
      for (let i = dataStartIdx; i < rawRows.length; i++) {
        const rowArr = rawRows[i];
        if (!rowArr || rowArr.length === 0 || !rowArr[0]) continue;

        const row = headers.reduce((acc: any, h: string, idx: number) => {
          if (h) acc[h.trim()] = rowArr[idx];
          return acc;
        }, {});

        const rawGubun = String(row['구분'] || row['Category'] || '');
        const classification = rawGubun.includes('ABN') ? 'ABN' : rawGubun.includes('RMA') ? 'RMA' : rawGubun.includes('CIP') ? 'CIP' : 'CIP';
        
        let rawStatus = String(row['상태'] || row['Status'] || '').trim();
        let statusObj = 'R';
        if (rawStatus.includes('완료') || rawStatus === 'G') statusObj = 'G';
        else if (rawStatus.includes('예정') || rawStatus === 'Y' || classification === 'CIP') statusObj = 'Y';
        
        const lldNo = String(row['LLD No.'] || row['LLD_No'] || row['LLD No'] || row['lldNo'] || '').trim()
          || `LLD${new Date().getFullYear().toString().slice(-2)}-${String(i).padStart(3, '0')}`;
        const processName = String(row['공정명'] || row['Process'] || '').trim();
        const productName = ''; // AU_BUMP.xlsx 구조
        const failureMode = String(row['고장형태(FM)'] || row['Failure Mode'] || row['고장형태'] || '').trim();
        const cause = String(row['고장원인(FC)'] || row['Failure Cause'] || row['고장원인'] || '').trim();
        const sVal = row['S'] ? parseInt(String(row['S']), 10) || null : null;
        const oVal = row['O'] ? parseInt(String(row['O']), 10) || null : null;
        const dVal = row['D'] ? parseInt(String(row['D']), 10) || null : null;
        const compDate = String(row['개선일자'] || row['완료일자'] || row['Comp. Date'] || '').trim();
        const owner = String(row['담당자'] || row['Owner'] || '').trim();
        const attach = String(row['첨부(근거서류)'] || row['Attachment'] || '').trim();

        const prevImpr = String(row['예방관리 개선'] || row['PC Improvement'] || '').trim();
        const detImpr = String(row['검출관리 개선'] || row['DC Improvement'] || '').trim();

        if (prevImpr) {
          imported.push({
            lldNo, classification, applyTo: 'prevention',
            processNo: '', processName, productName, failureMode, cause,
            occurrence: oVal, detection: dVal,
            improvement: prevImpr,
            vehicle: '', target: '', m4Category: '', location: '', completedDate: compDate,
            status: statusObj, sourceType: 'import', priority: 0,
          });
        }
        if (detImpr) {
          imported.push({
            lldNo, classification, applyTo: 'detection',
            processNo: '', processName, productName, failureMode, cause,
            occurrence: oVal, detection: dVal,
            improvement: detImpr,
            vehicle: '', target: '', m4Category: '', location: '', completedDate: compDate,
            status: statusObj, sourceType: 'import', priority: 0,
          });
        }
      }
      const res = await fetch('/api/lld', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: imported }),
      });
      const result = await res.json();
      if (result.success) alert(`LLD Import 완료: ${imported.length}건 분할 저장`);
      else alert('Import 저장 실패: ' + (result.error || '알 수 없는 오류'));
    } catch (error) {
      console.error('[LLD Import] 오류:', error);
      alert('엑셀 읽기 오류');
    }
    e.target.value = '';
  };

  // ── LLD 엑셀 Export (통일 양식 - 14컬럼) ──
  const handleExport = () => {
    if (filtered.length === 0) { alert('내보낼 데이터가 없습니다.'); return; }
    
    // 제품명 제거된 14 컬럼 
    const NEW_HEADERS = ['LLD No.', '구분', '공정명', '고장형태(FM)', '고장원인(FC)', 'S', 'O', 'D', '예방관리 개선', '검출관리 개선', '개선일자', '상태', '담당자', '첨부(근거서류)'];
    const EN_HEADERS = ['LLD No.', 'Category', 'Process', 'Failure Mode', 'Failure Cause', 'S', 'O', 'D', 'PC Improvement', 'DC Improvement', 'Comp. Date', 'Status', 'Owner', 'Attachment'];
    const NEW_WIDTHS = [12, 10, 15, 25, 25, 5, 5, 5, 35, 35, 12, 8, 10, 20];

    const grouped = new Map<string, any>();
    
    // c.realUk (FMEA 행 단위)로 예방/검출 묶기
    for (const c of filtered) {
      const key = c.realUk;
      if (!grouped.has(key)) {
        grouped.set(key, {
          realUk: c.realUk,
          lldNo: c.matchedLld?.lldNo || '',
          classification: c.matchedLld?.classification || 'CIP',
          processName: c.processName,
          failureMode: c.fmText,
          cause: c.fcText,
          oVal: c.applyTarget === 'prevention' ? c.matchedLld?.occurrence : '',
          dVal: c.applyTarget === 'detection' ? c.matchedLld?.detection : '',
          prevImpr: c.applyTarget === 'prevention' ? (c.matchedLld?.preventionImprovement || c.matchedLld?.improvement || '') : '',
          detImpr: c.applyTarget === 'detection' ? (c.matchedLld?.detectionImprovement || c.matchedLld?.improvement || '') : '',
          status: c.matchedLld?.status || 'Y'
        });
      } else {
        const existing = grouped.get(key);
        if (!existing.lldNo && c.matchedLld?.lldNo) existing.lldNo = c.matchedLld.lldNo;

        if (c.applyTarget === 'prevention') {
          existing.prevImpr = c.matchedLld?.preventionImprovement || c.matchedLld?.improvement || '';
          if (c.matchedLld?.occurrence) existing.oVal = c.matchedLld.occurrence;
        } else {
          existing.detImpr = c.matchedLld?.detectionImprovement || c.matchedLld?.improvement || '';
          if (c.matchedLld?.detection) existing.dVal = c.matchedLld.detection;
        }
      }
    }

    if (grouped.size === 0) { alert('내보낼 데이터가 없습니다.'); return; }

    const rows = Array.from(grouped.values()).map(row => {
      const gubun = row.classification === 'ABN' ? '이상(ABN)' : row.classification === 'CIP' ? '개선(CIP)' : row.classification === 'RMA' ? '반품(RMA)' : row.classification;
      const status = row.status === 'G' ? '완료' : row.status === 'Y' ? '예정' : '보류';
      return [
        row.lldNo, gubun, row.processName,
        row.failureMode, row.cause,
        '', row.oVal ?? '', row.dVal ?? '',
        row.prevImpr, row.detImpr,
        '', status, '', ''
      ];
    });

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    // 워크북 생성 (Title + KR headers + EN headers + Rows)
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['LLD — 교훈 사례 등록 (통합본)'],
      NEW_HEADERS,
      EN_HEADERS,
      ...rows
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = NEW_WIDTHS.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'LLD추천추출');
    XLSX.writeFile(wb, `LLD_Recommend_Export_${today}.xlsx`);
  };

  // 메뉴 버튼 공통 스타일 — LLD 페이지와 동일
  const tabCls = (active: boolean, color?: string) =>
    `px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition-colors ${
      active
        ? color ? 'text-white' : 'bg-[#7B1FA2] text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  const actionCls = (bg: string) =>
    `px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap text-white ${bg}`;

  return createPortal(
    <>
      {/* 모달 패널 — 오버레이 없이 워크시트 위에 플로팅 */}
      <div
        className="bg-white rounded-lg flex flex-col shadow-2xl border-2 border-[#7B1FA2]"
        style={{ position: 'fixed', left: pos.x, top: pos.y, width: MODAL_W, maxHeight: MODAL_H_MAX, zIndex: 99999 }}
      >
        {/* 헤더 — 드래그 핸들 */}
        <div
          className="bg-[#7B1FA2] text-white py-1.5 px-4 rounded-t-lg flex justify-between items-center cursor-move select-none"
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold tracking-wide">LLD 추천</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{
              background: modal.applyStep === '6ST' ? '#e65100' : '#1565c0',
              color: '#fff',
            }}>
              → {modal.applyStep === '6ST' ? '6ST 최적화' : '5ST 리스크분석'}
            </span>
            <span className="text-[10px] opacity-80">Match:{matchedTotal} / Miss:{tierCounts[0]} / Sel:{checkedCount}</span>
          </div>
          <button onClick={onClose} className="bg-white/20 border-none text-white w-6 h-6 rounded cursor-pointer text-sm hover:bg-white/30">✕</button>
        </div>

        {/* 필터/액션 바 */}
        <div className="shrink-0 bg-gray-50 border-b border-slate-200 px-2 py-1">
          <div className="flex items-center gap-1 flex-wrap">
            <button className={tabCls(tierFilter === 'all')} onClick={() => setTierFilter('all')}>전체({candidates.length})</button>
            {([1, 2, 3, 0] as const).map(tier => (
              <button key={tier} className={tabCls(tierFilter === tier, TIER_META[tier].color)}
                style={tierFilter === tier ? { backgroundColor: TIER_META[tier].color } : {}}
                onClick={() => setTierFilter(tierFilter === tier ? 'all' : tier)}
              >{TIER_META[tier].label}({tierCounts[tier]})</button>
            ))}
            <span className="text-slate-300">|</span>
            <button className={tabCls(targetFilter === 'prevention', '#14b8a6')}
              style={targetFilter === 'prevention' ? { backgroundColor: '#14b8a6' } : {}}
              onClick={() => setTargetFilter(targetFilter === 'prevention' ? 'all' : 'prevention')}
            >PC({targetCounts.prevention})</button>
            <button className={tabCls(targetFilter === 'detection', '#6366f1')}
              style={targetFilter === 'detection' ? { backgroundColor: '#6366f1' } : {}}
              onClick={() => setTargetFilter(targetFilter === 'detection' ? 'all' : 'detection')}
            >DC({targetCounts.detection})</button>
            <span className="text-slate-300">|</span>
            {(['H', 'M', 'L'] as const).map(ap => (
              <button key={ap} className={tabCls(apFilter === ap, AP_COLORS[ap])}
                style={apFilter === ap ? { backgroundColor: AP_COLORS[ap], color: AP_TEXT[ap] } : {}}
                onClick={() => setApFilter(apFilter === ap ? 'all' : ap)}
              >{ap}({apCounts[ap]})</button>
            ))}
            <span className="text-slate-300">|</span>
            <button className={actionCls('bg-[#22c55e] hover:bg-[#16a34a]')} onClick={handleSelectMatched}>☑매칭선택</button>
            <button className={actionCls('bg-slate-400 hover:bg-slate-500')} onClick={handleDeselectAll}>☐전체해제</button>
            <button className={actionCls(checkedCount > 0 ? 'bg-[#0d47a1] hover:bg-[#1565c0]' : 'bg-slate-300 cursor-not-allowed')}
              onClick={onApply} disabled={checkedCount === 0}
            >✓적용({checkedCount}건)</button>
            <button className={actionCls('bg-[#0d47a1] hover:bg-[#1565c0]')}
              onClick={onSelectMatchedAndApply}
            >☑매칭선택 적용</button>
            <button className={actionCls(checkedCount > 0 ? 'bg-[#dc2626] hover:bg-[#b91c1c]' : 'bg-slate-300 cursor-not-allowed')}
              onClick={onDelete} disabled={checkedCount === 0}
            >🗑삭제({checkedCount}건)</button>
            <span className="text-slate-300">|</span>
            <button className={actionCls('bg-[#22c55e] hover:bg-[#16a34a]')} onClick={handleImport}>↑Import</button>
            <button className={actionCls('bg-[#f97316] hover:bg-[#ea580c]')} onClick={handleExport}>↓Export</button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* 테이블 — 15열, 그룹헤더, 지브라, SOD색상 */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[10px] border-collapse border border-slate-400" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 24 }} />
              <col style={{ width: 26 }} />
              <col style={{ width: 48 }} />
              <col style={{ width: 72 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 18 }} />
              <col style={{ width: 18 }} />
              <col style={{ width: 18 }} />
              <col style={{ width: 26 }} />
              <col style={{ width: 28 }} />
              <col style={{ width: 32 }} />
              <col style={{ width: 32 }} />
              <col style={{ width: 64 }} />
              <col />
              <col />
            </colgroup>
            {/* 그룹 헤더 */}
            <thead className="sticky top-0 z-10">
              <tr>
                <th colSpan={2} className="bg-[#6A1B9A] text-white text-[9px] font-bold text-center border-b border-r border-purple-300/40 p-0"></th>
                <th colSpan={4} className="bg-[#7B1FA2] text-white text-[10px] font-bold text-center border-b border-r border-purple-300/40 py-0.5">FMEA 정보</th>
                <th colSpan={3} className="bg-[#C62828] text-white text-[10px] font-bold text-center border-b border-r border-purple-300/40 py-0.5">현행 SOD</th>
                <th colSpan={5} className="bg-[#E65100] text-white text-[10px] font-bold text-center border-b border-r border-purple-300/40 py-0.5">매칭 정보</th>
                <th colSpan={2} className="bg-[#2E7D32] text-white text-[10px] font-bold text-center border-b border-purple-300/40 py-0.5">LLD 개선</th>
              </tr>
              {/* 컬럼 헤더 */}
              <tr className="bg-[#6A1B9A] text-white">
                {[
                  { label: <input type="checkbox" checked={allFilteredChecked} onChange={e => handleFilteredToggleAll(e.target.checked)} className="accent-white" />, w: 24 },
                  { label: '#', w: 26 },
                  { label: '공정번호', w: 52 },
                  { label: lb.l2Short, w: 80 },
                  { label: '고장형태(FM)', w: 110 },
                  { label: '고장원인(FC)', w: 110 },
                  { label: 'S', w: 20 },
                  { label: 'O', w: 20 },
                  { label: 'D', w: 20 },
                  { label: 'AP', w: 30 },
                  { label: '대상', w: 28 },
                  { label: '등급', w: 32 },
                  { label: '구분', w: 32 },
                  { label: 'LLD No', w: 70 },
                  { label: '예방관리 개선', w: 0 },
                  { label: '검출관리 개선', w: 0 },
                ].map((col, i) => (
                  <th key={i} className="px-1 py-1 border-b border-r border-white/30 font-bold text-center text-[10px] whitespace-nowrap" style={col.w ? { width: col.w } : undefined}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={16} className="text-center py-8 text-gray-400">
                  {candidates.length === 0 ? '매칭 가능한 LLD가 없습니다.' : '필터 조건에 맞는 항목이 없습니다.'}
                </td></tr>
              )}
              {filtered.map((c, idx) => {
                const tier = TIER_META[c.matchTier] || TIER_META[0];
                const zb = zebraRow(idx);
                const sVal = c.matchedLld?.severity ?? null;
                const oVal = c.matchedLld?.occurrence ?? null;
                const dVal = c.matchedLld?.detection ?? null;
                const prevText = c.matchedLld
                  ? (c.matchedLld.preventionImprovement || '')
                  : (c.applyTarget === 'prevention' ? (c.autoRecommendValue || '') : '');
                const detText = c.matchedLld
                  ? (c.matchedLld.detectionImprovement || '')
                  : (c.applyTarget === 'detection' ? (c.autoRecommendValue || '') : '');
                return (
                  <tr key={c.uniqueKey} className={`${zb} hover:bg-blue-50/60`}>
                    {/* ☑ */}
                    <td className={`${cellBase} text-center`}>
                      <input type="checkbox" checked={c.checked} onChange={() => onToggleCheck(c.uniqueKey)} disabled={!c.matchedLld && !c.autoRecommendValue} />
                    </td>
                    {/* # */}
                    <td className={`${cellBase} text-center text-gray-400`}>{idx + 1}</td>
                    {/* 공정번호 */}
                    <td className={`${cellBase} text-center font-mono`}>{c.processNo}</td>
                    {/* 공정명 */}
                    <td className={`${cellBase} truncate`}>{c.processName}</td>
                    {/* FM */}
                    <td className={`${cellBase} truncate`}>{c.fmText}</td>
                    {/* FC */}
                    <td className={`${cellBase} truncate`}>{c.fcText}</td>
                    {/* S */}
                    <td className={`${cellBase} text-center font-bold ${sodStyle(sVal)}`}>{sVal ?? '-'}</td>
                    {/* O */}
                    <td className={`${cellBase} text-center font-bold ${sodStyle(oVal)}`}>{oVal ?? '-'}</td>
                    {/* D */}
                    <td className={`${cellBase} text-center font-bold ${sodStyle(dVal)}`}>{dVal ?? '-'}</td>
                    {/* AP */}
                    <td className={`${cellBase} text-center`}>
                      {c.ap && <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: AP_COLORS[c.ap], color: AP_TEXT[c.ap] }}>{c.ap}</span>}
                    </td>
                    {/* 대상 */}
                    <td className={`${cellBase} text-center`}>
                      <span className={`inline-block px-1 py-0 rounded text-[8px] font-bold text-white leading-[14px] ${c.applyTarget === 'prevention' ? 'bg-teal-500' : 'bg-indigo-500'}`}>
                        {c.applyTarget === 'prevention' ? 'PC' : 'DC'}
                      </span>
                    </td>
                    {/* 등급 */}
                    <td className={`${cellBase} text-center`}>
                      <span className="inline-block px-1 py-0 rounded text-[8px] font-bold text-white leading-[14px]" style={{ backgroundColor: tier.color }}>{tier.label}</span>
                    </td>
                    {/* 구분 */}
                    <td className={`${cellBase} text-center`}>
                      {(() => {
                        const cls = c.matchedLld?.classification || '';
                        const meta = CLS_META[cls];
                        if (!cls) return <span className="text-gray-300 text-[8px]">-</span>;
                        return <span className="inline-block px-1 py-0 rounded text-[8px] font-bold leading-[14px]" style={{ backgroundColor: meta?.bg || '#6b7280', color: meta?.color || '#fff' }}>{cls}</span>;
                      })()}
                    </td>
                    {/* LLD No */}
                    <td className={`${cellBase} text-center font-mono text-[9px]`}>{c.matchedLld?.lldNo || '-'}</td>
                    {/* 예방관리 개선 */}
                    <td className={`${cellBase} truncate ${prevText ? '' : 'text-gray-300'}`} title={prevText || '-'}>{prevText || '-'}</td>
                    {/* 검출관리 개선 */}
                    <td className={`${cellBase} truncate border-r-0 ${detText ? '' : 'text-gray-300'}`} title={detText || '-'}>{detText || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>,
    document.body
  );
}

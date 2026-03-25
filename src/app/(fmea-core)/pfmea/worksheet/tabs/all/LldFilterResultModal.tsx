/**
 * @file LldFilterResultModal.tsx
 * @description LLD(필터코드) 추천 결과 — 전체화면 작업 뷰
 * LLD 페이지(lld/page.tsx)와 동일한 메뉴바/테이블 패턴 사용
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  2: { label: '공정명', color: '#3b82f6' },
  3: { label: '수평전개', color: '#a855f7' },
  0: { label: '미매칭', color: '#94a3b8' },
};

type TierFilter = 'all' | 1 | 2 | 3 | 0;
type TargetFilter = 'all' | 'prevention' | 'detection';
type ApFilter = 'all' | 'H' | 'M' | 'L';
const AP_COLORS: Record<string, string> = { H: '#ef5350', M: '#ffc107', L: '#4caf50' };
const AP_TEXT: Record<string, string> = { H: '#fff', M: '#000', L: '#fff' };

const MODAL_W = 1000;
const MODAL_H_MAX = 600;

export default function LldFilterResultModal({ modal, onClose, onApply, onSelectMatchedAndApply, onDelete, onToggleCheck, onToggleAll }: Props) {
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
          prevImpr: c.applyTarget === 'prevention' ? (c.matchedLld?.improvement || '') : '',
          detImpr: c.applyTarget === 'detection' ? (c.matchedLld?.improvement || '') : '',
          status: c.matchedLld?.status || 'Y'
        });
      } else {
        const existing = grouped.get(key);
        // LLD 번호가 양쪽에 다 있고 다르면 병합 (보통 같음)
        if (!existing.lldNo && c.matchedLld?.lldNo) existing.lldNo = c.matchedLld.lldNo;
        
        if (c.applyTarget === 'prevention') {
          existing.prevImpr = c.matchedLld?.improvement || '';
          if (c.matchedLld?.occurrence) existing.oVal = c.matchedLld.occurrence;
        } else {
          existing.detImpr = c.matchedLld?.improvement || '';
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
        ? color ? 'text-white' : 'bg-[#00587a] text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  const actionCls = (bg: string) =>
    `px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap text-white ${bg}`;

  return createPortal(
    <>
      {/* 모달 패널 — 오버레이 없이 워크시트 위에 플로팅 */}
      <div
        className="bg-white rounded-lg flex flex-col shadow-2xl border-2 border-[#00587a]"
        style={{ position: 'fixed', left: pos.x, top: pos.y, width: MODAL_W, maxHeight: MODAL_H_MAX, zIndex: 99999 }}
      >
        {/* 헤더 — 드래그 핸들 */}
        <div
          className="bg-[#00587a] text-white py-1.5 px-4 rounded-t-lg flex justify-between items-center cursor-move select-none"
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold">LLD 추천</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{
              background: modal.applyStep === '6ST' ? '#e65100' : '#1565c0',
              color: '#fff',
            }}>
              → {modal.applyStep === '6ST' ? '6ST 최적화' : '5ST 리스크분석'}
            </span>
            <span className="text-[10px] opacity-80">매칭:{matchedTotal} / 미매칭:{tierCounts[0]} / 선택:{checkedCount}</span>
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
            >예방({targetCounts.prevention})</button>
            <button className={tabCls(targetFilter === 'detection', '#6366f1')}
              style={targetFilter === 'detection' ? { backgroundColor: '#6366f1' } : {}}
              onClick={() => setTargetFilter(targetFilter === 'detection' ? 'all' : 'detection')}
            >검출({targetCounts.detection})</button>
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

        {/* 테이블 */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[10px] border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-10 bg-[#00587a] text-white">
              <tr>
                {[
                  { label: <input type="checkbox" checked={allFilteredChecked} onChange={e => handleFilteredToggleAll(e.target.checked)} />, w: 25 },
                  { label: '#', w: 25 },
                  { label: <div className="leading-tight"><div>공정번호</div><div className="text-[7px] font-normal opacity-60">(Proc.#)</div></div>, w: 45 },
                  { label: <div className="leading-tight"><div>공정명</div><div className="text-[7px] font-normal opacity-60">(Proc.)</div></div>, w: 70 },
                  { label: <div className="leading-tight"><div>고장형태</div><div className="text-[7px] font-normal opacity-60">(FM)</div></div>, w: 100 },
                  { label: <div className="leading-tight"><div>고장원인</div><div className="text-[7px] font-normal opacity-60">(FC)</div></div>, w: 95 },
                  { label: 'AP', w: 28 },
                  { label: <div className="leading-tight"><div>대상</div><div className="text-[7px] font-normal opacity-60">(Tgt)</div></div>, w: 35 },
                  { label: <div className="leading-tight"><div>등급</div><div className="text-[7px] font-normal opacity-60">(Tier)</div></div>, w: 45 },
                  { label: 'LLD No', w: 65 },
                  { label: <div className="leading-tight"><div>개선대책</div><div className="text-[7px] font-normal opacity-60">(Impr.)</div></div>, w: 220 },
                  { label: 'O', w: 22 },
                  { label: 'D', w: 22 },
                ].map((col, i) => (
                  <th key={i} className="p-0.5 border-b border-r border-white/20 font-bold text-center text-[10px]" style={{ width: col.w }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="text-center py-8 text-gray-400">
                  {candidates.length === 0 ? '매칭 가능한 LLD가 없습니다.' : '필터 조건에 맞는 항목이 없습니다.'}
                </td></tr>
              )}
              {filtered.map((c, idx) => {
                const tier = TIER_META[c.matchTier] || TIER_META[0];
                return (
                  <tr key={c.uniqueKey} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50'}>
                    <td className="p-0.5 border-b border-r border-slate-200 text-center">
                      <input type="checkbox" checked={c.checked} onChange={() => onToggleCheck(c.uniqueKey)} disabled={!c.matchedLld} />
                    </td>
                    <td className="p-0.5 border-b border-r border-slate-200 text-center text-gray-400">{idx + 1}</td>
                    <td className="p-0.5 border-b border-r border-slate-200 text-center font-mono truncate">{c.processNo}</td>
                    <td className="p-0.5 border-b border-r border-slate-200 truncate">{c.processName}</td>
                    <td className="p-0.5 border-b border-r border-slate-200 truncate">{c.fmText}</td>
                    <td className="p-0.5 border-b border-r border-slate-200 truncate">{c.fcText}</td>
                    <td className="p-0.5 border-b border-r border-slate-200 text-center">
                      {c.ap && (
                        <span className="inline-block px-1 rounded text-[9px] font-bold whitespace-nowrap" style={{ backgroundColor: AP_COLORS[c.ap], color: AP_TEXT[c.ap] }}>{c.ap}</span>
                      )}
                    </td>
                    <td className="p-0.5 border-b border-r border-slate-200 text-center">
                      <span className={`inline-block px-1 rounded text-[8px] font-bold text-white whitespace-nowrap ${c.applyTarget === 'prevention' ? 'bg-teal-500' : 'bg-indigo-500'}`}>
                        {c.applyTarget === 'prevention' ? '예방' : '검출'}
                      </span>
                    </td>
                    <td className="p-0.5 border-b border-r border-slate-200 text-center">
                      <span className="inline-block px-1 rounded text-[8px] font-bold text-white whitespace-nowrap" style={{ backgroundColor: tier.color }}>{tier.label}</span>
                    </td>
                    <td className="p-0.5 border-b border-r border-slate-200 text-center font-mono text-[9px] truncate">{c.matchedLld?.lldNo || '-'}</td>
                    <td className="p-0.5 border-b border-r border-slate-200 truncate">{c.matchedLld?.improvement || '-'}</td>
                    <td className="p-0.5 border-b border-r border-slate-200 text-center font-bold">{c.matchedLld?.occurrence ?? '-'}</td>
                    <td className="p-0.5 border-b border-slate-200 text-center font-bold">{c.matchedLld?.detection ?? '-'}</td>
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

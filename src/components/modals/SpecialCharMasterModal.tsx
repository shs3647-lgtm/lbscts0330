// CODEFREEZE
/**
 * @file SpecialCharMasterModal.tsx
 * @description 특별특성 마스터 등록/관리 모달
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { useSpecialCharFmea } from './useSpecialCharFmea';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

export interface SpecialCharMaster {
  id: string;
  customer: string;
  customerSymbol: string;
  internalSymbol: string;
  meaning: string;
  icon?: string;
  color: string;
  partName?: string;
  processName?: string;
  productChar?: string;
  processChar?: string;
  failureMode?: string;
  linkDFMEA: boolean;
  linkPFMEA: boolean;
  linkCP: boolean;
  linkPFD: boolean;
  usageCount?: number;
  lastUsedAt?: string | null;
}

/** 기본 특별특성 데이터 — LBS 전용 */
const DEFAULT_SPECIAL_CHARS: Omit<SpecialCharMaster, 'id' | 'partName' | 'processName' | 'productChar' | 'processChar' | 'failureMode'>[] = [
  { customer: 'LBS', customerSymbol: '◇', internalSymbol: '◇', meaning: '공정 특별 특성\nEtch Rate, Plating 두께, Chemical 농도, Curing Time, Plasma Power, Mold 온도/압력', icon: '◇', color: '#00838f', linkDFMEA: false, linkPFMEA: true, linkCP: true, linkPFD: true },
  { customer: 'LBS', customerSymbol: '★', internalSymbol: '★', meaning: '제품 특별특성\nBall Height, Co-planarity, Bond Strength, 전기적 특성(Vf, Ir, BVR), 패키지 치수', icon: '★', color: '#e65100', linkDFMEA: false, linkPFMEA: true, linkCP: true, linkPFD: true },
];

const STYLES = {
  th: { padding: '8px 6px', border: '1px solid #c8e6c9', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' as const, textAlign: 'center' as const },
  td: { padding: '4px 6px', border: '1px solid #e0e0e0', fontSize: '11px', whiteSpace: 'nowrap' as const },
  selectBtn: { width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '11px', background: '#fafafa', cursor: 'pointer', textAlign: 'left' as const, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { padding: '2px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, color: 'white', display: 'inline-block' },
  btnLink: { padding: '2px 8px', border: 'none', borderRadius: '3px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 },
};
const linkBtnStyle = (linked: boolean): React.CSSProperties => ({
  ...STYLES.btnLink,
  background: linked ? '#4caf50' : '#e0e0e0',
  color: linked ? 'white' : '#999'
});

// 선택 모달 컴포넌트 (비모달 플로팅)
function ItemSelectModal({
  isOpen, onClose, onSelect, title, items, currentValue
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  title: string;
  items: string[];
  currentValue: string;
}) {
  const [search, setSearch] = useState('');
  const [newItem, setNewItem] = useState('');
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: 400, height: 500, minWidth: 300, minHeight: 300
  });

  const filteredItems = useMemo(() => {
    if (!search) return items;
    return items.filter(item => item.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-[10001] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
        <div className="bg-blue-600 text-white py-3 px-4 rounded-t-lg flex justify-between items-center cursor-move shrink-0" onMouseDown={onDragStart}>
          <span className="font-semibold text-sm">{title}</span>
          <button onClick={onClose} onMouseDown={e => e.stopPropagation()} className="bg-transparent border-none text-white text-lg cursor-pointer">×</button>
        </div>

        <div className="p-3 border-b border-gray-300 shrink-0">
          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full py-2 px-3 border border-gray-300 rounded text-xs"
          />
        </div>

        <div className="flex-1 overflow-auto p-2">
          {/* 선택 해제 */}
          <div
            onClick={() => { onSelect(''); onClose(); }}
            className={`py-2 px-3 cursor-pointer rounded text-xs ${!currentValue ? 'bg-blue-50 text-gray-500' : 'text-gray-400'}`}
          >
            (선택 안함)
          </div>

          {filteredItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => { onSelect(item); onClose(); }}
              className={`py-2 px-3 cursor-pointer rounded text-xs ${currentValue === item ? 'bg-blue-50 font-semibold' : 'font-normal'} hover:bg-gray-100`}
            >
              {item}
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-xs">
              검색 결과 없음
            </div>
          )}
        </div>

        {/* 신규 추가 */}
        <div className="p-3 border-t border-gray-300 flex gap-2 shrink-0">
          <input
            type="text"
            placeholder="신규 항목 입력..."
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            className="flex-1 py-2 px-3 border border-gray-300 rounded text-xs"
          />
          <button
            onClick={() => { if (newItem.trim()) { onSelect(newItem.trim()); onClose(); } }}
            className="py-2 px-4 bg-green-600 text-white border-none rounded text-xs cursor-pointer"
          >
            추가
          </button>
        </div>

        {/* 리사이즈 핸들 */}
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
          <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
            <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
    </div>
  );
}

interface SpecialCharMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFmeaId?: string | null;  // ✅ 현재 작업 중인 FMEA ID (null도 허용)
  /** ★ 셀 선택 모드: 제공 시 각 행에 "선택" 버튼 표시 */
  onSelect?: (symbol: string) => void;
}

export default function SpecialCharMasterModal({ isOpen, onClose, currentFmeaId, onSelect }: SpecialCharMasterModalProps) {
  // 기호등록=50% 폭, FMEA조회=75% 폭 (탭별 동적)
  const symbolW = typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.5) : 750;
  const fmeaW = typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.75) : 1100;
  const modalH = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.85) : 750;
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: symbolW, height: modalH, minWidth: 600, minHeight: 400
  });
  const [masterData, setMasterData] = useState<SpecialCharMaster[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('전체');
  const [selectModal, setSelectModal] = useState<{ itemId: string; field: 'partName' | 'processName' | 'productChar' | 'processChar' | 'failureMode'; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'symbol' | 'fmea'>('symbol');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 탭별 동적 폭 계산
  const dynamicW = activeTab === 'fmea' ? Math.max(size.w, fmeaW) : Math.min(size.w, symbolW);

  const [dbSynced, setDbSynced] = useState(false);

  // ★ DB에서 로드 → localStorage 동기화 → 없으면 localStorage → DB 마이그레이션
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/special-char');
        const json = await res.json();
        if (!cancelled && json.success && json.data.length > 0) {
          // DB 데이터를 SpecialCharMaster 형태로 변환
          const dbData: SpecialCharMaster[] = json.data.map((d: Record<string, unknown>) => ({
            id: d.id as string,
            customer: d.customer as string || '',
            internalSymbol: d.internalSymbol as string || '',
            customerSymbol: d.customerSymbol as string || '',
            meaning: d.meaning as string || '',
            icon: (d.customerSymbol as string) || '',
            color: d.color as string || '#f5f5f5',
            partName: d.partName as string || '',
            processName: d.processName as string || '',
            productChar: d.productChar as string || '',
            processChar: d.processChar as string || '',
            failureMode: d.failureMode as string || '',
            linkDFMEA: d.linkDFMEA as boolean ?? false,
            linkPFMEA: d.linkPFMEA as boolean ?? true,
            linkCP: d.linkCP as boolean ?? true,
            linkPFD: d.linkPFD as boolean ?? false,
            usageCount: d.usageCount as number ?? 0,
            lastUsedAt: d.lastUsedAt as string || null,
          }));
          sortByCustomer(dbData);
          setMasterData(dbData);
          // localStorage도 동기화
          localStorage.setItem('pfmea_special_char_master', JSON.stringify(dbData));
          setDbSynced(true);
          return;
        }
      } catch {
        console.error('[SC] DB 로드 실패, localStorage 폴백');
      }

      // DB 비어있거나 실패 → localStorage에서 로드
      if (cancelled) return;
      const saved = localStorage.getItem('pfmea_special_char_master');
      let data: SpecialCharMaster[];
      if (saved) {
        data = JSON.parse(saved);
        // ★ localStorage → DB 자동 마이그레이션
        migrateToDb(data);
      } else {
        data = DEFAULT_SPECIAL_CHARS.map((item, idx) => ({
          ...item, id: `SC_${idx + 1}`, partName: '', processName: '', productChar: '', processChar: '', failureMode: '',
        }));
      }
      sortByCustomer(data);
      setMasterData(data);
    })();

    return () => { cancelled = true; };
  }, [isOpen]);

  // localStorage → DB 일회 마이그레이션
  const migrateToDb = useCallback(async (data: SpecialCharMaster[]) => {
    try {
      await fetch('/api/special-char', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: data }),
      });
      setDbSynced(true);
    } catch {
      console.error('[SC] DB 마이그레이션 실패');
    }
  }, []);

  const sortByCustomer = (data: SpecialCharMaster[]) => {
    const topOrder = ['LBS'];
    data.sort((a, b) => {
      const aPri = topOrder.indexOf(a.customer) >= 0 ? topOrder.indexOf(a.customer) : topOrder.length;
      const bPri = topOrder.indexOf(b.customer) >= 0 ? topOrder.indexOf(b.customer) : topOrder.length;
      return aPri - bPri;
    });
  };

  // 저장: DB + localStorage 동시 기록
  const saveData = useCallback((data: SpecialCharMaster[]) => {
    setMasterData(data);
    localStorage.setItem('pfmea_special_char_master', JSON.stringify(data));
  }, []);

  // DB 저장 (저장 버튼 클릭 시)
  const saveToDb = useCallback(async (data: SpecialCharMaster[]) => {
    try {
      // 기존 DB 전체 삭제 후 재등록 (간단한 동기화)
      const existRes = await fetch('/api/special-char');
      const existJson = await existRes.json();
      if (existJson.success && existJson.data.length > 0) {
        const ids = existJson.data.map((d: { id: string }) => d.id);
        await fetch('/api/special-char', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
      }
      // 신규 등록
      await fetch('/api/special-char', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: data }),
      });
      setDbSynced(true);
    } catch {
      console.error('[SC] DB 저장 실패');
    }
  }, []);

  const customers = useMemo(() => ['전체', ...new Set(masterData.map(d => d.customer))], [masterData]);
  const filteredData = useMemo(() => selectedCustomer === '전체' ? masterData : masterData.filter(d => d.customer === selectedCustomer), [masterData, selectedCustomer]);

  // FMEA 동기화/검색 hook
  const {
    searchFmeaId, setSearchFmeaId,
    loadedFmeaIds,
    isSearching, showFmeaDropdown, setShowFmeaDropdown,
    availableFmeaList, filteredFmeaList, masterItems,
    handleSearchFmea,
  } = useSpecialCharFmea({ isOpen, currentFmeaId, masterData, setMasterData, saveData });

  const toggleLink = useCallback((id: string, field: 'linkDFMEA' | 'linkPFMEA' | 'linkCP' | 'linkPFD') => {
    saveData(masterData.map(item => item.id === id ? { ...item, [field]: !item[field] } : item));
  }, [masterData, saveData]);

  const updateItem = useCallback((id: string, field: keyof SpecialCharMaster, value: string) => {
    saveData(masterData.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, [masterData, saveData]);

  // ★ 신규 기호는 맨 위에 추가 (아래쪽에 추가하면 스크롤해야 확인 가능)
  const addNewItem = useCallback(() => {
    const newItem: SpecialCharMaster = {
      id: `SC_${Date.now()}`, customer: 'LBS', customerSymbol: '', internalSymbol: '', meaning: '',
      icon: '', color: '#f5f5f5', partName: '', processName: '', productChar: '', processChar: '', failureMode: '',
      linkDFMEA: false, linkPFMEA: true, linkCP: true, linkPFD: false,
    };
    saveData([newItem, ...masterData]);
  }, [masterData, saveData]);

  const deleteItem = useCallback((id: string) => {
    if (confirm('삭제하시겠습니까?')) saveData(masterData.filter(item => item.id !== id));
  }, [masterData, saveData]);

  // 다중선택 토글
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const visibleIds = filteredData.map(d => d.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [filteredData, selectedIds]);

  // 선택 삭제
  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) { alert('삭제할 항목을 선택하세요.'); return; }
    if (confirm(`${selectedIds.size}개 항목을 삭제하시겠습니까?`)) {
      saveData(masterData.filter(item => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
    }
  }, [masterData, saveData, selectedIds]);

  // 중복제거 (동일 회사+표시+기호)
  const removeDuplicates = useCallback(() => {
    const seen = new Set<string>();
    const unique: SpecialCharMaster[] = [];
    let removed = 0;
    for (const item of masterData) {
      const key = `${item.customer}|${item.internalSymbol}|${item.customerSymbol}`;
      if (seen.has(key)) { removed++; } else { seen.add(key); unique.push(item); }
    }
    if (removed === 0) { alert('중복 항목이 없습니다.'); return; }
    if (confirm(`${removed}개 중복 항목을 제거하시겠습니까?`)) {
      saveData(unique);
      setSelectedIds(new Set());
    }
  }, [masterData, saveData]);

  // 빈행 제거 (회사+표시+기호+기준 모두 비어있는 행)
  const removeEmptyRows = useCallback(() => {
    const empties = masterData.filter(item =>
      !item.customer.trim() && !item.internalSymbol.trim() && !item.customerSymbol.trim() && !item.meaning.trim()
    );
    if (empties.length === 0) { alert('빈 행이 없습니다.'); return; }
    if (confirm(`${empties.length}개 빈 행을 제거하시겠습니까?`)) {
      const emptyIds = new Set(empties.map(e => e.id));
      saveData(masterData.filter(item => !emptyIds.has(item.id)));
      setSelectedIds(new Set());
    }
  }, [masterData, saveData]);

  const handleExport = useCallback(async () => {
    const XS = (await import('xlsx-js-style')).default;

    // ★ 탭별 Export 컬럼 분리 — 각 화면 내용과 100% 일치
    const isSymbolTab = activeTab === 'symbol';
    const headers = isSymbolTab
      ? ['회사(Company)', '표시(Internal)', '기호(Symbol)', '기준(Criteria)']
      : ['기호(Symbol)', '회사(Company)', '부품(Part)', '공정(Process)', '제품특성(Product Char)', '공정특성(Process Char)', '고장형태(Failure Mode)', 'D-FMEA', 'P-FMEA', 'CP', 'PFD'];

    const exportData = selectedCustomer === '전체' ? masterData : masterData.filter(d => d.customer === selectedCustomer);
    const rows = exportData.map(item => isSymbolTab
      ? [item.customer, item.internalSymbol, item.customerSymbol, item.meaning]
      : [
          item.customerSymbol || item.internalSymbol, item.customer,
          item.partName || '', item.processName || '',
          item.productChar || '', item.processChar || '', item.failureMode || '',
          item.linkDFMEA ? 'Y' : '', item.linkPFMEA ? 'Y' : '',
          item.linkCP ? 'Y' : '', item.linkPFD ? 'Y' : '',
        ]
    );

    const aoa = [headers, ...rows];
    const ws = XS.utils.aoa_to_sheet(aoa);

    // 열 너비 — 탭별
    ws['!cols'] = isSymbolTab
      ? [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 36 }]
      : [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }];

    // 행 높이
    ws['!rows'] = aoa.map((_, i) => ({ hpt: i === 0 ? 30 : 24 }));

    // 공통 테두리
    const thinBorder = (color: string) => ({
      top: { style: 'thin' as const, color: { rgb: color } },
      bottom: { style: 'thin' as const, color: { rgb: color } },
      left: { style: 'thin' as const, color: { rgb: color } },
      right: { style: 'thin' as const, color: { rgb: color } },
    });

    // 회사 구분선용 하단 굵은 테두리
    const groupBottomBorder = (color: string) => ({
      ...thinBorder(color),
      bottom: { style: 'medium' as const, color: { rgb: isSymbolTab ? '2E7D32' : '1565C0' } },
    });

    // 헤더 스타일 — 탭별 색상
    const headerColor = isSymbolTab ? '2E7D32' : '1565C0';
    const headerBorderColor = isSymbolTab ? '1B5E20' : '0D47A1';
    const headerStyle = {
      fill: { patternType: 'solid' as const, fgColor: { rgb: headerColor } },
      font: { name: '맑은 고딕', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      border: thinBorder(headerBorderColor),
      alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
    };

    // 4M 컬럼 헤더 (SC Lookup 탭 전용)
    const header4MStyle = {
      ...headerStyle,
      fill: { patternType: 'solid' as const, fgColor: { rgb: '1976D2' } },
    };

    // 연동 컬럼 헤더 (SC Lookup 탭 전용)
    const headerLinkStyle = {
      ...headerStyle,
      fill: { patternType: 'solid' as const, fgColor: { rgb: '7B1FA2' } },
    };

    // 데이터 스타일 (짝수/홀수)
    const oddBg = isSymbolTab ? 'F1F8E9' : 'E3F2FD';
    const makeDataStyle = (isOdd: boolean, isGroupEnd: boolean) => ({
      fill: { patternType: 'solid' as const, fgColor: { rgb: isOdd ? oddBg : 'FFFFFF' } },
      font: { name: '맑은 고딕', sz: 10 },
      border: isGroupEnd ? groupBottomBorder('D0D0D0') : thinBorder('D0D0D0'),
      alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
    });

    // Y 셀 강조 스타일
    const yColor = isSymbolTab ? '2E7D32' : '7B1FA2';
    const makeYCellStyle = (isOdd: boolean, isGroupEnd: boolean) => ({
      ...makeDataStyle(isOdd, isGroupEnd),
      font: { name: '맑은 고딕', sz: 10, bold: true, color: { rgb: yColor } },
    });

    // 기준/텍스트 컬럼 (좌측 정렬)
    const makeLeftAlignStyle = (isOdd: boolean, isGroupEnd: boolean) => ({
      ...makeDataStyle(isOdd, isGroupEnd),
      alignment: { horizontal: 'left' as const, vertical: 'center' as const, wrapText: true },
    });

    // 회사 그룹 구분 감지 (Tab1: 첫 컬럼, Tab2: 두 번째 컬럼이 회사)
    const customerCol = isSymbolTab ? 0 : 1;
    const isGroupEnd = (rowIdx: number) => {
      if (rowIdx >= rows.length - 1) return false;
      return rows[rowIdx][customerCol] !== rows[rowIdx + 1][customerCol];
    };

    // 좌측 정렬 컬럼 인덱스 (Tab1: 기준=3, Tab2: 부품~공정특성=2~5)
    const leftAlignCols = isSymbolTab ? new Set([3]) : new Set([2, 3, 4, 5]);
    // Y값 컬럼 시작 인덱스 (Tab1: 없음, Tab2: D-FMEA~PFD=6~9)
    const yCellStartCol = isSymbolTab ? 999 : 6;

    // 스타일 적용
    const range = XS.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XS.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { v: '', t: 's' };

        if (r === 0) {
          // SC Lookup 탭: 4M(2~5) / 연동(6~9) 컬럼별 헤더 색상 분리
          if (!isSymbolTab && c >= 2 && c <= 5) {
            ws[addr].s = header4MStyle;
          } else if (!isSymbolTab && c >= 6 && c <= 9) {
            ws[addr].s = headerLinkStyle;
          } else {
            ws[addr].s = headerStyle;
          }
        } else {
          const dataIdx = r - 1;
          const odd = r % 2 === 0;
          const groupEnd = isGroupEnd(dataIdx);
          const cellValue = ws[addr].v;

          if (leftAlignCols.has(c)) {
            ws[addr].s = makeLeftAlignStyle(odd, groupEnd);
          } else if (c >= yCellStartCol && cellValue === 'Y') {
            ws[addr].s = makeYCellStyle(odd, groupEnd);
          } else {
            ws[addr].s = makeDataStyle(odd, groupEnd);
          }
        }
      }
    }

    const sheetName = isSymbolTab ? '기호등록' : '특별특성항목등록';
    const fileName = isSymbolTab
      ? `특별특성_기호등록_${new Date().toISOString().slice(0,10)}.xlsx`
      : `특별특성_항목등록_${new Date().toISOString().slice(0,10)}.xlsx`;

    const wb = XS.utils.book_new();
    XS.utils.book_append_sheet(wb, ws, sheetName);
    XS.writeFile(wb, fileName);
  }, [activeTab, masterData, selectedCustomer]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // ★ 시트명/헤더로 탭 형식 자동 감지
      const sheetName = workbook.SheetNames[0] || '';
      const firstRow = jsonData[0] as Record<string, unknown> | undefined;
      const headers = firstRow ? Object.keys(firstRow) : [];
      const isItemRegisterFormat = sheetName === '특별특성항목등록'
        || headers.some(h => h.includes('부품') || h.includes('Part') || h.includes('제품특성') || h.includes('Product Char'));

      const importedData: SpecialCharMaster[] = jsonData.map((row: any, idx) => {
        if (isItemRegisterFormat) {
          // 항목등록 탭 형식: 기호(Symbol), 회사(Company), 부품(Part), 공정(Process), ...
          const symbol = row['기호(Symbol)'] || row['기호'] || '';
          return {
            id: `SC_${Date.now()}_${idx}`,
            customer: row['회사(Company)'] || row['고객(Customer)'] || row['회사'] || row['고객'] || '',
            customerSymbol: symbol,
            internalSymbol: symbol || '',
            meaning: '',
            icon: symbol,
            color: '#f5f5f5',
            partName: row['부품(Part)'] || row['부품'] || '',
            processName: row['공정(Process)'] || row['공정'] || '',
            productChar: row['제품특성(Product Char)'] || row['제품특성'] || '',
            processChar: row['공정특성(Process Char)'] || row['공정특성'] || '',
            failureMode: row['고장형태(Failure Mode)'] || row['고장형태'] || '',
            linkDFMEA: row['D-FMEA'] === 'Y',
            linkPFMEA: row['P-FMEA'] === 'Y',
            linkCP: row['CP'] === 'Y',
            linkPFD: row['PFD'] === 'Y',
          };
        }
        // 기호등록 탭 형식: 회사(Company), 표시(Internal), 기호(Symbol), 기준(Criteria)
        return {
          id: `SC_${Date.now()}_${idx}`,
          customer: row['회사(Company)'] || row['고객사(Customer)'] || row['회사'] || row['고객사'] || row['고객'] || '',
          customerSymbol: row['기호(Symbol)'] || row['기호'] || row['고객기호'] || '',
          internalSymbol: row['표시(Internal)'] || row['표시'] || row['자사표시'] || '',
          meaning: row['기준(Criteria)'] || row['기준'] || row['구분'] || '',
          icon: '',
          color: '#f5f5f5',
          partName: '',
          processName: '',
          productChar: '',
          processChar: '',
          failureMode: '',
          linkDFMEA: row['D-FMEA'] === 'Y',
          linkPFMEA: row['P-FMEA'] === 'Y',
          linkCP: row['CP'] === 'Y',
          linkPFD: row['PFD'] === 'Y',
        };
      });

      // 기존 데이터에 병합 (동일 고객+기호 중복 제거)
      const existing = masterData;
      const merged = [...existing];
      let addedCount = 0;
      for (const item of importedData) {
        const dup = merged.find(m =>
          m.customer === item.customer && m.customerSymbol === item.customerSymbol
          && m.partName === item.partName && m.processName === item.processName
        );
        if (!dup) {
          merged.push(item);
          addedCount++;
        }
      }
      saveData(merged);
      alert(`${addedCount}개 항목 추가 (중복 ${importedData.length - addedCount}개 제외). 총 ${merged.length}개`);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  }, [saveData, masterData]);

  const getSelectItems = (field: string) => {
    switch (field) {
      case 'partName': return masterItems.parts;
      case 'processName': return masterItems.processes;
      case 'productChar': return masterItems.productChars;
      case 'processChar': return masterItems.processChars;
      case 'failureMode': return masterItems.failureModes || [];
      default: return [];
    }
  };

  // ★ 회사별 행 배경색 — 파란색/녹색 번갈아 (단순)
  const customerColorMap = useMemo(() => {
    const colors = ['#bbdefb', '#c8e6c9']; // 파란, 녹색
    const map = new Map<string, string>();
    let idx = 0;
    masterData.forEach(d => {
      if (!map.has(d.customer)) {
        map.set(d.customer, colors[idx % colors.length]);
        idx++;
      }
    });
    return map;
  }, [masterData]);

  if (!isOpen) return null;

  // 선택 버튼 컴포넌트
  const SelectButton = ({ itemId, field, value, title }: { itemId: string; field: 'partName' | 'processName' | 'productChar' | 'processChar' | 'failureMode'; value: string; title: string }) => (
    <button 
      onClick={() => setSelectModal({ itemId, field, title })}
      style={STYLES.selectBtn}
    >
      <span className={`overflow-hidden text-ellipsis ${value ? 'text-gray-800' : 'text-gray-400'}`}>{value || title}</span>
      <span className="text-blue-700 text-[10px]">▼</span>
    </button>
  );

  // 헤더 그라데이션 스타일
  const headerGradientStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)' };

  // 탭 스타일 (컴팩트)
  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '5px 16px',
    border: 'none',
    borderBottom: isActive ? '2px solid #2e7d32' : '2px solid transparent',
    background: isActive ? '#e8f5e9' : 'transparent',
    color: isActive ? '#2e7d32' : '#666',
    fontSize: '12px',
    fontWeight: isActive ? 700 : 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const modalContent = (
    <div
      className="fixed z-[10000] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: dynamicW, height: size.h, transition: 'width 0.2s ease' }}
    >
        {/* 헤더: 탭 + 액션 버튼 통합 */}
        <div className="text-white py-0.5 px-2 flex justify-between items-center cursor-move shrink-0 rounded-t-lg" style={headerGradientStyle} onMouseDown={onDragStart}>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
              <button onClick={() => setActiveTab('symbol')} className={`py-0.5 px-2 border-none rounded text-[10px] cursor-pointer font-semibold leading-tight ${activeTab === 'symbol' ? 'bg-white text-green-800' : 'bg-white/20 text-white hover:bg-white/30'}`} title="Symbol Registration">
                <div>기호등록</div><div className="text-[7px] opacity-70">(Symbol)</div>
              </button>
              <button onClick={() => setActiveTab('fmea')} className={`py-0.5 px-2 border-none rounded text-[10px] cursor-pointer font-semibold leading-tight ${activeTab === 'fmea' ? 'bg-white text-green-800' : 'bg-white/20 text-white hover:bg-white/30'}`} title="SC Item Register">
                <div>항목등록</div><div className="text-[7px] opacity-70">(SC Item)</div>
              </button>
            </div>
            <div className="w-px h-4 bg-white/30" />
            <button onClick={addNewItem} className="py-0.5 px-1.5 bg-green-500 text-white border-none rounded text-[9px] cursor-pointer font-bold" onMouseDown={e => e.stopPropagation()}>+ 추가</button>
            <button onClick={deleteSelected} className="py-0.5 px-1.5 bg-red-600 text-white border-none rounded text-[9px] cursor-pointer font-bold" onMouseDown={e => e.stopPropagation()} title="선택 삭제">선택삭제{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</button>
            <button onClick={removeDuplicates} className="py-0.5 px-1.5 bg-amber-600 text-white border-none rounded text-[9px] cursor-pointer" onMouseDown={e => e.stopPropagation()} title="중복제거">중복제거</button>
            <button onClick={removeEmptyRows} className="py-0.5 px-1.5 bg-gray-600 text-white border-none rounded text-[9px] cursor-pointer" onMouseDown={e => e.stopPropagation()} title="빈행 제거">빈행제거</button>
          </div>
          <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
            <button onClick={handleExport} className="py-0.5 px-1.5 bg-blue-600 text-white border-none rounded text-[9px] cursor-pointer">Export</button>
            <button onClick={() => fileInputRef.current?.click()} className="py-0.5 px-1.5 bg-orange-500 text-white border-none rounded text-[9px] cursor-pointer">Import</button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
            <button onClick={() => { saveData(masterData); saveToDb(masterData); alert('저장되었습니다 (DB 동기화).'); onClose(); }} className="py-0.5 px-2 bg-yellow-500 text-gray-900 border-none rounded text-[9px] cursor-pointer font-bold" title="Save">저장</button>
            {dbSynced && <span className="text-[7px] text-green-200 ml-0.5">DB</span>}
            <button onClick={onClose} onMouseDown={e => e.stopPropagation()} className="bg-white/20 border-none text-white w-5 h-5 rounded-full cursor-pointer text-[10px] leading-none">×</button>
          </div>
        </div>

        {/* ===== 탭 1: 기호등록 ===== */}
        {activeTab === 'symbol' && (
          <>
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-[1]">
                  {/* 필터바 */}
                  <tr className="bg-green-50">
                    <th colSpan={onSelect ? 8 : 7} className="py-0.5 px-2 border border-green-200">
                      <div className="flex gap-2 items-center">
                        <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="py-0.5 px-1.5 border border-gray-300 rounded text-[10px]">
                          {customers.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <span className="text-[10px] text-gray-500">{filteredData.length}개</span>
                      </div>
                    </th>
                  </tr>
                  <tr className="bg-green-100">
                    <th className="py-0.5 px-1 border border-green-300 text-center w-8"><input type="checkbox" checked={filteredData.length > 0 && filteredData.every(d => selectedIds.has(d.id))} onChange={toggleSelectAll} className="cursor-pointer" title="전체선택" /></th>
                    <th className="py-0.5 px-1 border border-green-300 text-[10px] font-semibold text-center w-20" title="Company"><div className="leading-tight"><div>회사</div><div className="text-[7px] font-normal opacity-60">(Company)</div></div></th>
                    {onSelect && <th className="py-0.5 px-1 border border-green-300 text-[10px] font-semibold text-center w-12 bg-orange-100" title="Select">선택</th>}
                    <th className="py-0.5 px-1 border border-green-300 text-[10px] font-semibold text-center w-14" title="Internal Symbol"><div className="leading-tight"><div>표시</div><div className="text-[7px] font-normal opacity-60">(Internal)</div></div></th>
                    <th className="py-0.5 px-1 border border-green-300 text-[10px] font-semibold text-center w-16" title="Customer Symbol"><div className="leading-tight"><div>기호</div><div className="text-[7px] font-normal opacity-60">(Symbol)</div></div></th>
                    <th className="py-0.5 px-1 border border-green-300 text-[10px] font-semibold text-center" title="Criteria"><div className="leading-tight"><div>기준</div><div className="text-[7px] font-normal opacity-60">(Criteria)</div></div></th>
                    <th className="py-0.5 px-1 border border-green-300 text-[10px] font-semibold text-center w-10 bg-purple-100" title="Usage Count"><div className="leading-tight"><div>사용</div><div className="text-[7px] font-normal opacity-60">(Used)</div></div></th>
                    <th className="py-0.5 px-1 border border-green-300 text-[10px] font-semibold text-center w-8" title="Delete">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(item => (
                    <tr key={item.id} style={{ background: customerColorMap.get(item.customer) || '#fff' }} className="hover:brightness-95">
                      <td className="py-1 px-1 border border-gray-200 text-center"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="cursor-pointer" /></td>
                      {onSelect && (
                        <td className="py-1 px-1 border border-gray-200 text-center">
                          <button
                            onClick={() => { const sym = (item.customerSymbol && item.customerSymbol.trim()) ? item.customerSymbol : item.internalSymbol; onSelect(sym); onClose(); }}
                            className="py-0.5 px-2 bg-orange-500 hover:bg-orange-600 text-white border-none rounded text-[9px] cursor-pointer font-bold"
                          >선택</button>
                        </td>
                      )}
                      <td className="py-1 px-2 border border-gray-200">
                        <input type="text" value={item.customer} onChange={e => updateItem(item.id, 'customer', e.target.value)} className="w-full py-0.5 px-1 border border-gray-300 rounded text-[11px] bg-white/80" />
                      </td>
                      <td className="py-1 px-1 border border-gray-200 text-center">
                        <input
                          type="text"
                          list="internal-symbol-list"
                          value={item.internalSymbol}
                          onChange={e => updateItem(item.id, 'internalSymbol', e.target.value)}
                          className="w-full py-0.5 px-1 border border-gray-300 rounded text-[11px] font-bold bg-white/80 text-center"
                          placeholder="SC"
                        />
                      </td>
                      <td className="py-1 px-1 border border-gray-200">
                        <input type="text" value={item.customerSymbol} onChange={e => updateItem(item.id, 'customerSymbol', e.target.value)} className="w-full py-0.5 px-1 border border-gray-300 rounded text-[11px] text-center font-bold bg-white/80" />
                      </td>
                      <td className="py-0.5 px-1 border border-gray-200">
                        <textarea value={item.meaning} onChange={e => updateItem(item.id, 'meaning', e.target.value)}
                          rows={Math.max(1, (item.meaning || '').split('\n').length)}
                          className="w-full py-0.5 px-1 border border-gray-300 rounded text-[10px] bg-white/80 resize-none leading-tight" />
                      </td>
                      <td className="py-1 px-1 border border-gray-200 text-center">
                        {(item.usageCount ?? 0) > 0 ? (
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded" title={item.lastUsedAt ? `최종: ${new Date(item.lastUsedAt).toLocaleDateString('ko-KR')}` : ''}>
                            {item.usageCount}회
                          </span>
                        ) : (
                          <span className="text-[8px] text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-1 border border-gray-200 text-center">
                        <button onClick={() => deleteItem(item.id)} className="py-0.5 px-1.5 bg-red-500 text-white border-none rounded text-[9px] cursor-pointer">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* 표시 기호 추천 목록 (기존값 + 기본값) */}
              <datalist id="internal-symbol-list">
                {[...new Set(['SC', 'F/F', ...masterData.map(d => d.internalSymbol).filter(Boolean)])].map(sym => (
                  <option key={sym} value={sym} />
                ))}
              </datalist>
            </div>

            <div className="px-2 py-1 bg-green-50 border-t border-gray-300">
              <div className="text-[9px] text-green-800 leading-3">
                <b>SC</b> = Safety/Compliance | <b>CC</b> = Critical Char | <b>F/F</b> = Fit/Function
              </div>
            </div>
          </>
        )}

        {/* ===== 탭 2: 특별특성항목등록 ===== */}
        {activeTab === 'fmea' && (
          <>
            <div className="py-0.5 px-2 bg-blue-50 border-b border-gray-300 flex gap-2 items-center flex-wrap">
              <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="py-0.5 px-1.5 border border-gray-300 rounded text-[10px]">
                {customers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* FMEA ID 검색 */}
              <div className="relative flex items-center gap-1 bg-white border border-purple-300 rounded px-1.5 py-0.5">
                <span className="text-[9px] text-purple-700 font-semibold whitespace-nowrap">FMEA:</span>
                <div className="relative">
                  <input
                    type="text"
                    value={searchFmeaId}
                    onChange={(e) => setSearchFmeaId(e.target.value)}
                    onFocus={() => setShowFmeaDropdown(true)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchFmea()}
                    placeholder={currentFmeaId || 'ID 검색/선택'}
                    className="w-[130px] py-0.5 px-1.5 border-none text-[10px] outline-none bg-transparent"
                  />
                  <button
                    onClick={() => setShowFmeaDropdown(!showFmeaDropdown)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-600 text-[10px]"
                    title="FMEA 목록 보기"
                  >
                    ▼
                  </button>

                  {/* FMEA ID 드롭다운 목록 */}
                  {showFmeaDropdown && (
                    <div
                      className="absolute top-full left-0 mt-1 w-[280px] max-h-[200px] overflow-y-auto bg-white border border-purple-300 rounded shadow-lg z-50"
                      onMouseLeave={() => setShowFmeaDropdown(false)}
                    >
                      <div className="sticky top-0 bg-purple-100 px-2 py-1 text-[10px] text-purple-700 font-semibold border-b border-purple-200">
                        등록된 FMEA ({availableFmeaList.length}개)
                      </div>
                      {filteredFmeaList.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500">검색 결과 없음</div>
                      ) : (
                        filteredFmeaList.map((fmea) => (
                          <div
                            key={fmea.id}
                            onClick={() => {
                              setShowFmeaDropdown(false);
                              setSearchFmeaId(fmea.id);
                              handleSearchFmea(fmea.id);
                            }}
                            className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-purple-50 border-b border-gray-100 ${
                              fmea.id.toLowerCase() === currentFmeaId?.toLowerCase() ? 'bg-green-50 text-green-700 font-semibold' : ''
                            } ${loadedFmeaIds.some(id => id.toLowerCase() === fmea.id.toLowerCase()) ? 'bg-blue-50' : ''}`}
                          >
                            <span className="font-mono">{fmea.id}</span>
                            {fmea.name !== fmea.id && (
                              <span className="text-gray-500 ml-1">({fmea.name.replace(fmea.id + ' - ', '')})</span>
                            )}
                            {fmea.id.toLowerCase() === currentFmeaId?.toLowerCase() && <span className="ml-1 text-green-600">✓</span>}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleSearchFmea()}
                  disabled={isSearching}
                  className="py-0.5 px-2 bg-purple-600 text-white border-none rounded text-[9px] cursor-pointer font-semibold disabled:bg-gray-400"
                >
                  {isSearching ? '...' : '검색'}
                </button>
              </div>

              {currentFmeaId && (
                <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-300">
                  {currentFmeaId.toUpperCase()}
                </span>
              )}

              <span className="text-[10px] text-gray-500">{filteredData.length}개</span>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse min-w-[1260px]">
                <thead className="sticky top-0 z-[1]">
                  <tr className="bg-blue-100">
                    <th className="py-0.5 px-1 border border-blue-300 text-center w-8"><input type="checkbox" checked={filteredData.length > 0 && filteredData.every(d => selectedIds.has(d.id))} onChange={toggleSelectAll} className="cursor-pointer" title="전체선택" /></th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center w-16"><div className="leading-tight"><div>기호</div><div className="text-[7px] font-normal opacity-60">(Symbol)</div></div></th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center w-16"><div className="leading-tight"><div>회사</div><div className="text-[7px] font-normal opacity-60">(Company)</div></div></th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center bg-blue-200 w-[100px]"><div className="leading-tight"><div>부품</div><div className="text-[7px] font-normal opacity-60">(Part)</div></div></th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center bg-blue-200 w-[120px]"><div className="leading-tight"><div>공정</div><div className="text-[7px] font-normal opacity-60">(Process)</div></div></th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center bg-blue-200 w-[160px]"><div className="leading-tight"><div>제품특성</div><div className="text-[7px] font-normal opacity-60">(Product Char)</div></div></th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center bg-blue-200 w-[160px]"><div className="leading-tight"><div>공정특성</div><div className="text-[7px] font-normal opacity-60">(Process Char)</div></div></th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center bg-orange-200 w-[160px]"><div className="leading-tight"><div>고장형태</div><div className="text-[7px] font-normal opacity-60">(Failure Mode)</div></div></th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center bg-purple-200 w-12">D-FMEA</th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center bg-purple-200 w-12">P-FMEA</th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center bg-purple-200 w-8">CP</th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center bg-purple-200 w-8">PFD</th>
                    <th className="py-0.5 px-1 border border-blue-300 text-[10px] font-semibold text-center bg-gray-200 w-8">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(item => {
                    // ★ 기호 표시: customerSymbol > internalSymbol > icon 순서 폴백
                    const displaySymbol = item.customerSymbol || item.internalSymbol || item.icon || '?';
                    const badgeBg = item.color && item.color !== '#f5f5f5' && item.color !== '' ? item.color : '#5c6bc0';
                    return (
                    <tr key={item.id} className="bg-white hover:bg-blue-50">
                      <td className="p-1 border border-gray-300 text-center"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="cursor-pointer" /></td>
                      <td className="p-1 border border-gray-300 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white inline-block" style={{ background: badgeBg }}>{displaySymbol}</span>
                      </td>
                      <td className="p-1 border border-gray-300 text-[10px] text-center font-medium">{item.customer}</td>
                      <td style={STYLES.td}><SelectButton itemId={item.id} field="partName" value={item.partName || ''} title="부품 선택" /></td>
                      <td style={STYLES.td}><SelectButton itemId={item.id} field="processName" value={item.processName || ''} title="공정 선택" /></td>
                      <td style={STYLES.td}><SelectButton itemId={item.id} field="productChar" value={item.productChar || ''} title="제품특성 선택" /></td>
                      <td style={STYLES.td}><SelectButton itemId={item.id} field="processChar" value={item.processChar || ''} title="공정특성 선택" /></td>
                      <td style={STYLES.td}><SelectButton itemId={item.id} field="failureMode" value={item.failureMode || ''} title="고장형태 선택" /></td>
                      <td className="p-1 border border-gray-300 text-center">
                        <button onClick={() => toggleLink(item.id, 'linkDFMEA')} style={linkBtnStyle(item.linkDFMEA)}>{item.linkDFMEA ? '연동' : '-'}</button>
                      </td>
                      <td className="p-1 border border-gray-300 text-center">
                        <button onClick={() => toggleLink(item.id, 'linkPFMEA')} style={linkBtnStyle(item.linkPFMEA)}>{item.linkPFMEA ? '연동' : '-'}</button>
                      </td>
                      <td className="p-1 border border-gray-300 text-center">
                        <button onClick={() => toggleLink(item.id, 'linkCP')} style={linkBtnStyle(item.linkCP)}>{item.linkCP ? '연동' : '-'}</button>
                      </td>
                      <td className="p-1 border border-gray-300 text-center">
                        <button onClick={() => toggleLink(item.id, 'linkPFD')} style={linkBtnStyle(item.linkPFD)}>{item.linkPFD ? '연동' : '-'}</button>
                      </td>
                      <td className="p-1 border border-gray-300 text-center">
                        <button onClick={() => deleteItem(item.id)} className="py-0.5 px-1.5 bg-red-500 text-white border-none rounded text-[9px] cursor-pointer">✕</button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

      {/* 항목 선택 모달 */}
      {selectModal && (
        <ItemSelectModal
          isOpen={!!selectModal}
          onClose={() => setSelectModal(null)}
          onSelect={(value) => updateItem(selectModal.itemId, selectModal.field, value)}
          title={selectModal.title}
          items={getSelectItems(selectModal.field)}
          currentValue={masterData.find(d => d.id === selectModal.itemId)?.[selectModal.field] || ''}
        />
      )}

      {/* 리사이즈 핸들 */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

export function getSpecialCharMaster(): SpecialCharMaster[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('pfmea_special_char_master');
  return saved ? JSON.parse(saved) : [];
}

export function matchSpecialChar(charName: string, type: 'product' | 'process'): SpecialCharMaster | null {
  const masterData = getSpecialCharMaster();
  const field = type === 'product' ? 'productChar' : 'processChar';
  return masterData.find(item => item[field] === charName) || null;
}

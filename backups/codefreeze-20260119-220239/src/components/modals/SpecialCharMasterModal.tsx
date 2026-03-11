/**
 * @file SpecialCharMasterModal.tsx
 * @description 특별특성 마스터 등록/관리 모달
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';

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
  linkDFMEA: boolean;
  linkPFMEA: boolean;
  linkCP: boolean;
  linkPFD: boolean;
}

const DEFAULT_SPECIAL_CHARS: Omit<SpecialCharMaster, 'id' | 'partName' | 'processName' | 'productChar' | 'processChar'>[] = [
  { customer: '현대/기아', customerSymbol: 'IC', internalSymbol: 'SC', meaning: '중요', icon: '◆', color: '#e53935', linkDFMEA: true, linkPFMEA: true, linkCP: true, linkPFD: true },
  { customer: '현대/기아', customerSymbol: 'CC', internalSymbol: 'SC', meaning: '보안', icon: '★', color: '#d32f2f', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
  { customer: 'BMW', customerSymbol: 'BM-F', internalSymbol: 'SC', meaning: '사용자건강', icon: '▲', color: '#ff9800', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
  { customer: 'BMW', customerSymbol: 'BM-C', internalSymbol: 'SC', meaning: '규제', icon: '●', color: '#f57c00', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
  { customer: 'BMW', customerSymbol: 'BM-S', internalSymbol: 'SC', meaning: '사용자안전', icon: '◆', color: '#ef6c00', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
  { customer: 'BMW', customerSymbol: 'BM-L', internalSymbol: 'SC', meaning: '법규', icon: '■', color: '#e65100', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
  { customer: 'BMW', customerSymbol: 'BM-E', internalSymbol: 'FF', meaning: '경제적손실', icon: '○', color: '#4caf50', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
  { customer: 'FORD', customerSymbol: 'CC', internalSymbol: 'SC', meaning: '공정법규', icon: '◆', color: '#1976d2', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
  { customer: 'FORD', customerSymbol: 'OS', internalSymbol: 'SC', meaning: '작업자안전', icon: '▲', color: '#1565c0', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
  { customer: 'FORD', customerSymbol: 'YC', internalSymbol: 'SC', meaning: '법규관련', icon: '●', color: '#0d47a1', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
  { customer: 'FORD', customerSymbol: 'SC', internalSymbol: 'SC', meaning: '품질영향', icon: '■', color: '#2196f3', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
  { customer: 'FORD', customerSymbol: 'HI', internalSymbol: 'SC', meaning: '유해환경', icon: '◇', color: '#42a5f5', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
  { customer: 'FORD', customerSymbol: 'YS', internalSymbol: 'FF', meaning: '법규', icon: '○', color: '#66bb6a', linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false },
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

// 선택 모달 컴포넌트
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
  
  const filteredItems = useMemo(() => {
    if (!search) return items;
    return items.filter(item => item.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[10001] bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg w-[400px] max-h-[500px] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="bg-blue-600 text-white py-3 px-4 rounded-t-lg flex justify-between items-center">
          <span className="font-semibold text-sm">{title}</span>
          <button onClick={onClose} className="bg-transparent border-none text-white text-lg cursor-pointer">×</button>
        </div>
        
        <div className="p-3 border-b border-gray-300">
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
        <div className="p-3 border-t border-gray-300 flex gap-2">
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
      </div>
    </div>
  );
}

interface SpecialCharMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFmeaId?: string | null;  // ✅ 현재 작업 중인 FMEA ID (null도 허용)
}

export default function SpecialCharMasterModal({ isOpen, onClose, currentFmeaId }: SpecialCharMasterModalProps) {
  const [masterData, setMasterData] = useState<SpecialCharMaster[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('전체');
  const [selectModal, setSelectModal] = useState<{ itemId: string; field: 'partName' | 'processName' | 'productChar' | 'processChar'; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ✅ 탭 상태 (기호등록 / FMEA 조회)
  const [activeTab, setActiveTab] = useState<'symbol' | 'fmea'>('symbol');
  
  // ✅ FMEA ID 검색 관련 상태
  const [searchFmeaId, setSearchFmeaId] = useState<string>('');
  const [loadedFmeaIds, setLoadedFmeaIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFmeaDropdown, setShowFmeaDropdown] = useState(false);
  
  // ✅ 사용 가능한 FMEA ID 목록 (메모이제이션) - 대문자 표시
  const availableFmeaList = useMemo(() => {
    if (typeof window === 'undefined') return [];
    const fmeaIds: { id: string; name: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pfmea_worksheet_')) {
        const rawId = key.replace('pfmea_worksheet_', '');
        const fmeaId = rawId.toUpperCase(); // ✅ 대문자로 표시
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          const productName = data?.l1?.name || '';
          fmeaIds.push({ 
            id: fmeaId, 
            name: productName ? `${fmeaId} - ${productName}` : fmeaId 
          });
        } catch {
          fmeaIds.push({ id: fmeaId, name: fmeaId });
        }
      }
    }
    return fmeaIds.sort((a, b) => a.id.localeCompare(b.id));
  }, [isOpen]);
  
  // ✅ 검색어로 필터링된 FMEA 목록
  const filteredFmeaList = useMemo(() => {
    if (!searchFmeaId.trim()) return availableFmeaList;
    const search = searchFmeaId.toLowerCase();
    return availableFmeaList.filter(f => 
      f.id.toLowerCase().includes(search) || 
      f.name.toLowerCase().includes(search)
    );
  }, [availableFmeaList, searchFmeaId]);

  // FMEA 기초정보(pfmea_master_data)에서 항목 목록 가져오기
  const masterItems = useMemo(() => {
    if (typeof window === 'undefined') return { parts: [], processes: [], productChars: [], processChars: [] };
    
    const parts: string[] = [];
    const processes: string[] = [];
    const productChars: string[] = [];
    const processChars: string[] = [];
    
    // 1. FMEA 기초정보에서 데이터 로드
    try {
      const savedData = localStorage.getItem('pfmea_master_data');
      if (savedData) {
        const flatData = JSON.parse(savedData);
        
        flatData.forEach((item: any) => {
          const value = item.value?.trim();
          if (!value) return;
          
          switch (item.itemCode) {
            case 'A2': // 공정명
              // 공정번호 + 공정명 조합
              const procNo = flatData.find((d: any) => d.processNo === item.processNo && d.itemCode === 'A1')?.value || '';
              const fullName = procNo ? `${procNo}. ${value}` : value;
              if (!processes.includes(fullName)) processes.push(fullName);
              break;
            case 'A4': // 제품특성
              if (!productChars.includes(value)) productChars.push(value);
              break;
            case 'B3': // 공정특성
              if (!processChars.includes(value)) processChars.push(value);
              break;
          }
        });
      }
    } catch (e) {
      console.error('기초정보 로드 오류:', e);
    }
    
    // 2. 워크시트 데이터에서 부품명(완제품명) 로드
    try {
      const worksheetData = localStorage.getItem('pfmea_worksheet_data');
      if (worksheetData) {
        const allData = JSON.parse(worksheetData);
        Object.values(allData).forEach((data: any) => {
          // L1 완제품명
          if (data?.l1?.name && !parts.includes(data.l1.name)) {
            parts.push(data.l1.name);
          }
          // L2 공정에서도 추가
          (data?.l2 || []).forEach((proc: any) => {
            if (proc.name && !proc.name.includes('클릭')) {
              const pName = `${proc.no}. ${proc.name}`;
              if (!processes.includes(pName)) processes.push(pName);
            }
          });
        });
      }
    } catch (e) {
      console.error('워크시트 로드 오류:', e);
    }
    
    // 3. FMEA 프로젝트에서 부품명 로드
    try {
      const projects = localStorage.getItem('pfmea-projects');
      if (projects) {
        const projectList = JSON.parse(projects);
        projectList.forEach((proj: any) => {
          if (proj.partName && !parts.includes(proj.partName)) {
            parts.push(proj.partName);
          }
          if (proj.productName && !parts.includes(proj.productName)) {
            parts.push(proj.productName);
          }
        });
      }
    } catch (e) {
      console.error('프로젝트 로드 오류:', e);
    }
    
    return {
      parts: parts.sort(),
      processes: processes.sort((a, b) => {
        const numA = parseInt(a.split('.')[0]) || 0;
        const numB = parseInt(b.split('.')[0]) || 0;
        return numA - numB;
      }),
      productChars: productChars.sort(),
      processChars: processChars.sort(),
    };
  }, [isOpen]);

  // ✅ FMEA ID로 워크시트 데이터 로드하는 함수 (대소문자 구분 없이 검색)
  const loadFmeaWorksheet = useCallback((fmeaId: string): { key: string; data: any } | null => {
    if (typeof window === 'undefined' || !fmeaId) return null;
    
    // 여러 케이스 시도: 원본, 소문자, 대문자
    const keysToTry = [
      `pfmea_worksheet_${fmeaId}`,
      `pfmea_worksheet_${fmeaId.toLowerCase()}`,
      `pfmea_worksheet_${fmeaId.toUpperCase()}`,
    ];
    
    for (const key of keysToTry) {
      try {
        const rawData = localStorage.getItem(key);
        if (rawData) {
          const data = JSON.parse(rawData);
          if (data && data.l2) {
            console.log(`[특별특성 마스터] FMEA 발견: ${key}`);
            return { key, data };
          }
        }
      } catch (e) {
        console.warn('워크시트 파싱 오류:', key);
      }
    }
    
    // 패턴 매칭으로 재시도 (localStorage 전체 검색)
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith('pfmea_worksheet_')) {
        const storedFmeaId = storageKey.replace('pfmea_worksheet_', '');
        if (storedFmeaId.toLowerCase() === fmeaId.toLowerCase()) {
          try {
            const rawData = localStorage.getItem(storageKey);
            if (rawData) {
              const data = JSON.parse(rawData);
              if (data && data.l2) {
                console.log(`[특별특성 마스터] FMEA 발견 (패턴매칭): ${storageKey}`);
                return { key: storageKey, data };
              }
            }
          } catch (e) {
            console.warn('워크시트 파싱 오류:', storageKey);
          }
        }
      }
    }
    
    // 디버그: 사용 가능한 FMEA 목록 출력
    const availableFmeas: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith('pfmea_worksheet_')) {
        availableFmeas.push(storageKey.replace('pfmea_worksheet_', ''));
      }
    }
    console.log(`[특별특성 마스터] 사용 가능한 FMEA 목록:`, availableFmeas);
    
    return null;
  }, []);

  // ✅ FMEA에서 특별특성 추출하는 함수 (수정: specialChar가 있는 모든 특성 수집)
  const extractSCFromFmea = useCallback((worksheetData: { key: string; data: any }, currentData: SpecialCharMaster[]): { newItems: SpecialCharMaster[]; syncCount: number } => {
    const newItems: SpecialCharMaster[] = [];
    let syncCount = 0;
    
    const { key, data } = worksheetData;
    const rawFmeaId = key.replace('pfmea_worksheet_', '');
    const fmeaId = rawFmeaId.toUpperCase(); // ✅ 대문자로 표시
    
    console.log(`[SC추출] FMEA ${fmeaId} 분석 시작...`);
    
    // L2 공정 순회
    (data?.l2 || []).forEach((proc: any) => {
      const processName = proc.no ? `${proc.no}. ${proc.name}` : proc.name;
      if (!processName || processName.includes('클릭')) return;
      
      // ✅ 제품특성 경로: proc.functions[].productChars[] - specialChar가 있는 모든 항목
      (proc.functions || []).forEach((func: any) => {
        (func.productChars || []).forEach((pc: any) => {
          const charName = pc.name?.trim();
          if (!charName || charName.includes('클릭')) return;
          
          // ✅ specialChar 필드가 있으면 특별특성으로 간주
          const symbol = pc.specialChar;
          if (symbol && symbol !== '' && symbol !== '-') {
            const exists = [...currentData, ...newItems].some(m => m.productChar === charName && m.linkPFMEA);
            if (!exists) {
              console.log(`  [제품특성] ${charName} → ${symbol}`);
              newItems.push({
                id: `SC_FMEA_${fmeaId}_${Date.now()}_${syncCount}`,
                customer: `FMEA: ${fmeaId}`,
                customerSymbol: symbol,
                internalSymbol: symbol === 'CC' ? 'SC' : symbol,
                meaning: `제품특성 ${symbol}`,
                icon: symbol === 'CC' ? '★' : '◆',
                color: symbol === 'CC' ? '#d32f2f' : '#e53935',
                partName: data?.l1?.name || '',
                processName: processName || '',
                productChar: charName,
                processChar: '',
                linkDFMEA: false,
                linkPFMEA: true,
                linkCP: true,
                linkPFD: false,
              });
              syncCount++;
            }
          }
        });
      });
      
      // ✅ 공정특성 경로: proc.l3[].functions[].processChars[] - specialChar가 있는 모든 항목
      (proc.l3 || []).forEach((we: any) => {
        if (!we.name || we.name.includes('클릭')) return;
        
        (we.functions || []).forEach((func: any) => {
          (func.processChars || []).forEach((pc: any) => {
            const charName = pc.name?.trim();
            if (!charName || charName.includes('클릭')) return;
            
            // ✅ specialChar 필드가 있으면 특별특성으로 간주
            const symbol = pc.specialChar;
            if (symbol && symbol !== '' && symbol !== '-') {
              const exists = [...currentData, ...newItems].some(m => m.processChar === charName && m.linkPFMEA);
              if (!exists) {
                console.log(`  [공정특성] ${charName} → ${symbol}`);
                newItems.push({
                  id: `SC_FMEA_${fmeaId}_${Date.now()}_${syncCount}`,
                  customer: `FMEA: ${fmeaId}`,
                  customerSymbol: symbol,
                  internalSymbol: symbol === 'CC' ? 'SC' : symbol,
                  meaning: `공정특성 ${symbol}`,
                  icon: symbol === 'CC' ? '★' : '◆',
                  color: symbol === 'CC' ? '#d32f2f' : '#ff9800',
                  partName: data?.l1?.name || '',
                  processName: processName || '',
                  productChar: '',
                  processChar: charName,
                  linkDFMEA: false,
                  linkPFMEA: true,
                  linkCP: true,
                  linkPFD: false,
                });
                syncCount++;
              }
            }
          });
        });
      });
    });
    
    console.log(`[SC추출] FMEA ${fmeaId} 완료: ${syncCount}개 발견`);
    return { newItems, syncCount };
  }, []);

  // ✅ 사용 가능한 FMEA 목록 조회 (대문자로 반환)
  const getAvailableFmeaIds = useCallback((): string[] => {
    if (typeof window === 'undefined') return [];
    const fmeaIds: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pfmea_worksheet_')) {
        fmeaIds.push(key.replace('pfmea_worksheet_', '').toUpperCase()); // ✅ 대문자 변환
      }
    }
    return fmeaIds.sort();
  }, []);

  // ✅ FMEA ID 검색 핸들러 (직접 ID 전달 가능하도록 수정)
  const handleSearchFmea = useCallback((directFmeaId?: string) => {
    const targetId = directFmeaId || searchFmeaId.trim(); // ✅ 직접 전달된 ID 우선 사용
    
    if (!targetId) {
      // 빈 검색 시 사용 가능한 FMEA 목록 표시
      const available = getAvailableFmeaIds();
      if (available.length > 0) {
        alert(`사용 가능한 FMEA 목록:\n\n${available.join('\n')}\n\n위 ID 중 하나를 입력해주세요.`);
      } else {
        alert('저장된 FMEA 워크시트가 없습니다.\n\n먼저 FMEA 워크시트에서 데이터를 저장해주세요.');
      }
      return;
    }
    
    setIsSearching(true);
    
    const worksheetData = loadFmeaWorksheet(targetId);
    if (!worksheetData) {
      const available = getAvailableFmeaIds();
      const availableList = available.length > 0 
        ? `\n\n사용 가능한 FMEA:\n${available.slice(0, 10).join('\n')}${available.length > 10 ? `\n... 외 ${available.length - 10}개` : ''}`
        : '\n\n저장된 FMEA 워크시트가 없습니다.';
      alert(`FMEA ID "${targetId}"를 찾을 수 없습니다.${availableList}`);
      setIsSearching(false);
      return;
    }
    
    const { newItems, syncCount } = extractSCFromFmea(worksheetData, masterData);
    
    const upperFmeaId = targetId.toUpperCase(); // ✅ 대문자로 표시
    if (syncCount > 0) {
      const updatedData = [...masterData, ...newItems];
      setMasterData(updatedData);
      localStorage.setItem('pfmea_special_char_master', JSON.stringify(updatedData));
      setLoadedFmeaIds(prev => [...new Set([...prev, upperFmeaId])]);
      alert(`FMEA "${upperFmeaId}"에서 ${syncCount}건의 특별특성이 동기화되었습니다.`);
    } else {
      // 워크시트는 찾았지만 특별특성이 없는 경우
      setLoadedFmeaIds(prev => [...new Set([...prev, upperFmeaId])]);
      alert(`FMEA "${upperFmeaId}" 워크시트를 로드했습니다.\n\n현재 등록된 특별특성이 없습니다.\n워크시트에서 제품특성/공정특성에 SC를 지정하면 자동 동기화됩니다.`);
    }
    
    setIsSearching(false);
    setSearchFmeaId('');
  }, [searchFmeaId, masterData, loadFmeaWorksheet, extractSCFromFmea, getAvailableFmeaIds]);

  useEffect(() => {
    if (!isOpen) return;
    const saved = localStorage.getItem('pfmea_special_char_master');
    let currentData: SpecialCharMaster[] = [];
    
    if (saved) {
      currentData = JSON.parse(saved);
    } else {
      currentData = DEFAULT_SPECIAL_CHARS.map((item, idx) => ({
        ...item, id: `SC_${idx + 1}`, partName: '', processName: '', productChar: '', processChar: '',
      }));
    }
    
    // ✅ 현재 작업 중인 FMEA만 자동 동기화 (성능 최적화)
    try {
      let syncCount = 0;
      
      if (currentFmeaId) {
        const worksheetData = loadFmeaWorksheet(currentFmeaId);
        if (worksheetData) {
          const upperFmeaId = currentFmeaId.toUpperCase(); // ✅ 대문자로 표시
          console.log(`[특별특성 마스터] 현재 FMEA 동기화: ${upperFmeaId}`);
          const { newItems, syncCount: count } = extractSCFromFmea(worksheetData, currentData);
          if (count > 0) {
            currentData = [...currentData, ...newItems];
            syncCount = count;
            setLoadedFmeaIds([upperFmeaId]);
          }
        }
      }
      
      if (syncCount > 0) {
        console.log(`[특별특성 마스터] 현재 FMEA에서 ${syncCount}건 동기화`);
      } else {
        console.log('[특별특성 마스터] 동기화할 특별특성 없음');
      }
    } catch (e) {
      console.error('FMEA 분석 결과 동기화 오류:', e);
    }
    
    setMasterData(currentData);
    localStorage.setItem('pfmea_special_char_master', JSON.stringify(currentData));
  }, [isOpen, currentFmeaId, loadFmeaWorksheet, extractSCFromFmea]);

  const saveData = useCallback((data: SpecialCharMaster[]) => {
    setMasterData(data);
    localStorage.setItem('pfmea_special_char_master', JSON.stringify(data));
  }, []);

  const toggleLink = useCallback((id: string, field: 'linkDFMEA' | 'linkPFMEA' | 'linkCP' | 'linkPFD') => {
    saveData(masterData.map(item => item.id === id ? { ...item, [field]: !item[field] } : item));
  }, [masterData, saveData]);

  const updateItem = useCallback((id: string, field: keyof SpecialCharMaster, value: string) => {
    saveData(masterData.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, [masterData, saveData]);

  const addNewItem = useCallback(() => {
    const newItem: SpecialCharMaster = {
      id: `SC_${Date.now()}`, customer: '신규', customerSymbol: '', internalSymbol: 'SC', meaning: '',
      icon: '●', color: '#9e9e9e', partName: '', processName: '', productChar: '', processChar: '',
      linkDFMEA: false, linkPFMEA: false, linkCP: false, linkPFD: false,
    };
    saveData([...masterData, newItem]);
  }, [masterData, saveData]);

  const deleteItem = useCallback((id: string) => {
    if (confirm('삭제하시겠습니까?')) saveData(masterData.filter(item => item.id !== id));
  }, [masterData, saveData]);

  const handleExport = useCallback(() => {
    const exportData = masterData.map(item => ({
      '고객': item.customer, '고객기호': item.customerSymbol, '자사표시': item.internalSymbol, '구분': item.meaning,
      '아이콘': item.icon || '', '색상': item.color, '부품': item.partName || '', '공정': item.processName || '',
      '제품특성': item.productChar || '', '공정특성': item.processChar || '',
      'D-FMEA': item.linkDFMEA ? 'Y' : '', 'P-FMEA': item.linkPFMEA ? 'Y' : '', 'CP': item.linkCP ? 'Y' : '', 'PFD': item.linkPFD ? 'Y' : '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '특별특성');
    ws['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 6 }];
    XLSX.writeFile(wb, `특별특성_마스터_${new Date().toISOString().slice(0,10)}.xlsx`);
  }, [masterData]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const importedData: SpecialCharMaster[] = jsonData.map((row: any, idx) => ({
        id: `SC_${Date.now()}_${idx}`, customer: row['고객'] || '', customerSymbol: row['고객기호'] || '',
        internalSymbol: row['자사표시'] || 'SC', meaning: row['구분'] || '', icon: row['아이콘'] || '●', color: row['색상'] || '#9e9e9e',
        partName: row['부품'] || '', processName: row['공정'] || '', productChar: row['제품특성'] || '', processChar: row['공정특성'] || '',
        linkDFMEA: row['D-FMEA'] === 'Y', linkPFMEA: row['P-FMEA'] === 'Y', linkCP: row['CP'] === 'Y', linkPFD: row['PFD'] === 'Y',
      }));
      saveData(importedData);
      alert(`${importedData.length}개 항목을 가져왔습니다.`);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  }, [saveData]);

  const getSelectItems = (field: string) => {
    switch (field) {
      case 'partName': return masterItems.parts;
      case 'processName': return masterItems.processes;
      case 'productChar': return masterItems.productChars;
      case 'processChar': return masterItems.processChars;
      default: return [];
    }
  };

  const customers = ['전체', ...new Set(masterData.map(d => d.customer))];
  const filteredData = selectedCustomer === '전체' ? masterData : masterData.filter(d => d.customer === selectedCustomer);

  if (!isOpen) return null;

  // 선택 버튼 컴포넌트
  const SelectButton = ({ itemId, field, value, title }: { itemId: string; field: 'partName' | 'processName' | 'productChar' | 'processChar'; value: string; title: string }) => (
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

  // 탭 스타일
  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 24px',
    border: 'none',
    borderBottom: isActive ? '3px solid #2e7d32' : '3px solid transparent',
    background: isActive ? '#e8f5e9' : 'transparent',
    color: isActive ? '#2e7d32' : '#666',
    fontSize: '13px',
    fontWeight: isActive ? 700 : 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]" onClick={onClose}>
      <div className="bg-white rounded-lg w-[98%] max-w-[1400px] max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* 헤더 */}
        <div className="text-white py-3 px-5 flex justify-between items-center" style={headerGradientStyle}>
          <h3 className="m-0 text-[15px] font-bold">★ 특별특성 마스터 등록</h3>
          <button onClick={onClose} className="bg-white/20 border-none text-white w-7 h-7 rounded-full cursor-pointer text-base">×</button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-300 bg-white">
          <button onClick={() => setActiveTab('symbol')} style={tabStyle(activeTab === 'symbol')}>
            📋 기호등록
          </button>
          <button onClick={() => setActiveTab('fmea')} style={tabStyle(activeTab === 'fmea')}>
            🔍 FMEA 조회
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 px-4">
            <button onClick={handleExport} className="py-1.5 px-3 bg-blue-700 text-white border-none rounded text-xs cursor-pointer">📥 Export</button>
            <button onClick={() => fileInputRef.current?.click()} className="py-1.5 px-3 bg-orange-500 text-white border-none rounded text-xs cursor-pointer">📤 Import</button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button onClick={() => { saveData(masterData); alert('저장되었습니다.'); onClose(); }} className="py-1.5 px-4 bg-green-800 text-white border-none rounded text-xs cursor-pointer font-semibold">💾 저장</button>
            <button onClick={onClose} className="py-1.5 px-3 bg-gray-500 text-white border-none rounded text-xs cursor-pointer">취소</button>
          </div>
        </div>

        {/* ===== 탭 1: 기호등록 ===== */}
        {activeTab === 'symbol' && (
          <>
            <div className="py-2 px-4 bg-green-50 border-b border-gray-300 flex gap-2 items-center flex-wrap">
              <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="py-1.5 px-2.5 border border-gray-300 rounded text-xs">
                {customers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={addNewItem} className="py-1.5 px-3 bg-green-600 text-white border-none rounded text-xs cursor-pointer font-semibold">+ 신규 기호</button>
              <span className="text-[11px] text-gray-600 ml-1">총 {filteredData.length}개</span>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-[1]">
                  <tr className="bg-green-100">
                    <th className="p-2 border border-green-300 text-[11px] font-semibold text-center w-24">고객</th>
                    <th className="p-2 border border-green-300 text-[11px] font-semibold text-center w-20">기호</th>
                    <th className="p-2 border border-green-300 text-[11px] font-semibold text-center w-20">고객기호</th>
                    <th className="p-2 border border-green-300 text-[11px] font-semibold text-center w-16">자사</th>
                    <th className="p-2 border border-green-300 text-[11px] font-semibold text-center w-24">구분</th>
                    <th className="p-2 border border-green-300 text-[11px] font-semibold text-center w-16">아이콘</th>
                    <th className="p-2 border border-green-300 text-[11px] font-semibold text-center w-20">색상</th>
                    <th className="p-2 border border-green-300 text-[11px] font-semibold text-center w-16">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(item => (
                    <tr key={item.id} className="bg-white hover:bg-green-50">
                      <td style={STYLES.td}>
                        <input type="text" value={item.customer} onChange={e => updateItem(item.id, 'customer', e.target.value)} className="w-full py-1 px-1.5 border border-gray-300 rounded text-[11px]" />
                      </td>
                      <td className="p-1 border border-gray-300 text-center">
                        <span style={{ ...STYLES.badge, background: item.color }}>{item.icon} {item.customerSymbol || '?'}</span>
                      </td>
                      <td style={STYLES.td}>
                        <input type="text" value={item.customerSymbol} onChange={e => updateItem(item.id, 'customerSymbol', e.target.value)} className="w-full py-1 px-1.5 border border-gray-300 rounded text-[11px] text-center" />
                      </td>
                      <td className="p-1 border border-gray-300 text-center">
                        <select value={item.internalSymbol} onChange={e => updateItem(item.id, 'internalSymbol', e.target.value)} className="py-0.5 px-1 border border-gray-300 rounded text-[10px]">
                          <option value="SC">SC</option>
                          <option value="FF">FF</option>
                        </select>
                      </td>
                      <td style={STYLES.td}>
                        <input type="text" value={item.meaning} onChange={e => updateItem(item.id, 'meaning', e.target.value)} className="w-full py-1 px-1.5 border border-gray-300 rounded text-[11px]" />
                      </td>
                      <td style={STYLES.td}>
                        <select value={item.icon || '●'} onChange={e => updateItem(item.id, 'icon', e.target.value)} className="w-full py-1 border border-gray-300 rounded text-[12px] text-center">
                          <option value="●">●</option>
                          <option value="◆">◆</option>
                          <option value="★">★</option>
                          <option value="▲">▲</option>
                          <option value="■">■</option>
                          <option value="◇">◇</option>
                          <option value="○">○</option>
                        </select>
                      </td>
                      <td style={STYLES.td}>
                        <input type="color" value={item.color} onChange={e => updateItem(item.id, 'color', e.target.value)} className="w-full h-6 border border-gray-300 rounded cursor-pointer" />
                      </td>
                      <td className="p-1 border border-gray-300 text-center">
                        <button onClick={() => deleteItem(item.id)} className="py-1 px-2 bg-red-500 text-white border-none rounded text-[10px] cursor-pointer">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 bg-green-50 border-t border-gray-300">
              <span className="text-[11px] text-green-700">💡 SC: Safety/Critical | FF: Fit/Function | 고객별 특별특성 기호를 등록하세요</span>
            </div>
          </>
        )}

        {/* ===== 탭 2: FMEA 조회 ===== */}
        {activeTab === 'fmea' && (
          <>
            <div className="py-2 px-4 bg-blue-50 border-b border-gray-300 flex gap-2 items-center flex-wrap">
              <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="py-1.5 px-2.5 border border-gray-300 rounded text-xs">
                {customers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              
              {/* FMEA ID 검색 영역 (드롭다운 콤보박스) */}
              <div className="relative flex items-center gap-1 bg-white border border-purple-300 rounded px-2 py-0.5">
                <span className="text-[10px] text-purple-700 font-semibold whitespace-nowrap">🔍 FMEA ID:</span>
                <div className="relative">
                  <input 
                    type="text" 
                    value={searchFmeaId} 
                    onChange={(e) => setSearchFmeaId(e.target.value)}
                    onFocus={() => setShowFmeaDropdown(true)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchFmea()}
                    placeholder={currentFmeaId || 'FMEA ID 검색/선택'}
                    className="w-[160px] py-1 px-2 border-none text-xs outline-none bg-transparent"
                  />
                  <button 
                    onClick={() => setShowFmeaDropdown(!showFmeaDropdown)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-600"
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
                        📋 등록된 FMEA ({availableFmeaList.length}개)
                      </div>
                      {filteredFmeaList.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500">검색 결과 없음</div>
                      ) : (
                        filteredFmeaList.map((fmea, idx) => (
                          <div
                            key={fmea.id}
                            onClick={() => {
                              setShowFmeaDropdown(false);
                              setSearchFmeaId(fmea.id);
                              // ✅ 선택 즉시 검색 실행 - ID 직접 전달로 상태 타이밍 문제 해결
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
                            {fmea.id.toLowerCase() === currentFmeaId?.toLowerCase() && <span className="ml-1 text-green-600">✓ 현재</span>}
                            {loadedFmeaIds.some(id => id.toLowerCase() === fmea.id.toLowerCase()) && fmea.id.toLowerCase() !== currentFmeaId?.toLowerCase() && (
                              <span className="ml-1 text-blue-500">✓ 로드됨</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => handleSearchFmea()} 
                  disabled={isSearching}
                  className="py-1 px-3 bg-purple-600 text-white border-none rounded text-[10px] cursor-pointer font-semibold disabled:bg-gray-400"
                >
                  {isSearching ? '...' : '검색'}
                </button>
              </div>
              
              {/* 현재 로드된 FMEA 표시 */}
              {currentFmeaId && (
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded border border-green-300">
                  현재: {currentFmeaId.toUpperCase()}
                </span>
              )}
              {loadedFmeaIds.length > 0 && (
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  동기화: {loadedFmeaIds.join(', ')}
                </span>
              )}
              
              <span className="text-[11px] text-gray-600 ml-1">총 {filteredData.length}개</span>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse min-w-[1100px]">
                <thead className="sticky top-0 z-[1]">
                  <tr className="bg-blue-100">
                    <th className="p-2 border border-blue-300 text-[11px] font-semibold text-center w-16">기호</th>
                    <th className="p-2 border border-blue-300 text-[11px] font-semibold text-center w-20">고객</th>
                    <th className="p-2 border border-blue-300 text-[11px] font-semibold text-center bg-blue-200 w-[100px]">부품</th>
                    <th className="p-2 border border-blue-300 text-[11px] font-semibold text-center bg-blue-200 w-[120px]">공정</th>
                    <th className="p-2 border border-blue-300 text-[11px] font-semibold text-center bg-blue-200 w-[160px]">제품특성</th>
                    <th className="p-2 border border-blue-300 text-[11px] font-semibold text-center bg-blue-200 w-[160px]">공정특성</th>
                    <th className="p-2 border border-blue-300 text-[11px] font-semibold text-center bg-purple-200 w-[55px]">D-FMEA</th>
                    <th className="p-2 border border-blue-300 text-[11px] font-semibold text-center bg-purple-200 w-[55px]">P-FMEA</th>
                    <th className="p-2 border border-blue-300 text-[11px] font-semibold text-center bg-purple-200 w-10">CP</th>
                    <th className="p-2 border border-blue-300 text-[11px] font-semibold text-center bg-purple-200 w-10">PFD</th>
                    <th className="p-2 border border-blue-300 text-[11px] font-semibold text-center bg-gray-200 w-16">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(item => (
                    <tr key={item.id} className="bg-white hover:bg-blue-50">
                      <td className="p-1 border border-gray-300 text-center">
                        <span style={{ ...STYLES.badge, background: item.color }}>{item.icon} {item.customerSymbol || '?'}</span>
                      </td>
                      <td className="p-1 border border-gray-300 text-[11px] text-center">{item.customer}</td>
                      <td style={STYLES.td}><SelectButton itemId={item.id} field="partName" value={item.partName || ''} title="부품 선택" /></td>
                      <td style={STYLES.td}><SelectButton itemId={item.id} field="processName" value={item.processName || ''} title="공정 선택" /></td>
                      <td style={STYLES.td}><SelectButton itemId={item.id} field="productChar" value={item.productChar || ''} title="제품특성 선택" /></td>
                      <td style={STYLES.td}><SelectButton itemId={item.id} field="processChar" value={item.processChar || ''} title="공정특성 선택" /></td>
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
                        <button onClick={() => deleteItem(item.id)} className="py-1 px-2 bg-red-500 text-white border-none rounded text-[10px] cursor-pointer">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 bg-blue-50 border-t border-gray-300">
              <span className="text-[11px] text-blue-700">💡 FMEA ID를 검색하여 해당 FMEA의 특별특성을 조회/연동하세요. 연동 시 해당 문서에 자동 표시됩니다.</span>
            </div>
          </>
        )}
      </div>

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

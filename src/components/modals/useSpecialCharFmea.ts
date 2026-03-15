/**
 * @file useSpecialCharFmea.ts
 * @description 특별특성 마스터 모달 - FMEA 동기화/검색 로직 hook
 * SpecialCharMasterModal.tsx에서 분리 (922→570행 목표)
 */

// CODEFREEZE: DB Only 정책 적용 완료 (2026-02-16) - localStorage pfmea_master_data 폴백 제거
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SpecialCharMaster } from './SpecialCharMasterModal';

interface UseSpecialCharFmeaParams {
  isOpen: boolean;
  currentFmeaId?: string | null;
  masterData: SpecialCharMaster[];
  setMasterData: React.Dispatch<React.SetStateAction<SpecialCharMaster[]>>;
  saveData: (data: SpecialCharMaster[]) => void;
}

/**
 * FMEA ID로 워크시트 데이터 로드 (대소문자 구분 없이 검색)
 */
function loadFmeaWorksheet(fmeaId: string): { key: string; data: any } | null {
  if (typeof window === 'undefined' || !fmeaId) return null;

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
        if (data && data.l2) return { key, data };
      }
    } catch { /* parse error */ }
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
            if (data && data.l2) return { key: storageKey, data };
          }
        } catch { /* parse error */ }
      }
    }
  }

  return null;
}

/**
 * FMEA에서 특별특성 추출 (specialChar가 있는 모든 특성 수집)
 */
function extractSCFromFmea(
  worksheetData: { key: string; data: any },
  currentData: SpecialCharMaster[]
): { newItems: SpecialCharMaster[]; syncCount: number } {
  const newItems: SpecialCharMaster[] = [];
  let syncCount = 0;

  const { key, data } = worksheetData;
  const rawFmeaId = key.replace('pfmea_worksheet_', '');
  const fmeaId = rawFmeaId.toUpperCase();

  // L2 공정 순회
  (data?.l2 || []).forEach((proc: any) => {
    const processName = proc.no ? `${proc.no}. ${proc.name}` : proc.name;
    if (!processName || processName.includes('클릭')) return;

    // 제품특성: proc.functions[].productChars[]
    (proc.functions || []).forEach((func: any) => {
      (func.productChars || []).forEach((pc: any) => {
        const charName = pc.name?.trim();
        if (!charName || charName.includes('클릭')) return;

        const symbol = pc.specialChar;
        if (symbol && symbol !== '' && symbol !== '-') {
          const exists = [...currentData, ...newItems].some(m => m.productChar === charName && m.linkPFMEA);
          if (!exists) {
            newItems.push({
              id: `SC_FMEA_${fmeaId}_${Date.now()}_${syncCount}`,
              customer: `FMEA: ${fmeaId}`,
              customerSymbol: symbol,
              internalSymbol: symbol,
              meaning: `제품특성 ${symbol}`,
              icon: symbol,
              color: symbol === '★' ? '#e65100' : symbol === '◇' ? '#00838f' : '#9e9e9e',
              partName: data?.l1?.name || '',
              processName: processName || '',
              productChar: charName,
              processChar: '',
              linkDFMEA: false, linkPFMEA: true, linkCP: true, linkPFD: false,
            });
            syncCount++;
          }
        }
      });
    });

    // 고장형태(FM): proc.functions[].productChars[].failureModes[]
    (proc.functions || []).forEach((func: any) => {
      (func.productChars || []).forEach((pc: any) => {
        (pc.failureModes || []).forEach((fm: any) => {
          const fmName = fm.name?.trim();
          if (!fmName || fmName.includes('클릭')) return;

          const symbol = fm.specialChar;
          if (symbol && symbol !== '' && symbol !== '-') {
            const exists = [...currentData, ...newItems].some(m => m.failureMode === fmName && m.linkPFMEA);
            if (!exists) {
              newItems.push({
                id: `SC_FMEA_${fmeaId}_${Date.now()}_${syncCount}`,
                customer: `FMEA: ${fmeaId}`,
                customerSymbol: symbol,
                internalSymbol: symbol,
                meaning: `고장형태 ${symbol}`,
                icon: symbol === '★' ? '★' : symbol === '◇' ? '◇' : '◆',
                color: symbol === '★' ? '#e65100' : symbol === '◇' ? '#00838f' : '#d32f2f',
                partName: data?.l1?.name || '',
                processName: processName || '',
                productChar: '',
                processChar: '',
                failureMode: fmName,
                linkDFMEA: false, linkPFMEA: true, linkCP: true, linkPFD: false,
              });
              syncCount++;
            }
          }
        });
      });
    });

    // 공정특성: proc.l3[].functions[].processChars[]
    (proc.l3 || []).forEach((we: any) => {
      if (!we.name || we.name.includes('클릭')) return;

      (we.functions || []).forEach((func: any) => {
        (func.processChars || []).forEach((pc: any) => {
          const charName = pc.name?.trim();
          if (!charName || charName.includes('클릭')) return;

          const symbol = pc.specialChar;
          if (symbol && symbol !== '' && symbol !== '-') {
            const exists = [...currentData, ...newItems].some(m => m.processChar === charName && m.linkPFMEA);
            if (!exists) {
              newItems.push({
                id: `SC_FMEA_${fmeaId}_${Date.now()}_${syncCount}`,
                customer: `FMEA: ${fmeaId}`,
                customerSymbol: symbol,
                internalSymbol: symbol,
                meaning: `공정특성 ${symbol}`,
                icon: symbol,
                color: symbol === '★' ? '#e65100' : symbol === '◇' ? '#00838f' : '#9e9e9e',
                partName: data?.l1?.name || '',
                processName: processName || '',
                productChar: '',
                processChar: charName,
                linkDFMEA: false, linkPFMEA: true, linkCP: true, linkPFD: false,
              });
              syncCount++;
            }
          }
        });
      });
    });
  });

  return { newItems, syncCount };
}

/**
 * 사용 가능한 FMEA ID 목록 조회
 */
function getAvailableFmeaIds(): string[] {
  if (typeof window === 'undefined') return [];
  const fmeaIds: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('pfmea_worksheet_')) {
      fmeaIds.push(key.replace('pfmea_worksheet_', '').toUpperCase());
    }
  }
  return fmeaIds.sort();
}

export function useSpecialCharFmea({
  isOpen, currentFmeaId, masterData, setMasterData, saveData,
}: UseSpecialCharFmeaParams) {
  const [searchFmeaId, setSearchFmeaId] = useState('');
  const [loadedFmeaIds, setLoadedFmeaIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFmeaDropdown, setShowFmeaDropdown] = useState(false);

  // 사용 가능한 FMEA ID 목록 (대문자 표시)
  const availableFmeaList = useMemo(() => {
    if (typeof window === 'undefined') return [];
    const fmeaIds: { id: string; name: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pfmea_worksheet_')) {
        const rawId = key.replace('pfmea_worksheet_', '');
        const fmeaId = rawId.toUpperCase();
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          const productName = data?.l1?.name || '';
          fmeaIds.push({
            id: fmeaId,
            name: productName ? `${fmeaId} - ${productName}` : fmeaId,
          });
        } catch {
          fmeaIds.push({ id: fmeaId, name: fmeaId });
        }
      }
    }
    return fmeaIds.sort((a, b) => a.id.localeCompare(b.id));
  }, [isOpen]);

  // 검색어 필터링된 FMEA 목록
  const filteredFmeaList = useMemo(() => {
    if (!searchFmeaId.trim()) return availableFmeaList;
    const search = searchFmeaId.toLowerCase();
    return availableFmeaList.filter(f =>
      f.id.toLowerCase().includes(search) || f.name.toLowerCase().includes(search)
    );
  }, [availableFmeaList, searchFmeaId]);

  // FMEA 기초정보에서 항목 목록 가져오기
  const masterItems = useMemo(() => {
    if (typeof window === 'undefined') return { parts: [] as string[], processes: [] as string[], productChars: [] as string[], processChars: [] as string[], failureModes: [] as string[] };

    const parts: string[] = [];
    const processes: string[] = [];
    const productChars: string[] = [];
    const processChars: string[] = [];
    const failureModes: string[] = [];

    // ★★★ 2026-02-16: localStorage 폴백 제거 (DB Only 정책) ★★★
    // pfmea_master_data localStorage 읽기 삭제됨 - DB API에서만 로드

    // 2. 워크시트 데이터에서 부품명 로드
    try {
      const worksheetData = localStorage.getItem('pfmea_worksheet_data');
      if (worksheetData) {
        const allData = JSON.parse(worksheetData);
        Object.values(allData).forEach((data: any) => {
          if (data?.l1?.name && !parts.includes(data.l1.name)) parts.push(data.l1.name);
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
          if (proj.partName && !parts.includes(proj.partName)) parts.push(proj.partName);
          if (proj.productName && !parts.includes(proj.productName)) parts.push(proj.productName);
        });
      }
    } catch (e) {
      console.error('프로젝트 로드 오류:', e);
    }

    // 워크시트에서 고장형태(FM) 목록 추출
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pfmea_worksheet_')) {
          const rawData = localStorage.getItem(key);
          if (rawData) {
            const data = JSON.parse(rawData);
            (data?.l2 || []).forEach((proc: any) => {
              (proc.functions || []).forEach((func: any) => {
                (func.productChars || []).forEach((pc: any) => {
                  (pc.failureModes || []).forEach((fm: any) => {
                    const fmName = fm.name?.trim();
                    if (fmName && !fmName.includes('클릭') && !failureModes.includes(fmName)) {
                      failureModes.push(fmName);
                    }
                  });
                });
              });
            });
          }
        }
      }
    } catch (e) {
      console.error('고장형태 로드 오류:', e);
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
      failureModes: failureModes.sort(),
    };
  }, [isOpen]);

  // FMEA ID 검색 핸들러
  const handleSearchFmea = useCallback((directFmeaId?: string) => {
    const targetId = directFmeaId || searchFmeaId.trim();

    if (!targetId) {
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
    const upperFmeaId = targetId.toUpperCase();

    if (syncCount > 0) {
      const updatedData = [...masterData, ...newItems];
      setMasterData(updatedData);
      localStorage.setItem('pfmea_special_char_master', JSON.stringify(updatedData));
      setLoadedFmeaIds(prev => [...new Set([...prev, upperFmeaId])]);
      alert(`FMEA "${upperFmeaId}"에서 ${syncCount}건의 특별특성이 동기화되었습니다.`);
    } else {
      setLoadedFmeaIds(prev => [...new Set([...prev, upperFmeaId])]);
      alert(`FMEA "${upperFmeaId}" 워크시트를 로드했습니다.\n\n현재 등록된 특별특성이 없습니다.\n워크시트에서 제품특성/공정특성에 SC를 지정하면 자동 동기화됩니다.`);
    }

    setIsSearching(false);
    setSearchFmeaId('');
  }, [searchFmeaId, masterData, setMasterData]);

  // 모달 오픈 시 자동 동기화
  useEffect(() => {
    if (!isOpen) return;

    try {
      if (currentFmeaId) {
        const worksheetData = loadFmeaWorksheet(currentFmeaId);
        if (worksheetData) {
          const upperFmeaId = currentFmeaId.toUpperCase();
          const { newItems, syncCount } = extractSCFromFmea(worksheetData, masterData);
          if (syncCount > 0) {
            const updated = [...masterData, ...newItems];
            setMasterData(updated);
            localStorage.setItem('pfmea_special_char_master', JSON.stringify(updated));
            setLoadedFmeaIds([upperFmeaId]);
          }
        }
      }
    } catch (e) {
      console.error('FMEA 분석 결과 동기화 오류:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentFmeaId]);

  return {
    searchFmeaId, setSearchFmeaId,
    loadedFmeaIds, setLoadedFmeaIds,
    isSearching, showFmeaDropdown, setShowFmeaDropdown,
    availableFmeaList, filteredFmeaList, masterItems,
    handleSearchFmea,
  };
}

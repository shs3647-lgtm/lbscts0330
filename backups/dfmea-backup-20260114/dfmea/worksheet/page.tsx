'use client';

/**
 * @file page.tsx
 * @description FMEA 워크시트 메인 페이지
 * @author AI Assistant
 * @created 2025-12-27
 * @refactored 모듈화 - constants, hooks, tabs 분리
 */

import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import ProcessSelectModal from './ProcessSelectModal';
import WorkElementSelectModal from './WorkElementSelectModal';
import DFMEATopNav from '@/components/layout/DFMEATopNav';

// 모듈화된 상수, hooks, 탭 컴포넌트
import { COLORS, uid, getTabLabel, WorksheetState, WorkElement, Process, get4MBadgeStyle } from './constants';
import { useWorksheetState } from './hooks';
import { 
  StructureTab, StructureColgroup, StructureHeader, StructureRow,
  FunctionTab, FunctionColgroup, FunctionHeader, FunctionRow,
  FailureTab, FailureColgroup, FailureHeader, FailureRow,
  RiskTab, RiskHeader, RiskRow,
  OptTab, OptHeader, OptRow,
  DocTab, DocHeader, DocRow,
} from './tabs';
import { FailureTab as FailureTabNew } from './tabs/failure';
import { dynamicBgStyle } from './PageStyles';
import { 
  exportFMEAWorksheet, 
  exportStructureAnalysis, 
  importStructureAnalysis,
  exportAllViewExcel,
  exportFunctionL1,
  exportFunctionL2,
  exportFunctionL3,
  downloadStructureTemplate 
} from './excel-export';
import SpecialCharMasterModal from '@/components/modals/SpecialCharMasterModal';
import SODMasterModal from '@/components/modals/SODMasterModal';
import APTableModal from '@/components/modals/APTableModal';
// 유틸리티 함수 import
import { 
  groupFailureLinksWithFunctionData,
  groupByProcessName,
  calculateLastRowMerge,
  type FMGroup
} from './utils';

// 분리된 UI 컴포넌트 import
import TopMenuBar from './components/TopMenuBar';
import TabMenu from './components/TabMenu';
import APTableInline from './components/APTableInline';
import AllTabRenderer from './tabs/all/AllTabRenderer';
import { 
  getStepNumber, 
  StructureTabFull, 
  FunctionTabFull, 
  FailureTabFull, 
  DocTabFull 
} from './components/TabFullComponents';
import { getPanelById } from './panels';

/**
 * FMEA 워크시트 메인 페이지 컨텐츠
 */
function FMEAWorksheetPageContent() {
  const router = useRouter();
  
  // 워크시트 상태 관리 Hook
  const {
    state,
    setState,
    dirty,
    setDirty,
    isSaving,
    lastSaved,
    fmeaList,
    currentFmea,
    selectedFmeaId,
    handleFmeaChange,
    rows,
    l1Spans,
    l1TypeSpans,
    l1FuncSpans,
    l2Spans,
    saveToLocalStorage,
    handleInputKeyDown,
    handleInputBlur,
    handleSelect,
    addL2,
  } = useWorksheetState();
  
  // 모달 상태
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isWorkElementModalOpen, setIsWorkElementModalOpen] = useState(false);
  const [isSpecialCharModalOpen, setIsSpecialCharModalOpen] = useState(false);
  const [isSODModalOpen, setIsSODModalOpen] = useState(false);
  const [showAPModal, setShowAPModal] = useState(false);
  const [show6APModal, setShow6APModal] = useState(false);
  const [targetL2Id, setTargetL2Id] = useState<string | null>(null);
  
  // 우측 패널 활성화 상태
  const [activePanelId, setActivePanelId] = useState<string>('tree');
  
  // 트리 접기/펼치기 상태
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  
  // 전체보기 탭의 AP 테이블 표시 상태
  const [showAPInAll, setShowAPInAll] = useState(false);
  const [apStageInAll, setApStageInAll] = useState<5 | 6>(5);
  
  const toggleCollapse = useCallback((procId: string) => {
    setCollapsedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(procId)) {
        newSet.delete(procId);
      } else {
        newSet.add(procId);
      }
      return newSet;
    });
  }, []);

  // Import 모달 상태
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // 구조분석 Import 핸들러
  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportMessage(null);
    const result = await importStructureAnalysis(file, setState, setDirty);
    
    setImportMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    });

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 3초 후 메시지 숨기기
    setTimeout(() => setImportMessage(null), 3000);
  }, [setState, setDirty]);

  // 구조분석 Export 핸들러
  const handleStructureExport = useCallback(async () => {
    const fmeaName = currentFmea?.fmeaInfo?.subject || currentFmea?.project?.productName || 'PFMEA';
    await exportStructureAnalysis(state, fmeaName);
  }, [state, currentFmea]);

  // 템플릿 다운로드 핸들러
  const handleDownloadTemplate = useCallback(async () => {
    await downloadStructureTemplate();
  }, []);

  // 구조분석 누락 건수 계산
  const calculateStructureMissing = useCallback(() => {
    let count = 0;
    
    // 완제품명 누락
    if (!state.l1.name || state.l1.name.trim() === '') count++;
    
    // 공정 및 작업요소 검사
    state.l2.forEach(proc => {
      const procName = proc.name || '';
      if (!procName || procName.includes('클릭') || procName.includes('선택')) count++;
      
      proc.l3.forEach(we => {
        const weName = we.name || '';
        if (!weName || weName.includes('클릭') || weName.includes('추가') || weName.includes('필요') || weName.includes('선택')) count++;
      });
    });
    
    return count;
  }, [state.l1.name, state.l2]);

  // 공정 모달 저장 핸들러
  const handleProcessSave = useCallback((selectedProcesses: { no: string; name: string }[]) => {
    console.log('[공정저장] 선택된 공정:', selectedProcesses.map(p => `${p.no}:${p.name}`));
    
    setState(prev => {
      const selectedNames = selectedProcesses.map(p => p.name);
      console.log('[공정저장] 선택된 이름들:', selectedNames);
      console.log('[공정저장] 기존 l2:', prev.l2.map(p => `${p.no}:${p.name}`));
      
      const keepL2 = prev.l2.filter(p => !p.name.includes('클릭') && selectedNames.includes(p.name));
      const keepNames = keepL2.map(p => p.name);
      console.log('[공정저장] 유지할 공정:', keepNames);
      
      // 선택된 순서대로 처리 (기존 유지 또는 신규 생성)
      const finalL2: Process[] = selectedProcesses.map((p, idx) => {
        // 기존에 있으면 유지
        const existing = prev.l2.find(e => e.name === p.name && !e.name.includes('클릭'));
        if (existing) {
          console.log('[공정저장] 기존 유지:', p.name);
          return { ...existing, no: p.no, order: (idx + 1) * 10 };
        }
        // 없으면 새로 생성
        console.log('[공정저장] 신규 생성:', p.name);
        return {
          id: uid(),
          no: p.no,
          name: p.name,
          order: (idx + 1) * 10,
          functions: [],
          productChars: [],
          l3: [{ id: uid(), m4: '', name: '(클릭하여 작업요소 추가)', order: 10, functions: [], processChars: [] }]
        };
      });
      
      // 빈 경우 기본 항목 추가
      if (finalL2.length === 0) {
        finalL2.push({
          id: uid(),
          no: '',
          name: '(클릭하여 공정 선택)',
          order: 10,
          functions: [],
          productChars: [],
          l3: [{ id: uid(), m4: '', name: '(공정 선택 후 작업요소 추가)', order: 10, functions: [], processChars: [] }]
        });
      }
      
      console.log('[공정저장] 최종 l2:', finalL2.map(p => `${p.no}:${p.name}`));
      return { ...prev, l2: finalL2 };
    });
    setDirty(true);
  }, [setState, setDirty]);

  // 작업요소 모달 저장 핸들러 (2개 이상이면 행 삭제 가능, 1개면 내용만 삭제)
  const handleWorkElementSelect = useCallback((selectedElements: { id: string; m4: string; name: string }[]) => {
    console.log('[저장] targetL2Id:', targetL2Id);
    console.log('[저장] 선택된 항목:', selectedElements.map(e => `${e.m4}:${e.name}`));
    
    if (!targetL2Id) {
      console.log('[저장] targetL2Id 없음 - 중단');
      return;
    }
    
    // 중복 제거 (이름 기준)
    const uniqueElements = selectedElements.filter((e, idx, arr) => 
      arr.findIndex(x => x.name === e.name) === idx
    );
    console.log('[저장] 중복제거 후:', uniqueElements.map(e => `${e.m4}:${e.name}`));
    
    setState(prev => {
      const proc = prev.l2.find(p => p.id === targetL2Id);
      console.log('[저장] 현재 공정:', proc?.name, '현재 l3:', proc?.l3.map(w => `${w.m4}:${w.name}`));
      
      const newL2 = prev.l2.map(proc => {
        if (proc.id !== targetL2Id) return proc;
        
        const existingCount = proc.l3.length;
        console.log('[저장] 기존 행 수:', existingCount, '선택 수:', uniqueElements.length);
        
        // 선택된 항목들로 새 리스트 생성 (m4 기본값 'MN' 설정)
        const newL3: WorkElement[] = uniqueElements.map((e, idx) => ({
          id: uid(),
          m4: e.m4 || 'MN',  // m4가 없으면 기본값 'MN'
          name: e.name,
          order: (idx + 1) * 10,
          functions: [],
          processChars: [],
        }));
        
        // 행이 1개만 남았는데 0개 선택 → 내용만 비우고 행 유지
        if (existingCount === 1 && newL3.length === 0) {
          console.log('[저장] 1개→0개: 내용만 비움');
          newL3.push({ 
            id: proc.l3[0]?.id || uid(), 
            m4: '', 
            name: '(클릭하여 작업요소 추가)', 
            order: 10, 
            functions: [], 
            processChars: [] 
          });
        }
        
        // 최소 1행 보장 (혹시 모든 경우 대비)
        if (newL3.length === 0) {
          console.log('[저장] 0개: 기본 행 추가');
          newL3.push({ id: uid(), m4: '', name: '(클릭하여 작업요소 추가)', order: 10, functions: [], processChars: [] });
        }
        
        console.log('[저장] 최종 l3:', newL3.map(w => w.name));
        return { ...proc, l3: newL3 };
      });
      return { ...prev, l2: newL2 };
    });
    setDirty(true);
  }, [targetL2Id, setState, setDirty]);

  // 작업요소 모달 삭제 핸들러 (2개 이상이면 행 삭제, 1개면 내용만 삭제)
  const handleWorkElementDelete = useCallback((deletedNames: string[]) => {
    console.log('[삭제] targetL2Id:', targetL2Id, 'deletedNames:', deletedNames);
    if (!targetL2Id || deletedNames.length === 0) return;
    
    // 이름 정규화 (공백 제거)
    const normalizedDeletedNames = deletedNames.map(n => n.trim());
    
    setState(prev => {
      const newL2 = prev.l2.map(proc => {
        if (proc.id !== targetL2Id) return proc;
        
        console.log('[삭제] 현재 l3:', proc.l3.map(w => w.name));
        
        const currentCount = proc.l3.length;
        
        if (currentCount > 1) {
          // 2개 이상이면 행 자체 삭제
          const remainingL3 = proc.l3.filter(w => !normalizedDeletedNames.includes(w.name.trim()));
          console.log('[삭제] 2개이상, 남은 항목:', remainingL3.map(w => w.name));
          
          // 모두 삭제되면 최소 1행 유지
          if (remainingL3.length === 0) {
            remainingL3.push({ id: uid(), m4: '', name: '(클릭하여 작업요소 추가)', order: 10, functions: [], processChars: [] });
          }
          
          return { ...proc, l3: remainingL3 };
        } else {
          // 1개만 남았으면 내용만 삭제, 행 유지
          console.log('[삭제] 1개만 남음, 내용만 삭제');
          const updatedL3 = proc.l3.map(w => {
            const isMatch = normalizedDeletedNames.includes(w.name.trim());
            console.log('[삭제] 비교:', w.name.trim(), '포함여부:', isMatch);
            if (isMatch) {
              return { ...w, name: '(클릭하여 작업요소 추가)', m4: '' };
            }
            return w;
          });
          
          return { ...proc, l3: updatedL3 };
        }
      });
      return { ...prev, l2: newL2 };
    });
    setDirty(true);
  }, [targetL2Id, setState, setDirty]);

  // 작업요소명 수정
  const renameL3 = useCallback((l3Id: string, newName: string) => {
    setState(prev => ({
      ...prev,
      l2: prev.l2.map(p => ({
        ...p,
        l3: p.l3.map(w => w.id === l3Id ? { ...w, name: newName } : w)
      }))
    }));
    setDirty(true);
  }, [setState, setDirty]);

  // 검색 필터링된 트리 데이터
  const filteredTree = useMemo(() => {
    const q = state.search.toLowerCase();
    if (!q) return state.l2;
    return state.l2.filter(proc => {
      const procLabel = `${proc.no} ${proc.name}`.toLowerCase();
      return procLabel.includes(q) || proc.l3.some(w => `${w.m4} ${w.name}`.toLowerCase().includes(q));
    });
  }, [state.l2, state.search]);

  // 공통 탭 props
  const tabProps = {
    state,
    setState,
    rows,
    l1Spans,
    l1TypeSpans,
    l1FuncSpans,
    l2Spans,
    setDirty,
    handleInputBlur,
    handleInputKeyDown,
    handleSelect,
    setIsProcessModalOpen,
    setIsWorkElementModalOpen,
    setTargetL2Id,
    saveToLocalStorage,
    onAPClick: () => setShowAPModal(true),
  };

  return (
    <>
      <DFMEATopNav 
        selectedFmeaId={currentFmea?.id} 
      />
      
      <div className="h-full flex flex-col font-[Segoe_UI,Malgun_Gothic,Arial,sans-serif] pt-16 bg-gray-50 text-gray-800">
        
        {/* ========== 상단 메뉴 바 ========== */}
        <TopMenuBar
          fmeaList={fmeaList}
          currentFmea={currentFmea}
          selectedFmeaId={selectedFmeaId}
          dirty={dirty}
          isSaving={isSaving}
          lastSaved={lastSaved}
          currentTab={state.tab}
          importMessage={importMessage}
          fileInputRef={fileInputRef}
          onFmeaChange={handleFmeaChange}
          onSave={saveToLocalStorage}
          onNavigateToList={() => router.push('/pfmea/list')}
          onExport={() => {
            const fmeaName = currentFmea?.fmeaInfo?.subject || 'PFMEA';
            if (state.tab === 'structure') {
              handleStructureExport();
            } else if (state.tab === 'function-l1') {
              // 1L 완제품기능 (고장영향 미포함)
              exportFunctionL1(state, fmeaName, false);
            } else if (state.tab === 'failure-l1') {
              // 1L 고장영향 (고장영향 포함)
              exportFunctionL1(state, fmeaName, true);
            } else if (state.tab === 'function-l2') {
              // 2L 메인공정기능 (고장형태 미포함)
              exportFunctionL2(state, fmeaName, false);
            } else if (state.tab === 'failure-l2') {
              // 2L 고장형태 (고장형태 포함)
              exportFunctionL2(state, fmeaName, true);
            } else if (state.tab === 'function-l3') {
              // 3L 작업요소기능 (고장원인 미포함)
              exportFunctionL3(state, fmeaName, false);
            } else if (state.tab === 'failure-l3') {
              // 3L 고장원인 (고장원인 포함)
              exportFunctionL3(state, fmeaName, true);
            } else if (state.tab === 'all') {
              exportAllViewExcel(state, fmeaName);
            } else {
              exportFMEAWorksheet(state, fmeaName);
            }
          }}
          onImportClick={() => fileInputRef.current?.click()}
          onImportFile={handleImportFile}
          onDownloadTemplate={handleDownloadTemplate}
          onOpenSpecialChar={() => setIsSpecialCharModalOpen(true)}
          onOpenSOD={() => setIsSODModalOpen(true)}
          onOpen5AP={() => setShowAPModal(true)}
          onOpen6AP={() => setShow6APModal(true)}
        />

        {/* ========== 메인 레이아웃 ========== */}
        <div className="flex flex-col h-[calc(100vh-60px)] overflow-x-auto overflow-y-hidden border-2 border-[#00587a]">
          {/* ===== 상단: 탭 메뉴 + 패널 선택 (고정 영역) ===== */}
          <div 
            className="h-[37px] flex flex-col shrink-0 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 z-[98]"
          >
            {/* 탭 메뉴 행 */}
            <div className="flex items-stretch h-9">
              {/* 탭 메뉴 영역 (좌측) */}
              <div className="flex-1 pr-0 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900">
                <div className="mr-[280px]">
                  <TabMenu 
                    state={state} 
                    setState={setState} 
                    onOpen5AP={() => setShowAPModal(true)}
                    onOpen6AP={() => setShow6APModal(true)}
                  />
                </div>
              </div>
              
              {/* 우측 탭 메뉴 영역: 6단계 AP - 절대 위치 고정 (270px) */}
              <div className="absolute right-0 top-0 w-[270px] h-9 flex items-stretch bg-gradient-to-r from-indigo-900 to-indigo-800 border-l border-yellow-400 box-border">
              <div className="w-20 h-9 flex items-center justify-center border-r border-white/25 box-border shrink-0">
                <span className="text-yellow-400 text-[11px] font-bold leading-none whitespace-nowrap">6단계 AP:</span>
              </div>
              <div className="w-[60px] h-9 flex items-center justify-center border-r border-white/25 box-border shrink-0">
                <span className="text-red-500 text-[11px] font-bold leading-none whitespace-nowrap">H:0</span>
              </div>
              <div className="w-[65px] h-9 flex items-center justify-center border-r border-white/25 box-border shrink-0">
                <span className="text-amber-400 text-[11px] font-bold leading-none whitespace-nowrap">M:0</span>
              </div>
              <div className="w-[65px] h-9 flex items-center justify-center box-border shrink-0">
                <span className="text-green-500 text-[11px] font-bold leading-none whitespace-nowrap">L:0</span>
              </div>
            </div>
            </div>
            {/* 구분선 */}
            <div className="h-px bg-yellow-400 w-full" />
          </div>
          
          {/* ===== 콘텐츠 영역 (좌측:워크시트 / 우측:패널) ===== */}
          <div className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden">
            {/* ===== 좌측: 워크시트 영역 ===== */}
            <div 
              className={`flex-1 flex flex-col min-w-0 ${state.tab === 'all' || state.tab === 'failure-link' ? '' : 'border-r-4 border-[#00587a]'}`}
            >

            {/* 테이블 제목 - 고정 (전체보기에서는 숨김) */}
            {state.tab !== 'all' && (
            <div 
              className={`shrink-0 flex items-center justify-center relative font-black py-1 px-2 text-[13px] border-b border-gray-300 ${state.tab === 'structure' ? 'bg-[#1a237e] text-white' : 'bg-[#e8eaf6] text-gray-800'}`}
            >
              {/* 중앙 타이틀 - 기능분석/고장분석 탭은 자체 헤더가 있어서 숨김 */}
              {!state.tab.startsWith('function') && !state.tab.startsWith('failure') && (
                <span>P-FMEA {getTabLabel(state.tab)}({getStepNumber(state.tab)}단계)</span>
              )}
              
              {/* 구조분석일 때만 우측에 확정/누락/수정 버튼 */}
              {state.tab === 'structure' && (
                <div className="absolute right-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const missingCount = calculateStructureMissing();
                      if (missingCount > 0) {
                        alert(`⚠️ 누락건이 ${missingCount}건 있습니다.\n\n누락 항목을 채운 후 다시 확정해주세요.`);
                        return; // 누락이 있으면 확정 안 됨
                      }
                      
                      // 구조분석 데이터를 기능분석에 연동
                      setState(prev => {
                        // L2(공정)에 기능 초기화 (아직 없는 경우만)
                        const updatedL2 = prev.l2.map(proc => ({
                          ...proc,
                          functions: proc.functions?.length > 0 ? proc.functions : [
                            { id: uid(), name: '(클릭하여 공정기능 입력)', productChars: [] }
                          ],
                          l3: proc.l3.map(we => ({
                            ...we,
                            functions: we.functions?.length > 0 ? we.functions : [
                              { id: uid(), name: '(클릭하여 작업요소기능 입력)', processChars: [] }
                            ],
                          })),
                        }));
                        
                        return { 
                          ...prev, 
                          structureConfirmed: true,
                          structureConfirmedAt: new Date().toISOString(),
                          l2: updatedL2,
                        };
                      });
                      
                      alert('✓ 구조분석이 확정되었습니다.\n\n이제 기능분석(3단계) 탭이 활성화되었습니다.');
                      setDirty(true);
                    }}
                    disabled={(state as any).structureConfirmed}
                    className={`text-white border-none py-0.5 px-2.5 rounded text-[11px] font-bold ${(state as any).structureConfirmed ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 cursor-pointer'}`}
                  >
                    확정
                  </button>
                  <span className={`text-white py-0.5 px-2.5 rounded text-[11px] font-bold ${calculateStructureMissing() > 0 ? 'bg-red-600' : 'bg-green-600'}`}>
                    누락 {calculateStructureMissing()}건
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('구조분석을 수정하시겠습니까?')) {
                        setState(prev => ({ ...prev, structureConfirmed: false }));
                        setDirty(true);
                      }
                    }}
                    disabled={!(state as any).structureConfirmed}
                    className={`text-white border-none py-0.5 px-2.5 rounded text-[11px] font-bold ${(state as any).structureConfirmed ? 'bg-orange-500 cursor-pointer' : 'bg-gray-500 cursor-not-allowed'}`}
                  >
                    수정
                  </button>
                </div>
              )}
            </div>
            )}

            {/* 테이블 스크롤 영역 - 상하좌우 스크롤 가능, 헤더 sticky */}
            <div className="flex-1 overflow-auto bg-white relative">
              {/* 기초정보 없으면 안내 메시지 */}
              {currentFmea && !currentFmea.fmeaInfo?.subject && (
                <div className="flex flex-col items-center justify-center h-[200px] bg-yellow-50 border-2 border-dashed border-amber-400 rounded-lg m-5 p-5"
              >
                  <div className="text-base font-bold text-orange-600 mb-3">
                    ⚠️ 기초정보가 없습니다
                  </div>
                  <div className="text-[13px] text-gray-600 mb-4 text-center">
                    FMEA 분석을 시작하려면 먼저 기초정보를 입력해주세요.<br/>
                    기초정보에는 회사명, FMEA명, 고객명, 책임자 등이 포함됩니다.
                  </div>
                  <button
                    onClick={() => router.push(`/pfmea/register?id=${currentFmea.id}`)}
                    className="bg-blue-700 text-white border-none py-2.5 px-6 rounded-md text-[13px] font-semibold cursor-pointer shadow-md"
                  >
                    📝 기초정보 입력하기
                  </button>
                </div>
              )}
              {/* 탭 메뉴와 워크시트 사이 흰색 패딩 (전체보기 제외) */}
              {state.tab !== 'all' && (
                <div className="h-2 bg-white shrink-0" />
              )}
              {state.tab.startsWith('function') ? (
                <FunctionTabFull {...tabProps} />
              ) : state.tab.startsWith('failure') ? (
                <FailureTabFull {...tabProps} />
              ) : state.tab === 'all' ? (
                /* 전체보기 탭: 통합 화면 (40열 구조) */
                <AllTabRenderer 
                  tab={state.tab} 
                  rows={rows} 
                  state={state}
                  setState={setState}
                  l1Spans={l1Spans} 
                  l1TypeSpans={l1TypeSpans}
                  l1FuncSpans={l1FuncSpans}
                  l2Spans={l2Spans}
                  onAPClick={() => setShowAPModal(true)}
                  visibleSteps={state.visibleSteps || [2, 3, 4, 5, 6]}
                />
              ) : (
                <table className="w-full border-collapse table-fixed">
                  {state.tab === 'structure' && <StructureTabFull {...tabProps} />}
                  {state.tab === 'doc' && <DocTabFull {...tabProps} />}
                </table>
              )}
            </div>
          </div>

          {/* ===== 우측: 패널 영역 (전체보기, 고장연결에서는 숨김) ===== */}
          {state.tab !== 'all' && state.tab !== 'failure-link' && (
          <div className="w-[500px] shrink-0 flex flex-col bg-[#f0f4f8] border-l-4 border-[#00587a]">
            {/* 패널 콘텐츠 (레이지 로딩) - 메뉴는 상단 바로가기 영역에 있음 */}
            <Suspense fallback={
              <div className="flex justify-center items-center h-full text-sm text-gray-600">
                ⏳ 로딩 중...
              </div>
            }>
              {(() => {
                const panel = getPanelById(activePanelId);
                if (!panel) return null;
                const PanelComponent = panel.component;
                return <PanelComponent state={state} />;
              })()}
            </Suspense>

            {/* 고장연결 결과 트리 */}
            {state.tab === 'failure-link' && (() => {
              const ui = (state as any).failureLinkUI || {};
              const { currentFMId, currentFM, savedLinks = [], stats = { linkedFM: 0, totalFM: 0, totalLinks: 0 } } = ui;
              const resultLinks = currentFMId ? savedLinks.filter((l: any) => l.fmId === currentFMId) : [];
              const COLORS_LINK = { mn: '#eef7ff', mc: '#ffe6e6', en: '#fef0ff', line: '#6f8fb4' };
              
              return (
                <>
                  <div className="bg-indigo-700 text-white py-2 px-3 text-xs font-bold shrink-0 flex justify-between items-center">
                    <span>🔗 연결 결과</span>
                    <span className="text-[10px] font-normal">연결: {stats.linkedFM}/{stats.totalFM} FM</span>
                  </div>
                  <div className="flex-1 overflow-auto p-1 bg-indigo-50">
                    <table className="w-full border-collapse text-[8px]">
                      <thead>
                        <tr>
                          <th colSpan={3} className="bg-blue-200 py-0.5 text-center font-bold border border-gray-300">1. 고장영향(FE)</th>
                          <th className="bg-amber-100 py-0.5 text-center font-bold border border-gray-300">2. FM</th>
                          <th colSpan={3} className="bg-green-200 py-0.5 text-center font-bold border border-gray-300">3. 고장원인(FC)</th>
                        </tr>
                        <tr>
                          <th className="bg-blue-100 py-0.5 text-center font-semibold border border-gray-300">구분</th>
                          <th className="bg-blue-100 py-0.5 text-center font-semibold border border-gray-300">FE</th>
                          <th className="bg-blue-100 py-0.5 text-center font-semibold border border-gray-300">S</th>
                          <th className="bg-amber-100 py-0.5 text-center font-semibold border border-gray-300">FM</th>
                          <th className="bg-green-100 py-0.5 text-center font-semibold border border-gray-300">4M</th>
                          <th className="bg-green-100 py-0.5 text-center font-semibold border border-gray-300">작업요소</th>
                          <th className="bg-green-100 py-0.5 text-center font-semibold border border-gray-300">FC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultLinks.length === 0 ? (
                          <tr><td colSpan={7} className="text-center py-5 text-gray-400 text-[10px]">
                            {currentFMId ? '연결된 항목이 없습니다' : 'FM을 선택하세요'}
                          </td></tr>
                        ) : resultLinks.map((link: any, idx: number) => {
                          const m4Style = get4MBadgeStyle(link.fcM4);
                          return (
                            <tr key={idx}>
                              <td className="py-0.5 px-1 border border-gray-300 text-center">{link.feScope}</td>
                              <td className="py-0.5 px-1 border border-gray-300">{link.feText}</td>
                              <td className={`py-0.5 px-1 border border-gray-300 text-center font-bold ${link.severity >= 8 ? 'text-orange-600' : 'text-gray-800'}`}>{link.severity}</td>
                              {idx === 0 && (
                                <td rowSpan={resultLinks.length} className="py-0.5 px-1 border border-gray-300 bg-amber-100 font-bold text-center align-middle">{link.fmText}</td>
                              )}
                              <td className="py-0.5 px-1 border border-gray-300 text-center" style={dynamicBgStyle(m4Style.bg)}>{link.fcM4}</td>
                              <td className="py-0.5 px-1 border border-gray-300">{link.fcWorkElem}</td>
                              <td className="py-0.5 px-1 border border-gray-300">{link.fcText}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="shrink-0 py-1.5 px-2.5 border-t border-gray-300 bg-indigo-50 text-[10px] text-indigo-700 flex justify-between items-center">
                    <span>총 {stats.totalLinks}개 연결</span>
                    <button 
                      onClick={() => {
                        const links = (state as any).failureLinks || [];
                        setState((prev: any) => ({ ...prev, failureLinks: links }));
                        setDirty(true);
                        saveToLocalStorage();
                        alert(`✅ ${links.length}개 고장연결이 저장되었습니다.`);
                      }}
                      className="py-0.5 px-2.5 bg-red-600 text-white border-none rounded text-[9px] cursor-pointer font-bold"
                    >
                      💾 저장
                    </button>
                  </div>
                </>
              );
            })()}

            {/* 전체보기 탭: 전체 구조 표시 + AP 테이블 전환 */}
            {(state.tab === 'all') && (
              <>
                <div className="bg-[#455a64] text-white py-1.5 px-2.5 text-[11px] font-bold shrink-0 flex justify-between items-center">
                  <span>📊 {showAPInAll ? `${apStageInAll}AP 기준표` : '전체 구조'}</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setShowAPInAll(false)}
                      className={`py-0.5 px-1.5 text-[9px] border-none rounded-sm cursor-pointer ${!showAPInAll ? 'bg-white text-[#455a64] font-bold' : 'bg-white/30 text-white font-normal'}`}
                    >
                      구조
                    </button>
                    <button 
                      onClick={() => { setShowAPInAll(true); setApStageInAll(5); }}
                      className={`py-0.5 px-1.5 text-[9px] border-none rounded-sm cursor-pointer ${showAPInAll && apStageInAll === 5 ? 'bg-white text-[#455a64] font-bold' : 'bg-white/30 text-white font-normal'}`}
                    >
                      5AP
                    </button>
                    <button 
                      onClick={() => { setShowAPInAll(true); setApStageInAll(6); }}
                      className={`py-0.5 px-1.5 text-[9px] border-none rounded-sm cursor-pointer ${showAPInAll && apStageInAll === 6 ? 'bg-white text-[#455a64] font-bold' : 'bg-white/30 text-white font-normal'}`}
                    >
                      6AP
                    </button>
                  </div>
                </div>
                
                {!showAPInAll ? (
                  <div className="flex-1 overflow-auto p-2 bg-[#eceff1]">
                    <div className="text-[10px] text-gray-600 mb-2">
                      <strong>L1:</strong> {state.l1.name} ({state.l1.types.length}개 구분)
                    </div>
                    <div className="text-[10px] text-gray-600 mb-2">
                      <strong>L2:</strong> {state.l2.filter(p => !p.name.includes('클릭')).length}개 공정
                    </div>
                    <div className="text-[10px] text-gray-600">
                      <strong>L3:</strong> {state.l2.reduce((sum, p) => sum + p.l3.filter(w => !w.name.includes('추가')).length, 0)}개 작업요소
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden">
                    <APTableInline onClose={() => setShowAPInAll(false)} showClose={false} stage={apStageInAll} />
                  </div>
                )}
              </>
            )}
          </div>
          )}
          </div>
        </div>

        {/* 모달 */}
        <ProcessSelectModal
          isOpen={isProcessModalOpen}
          onClose={() => setIsProcessModalOpen(false)}
          onSave={handleProcessSave}
          onDelete={(ids) => {
            // 삭제할 공정 ID에 해당하는 공정을 state에서 제거
            setState(prev => {
              const processNamesToDelete = ids.map(id => {
                const match = prev.l2.find(p => p.id === id);
                return match?.name;
              }).filter(Boolean);
              
              const remainingL2 = prev.l2.filter(p => !processNamesToDelete.includes(p.name));
              
              // 모두 삭제되면 기본 항목 추가
              if (remainingL2.length === 0) {
                return {
                  ...prev,
                  l2: [{ id: uid(), no: '10', name: '(클릭하여 공정 선택)', order: 10, l3: [{ id: uid(), m4: '', name: '(공정 선택 필요)', order: 10, functions: [], processChars: [] }], functions: [], productChars: [], failureMode: '' }]
                };
              }
              return { ...prev, l2: remainingL2 };
            });
            setDirty(true);
          }}
          existingProcessNames={state.l2.filter(p => !p.name.includes('클릭')).map(p => p.name)}
          productLineName={state.l1.name || '완제품 제조라인'}
        />

        <WorkElementSelectModal
          isOpen={isWorkElementModalOpen}
          onClose={() => { setIsWorkElementModalOpen(false); setTargetL2Id(null); }}
          onSave={handleWorkElementSelect}
          onDelete={handleWorkElementDelete}
          processNo={state.l2.find(p => p.id === targetL2Id)?.no || ''}
          processName={state.l2.find(p => p.id === targetL2Id)?.name || ''}
          existingElements={state.l2.find(p => p.id === targetL2Id)?.l3.filter(w => !w.name.includes('추가')).map(w => w.name) || []}
        />

        {/* 특별특성 마스터 모달 */}
        <SpecialCharMasterModal
          isOpen={isSpecialCharModalOpen}
          onClose={() => setIsSpecialCharModalOpen(false)}
          currentFmeaId={selectedFmeaId}
        />

        {/* SOD 마스터 모달 */}
        <SODMasterModal
          isOpen={isSODModalOpen}
          onClose={() => setIsSODModalOpen(false)}
        />
      </div>
    </>
  );
}

// Suspense boundary wrapper for useSearchParams
export default function FMEAWorksheetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">로딩 중...</div>}>
      <FMEAWorksheetPageContent />
    </Suspense>
  );
}

// ============ 하위 컴포넌트들은 components/TabFullComponents.tsx로 분리됨 ============

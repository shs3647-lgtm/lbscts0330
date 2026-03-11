'use client';
// @ts-nocheck

/**
 * @file page.tsx
 * @description FMEA 워크시트 메인 페이지
 * @author AI Assistant
 * @created 2025-12-27
 * @refactored 모듈화 - constants, hooks, tabs 분리
 */

import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
// ★★★ 2026-01-12: StructureTab 내부에서 모달 렌더링 (패턴 통일)
// import ProcessSelectModal from './ProcessSelectModal';
// import WorkElementSelectModal from './WorkElementSelectModal';
import PFMEATopNav from '@/components/layout/PFMEATopNav';

// 모듈화된 상수, hooks, 탭 컴포넌트
import { COLORS, uid, getTabLabel, WorksheetState, WorkElement, Process } from './constants';
import { btnConfirm, btnEdit, badgeConfirmed, badgeOk, badgeMissing } from '@/styles/worksheet';
import { useWorksheetState, useCpSync, useExcelHandlers, useProcessHandlers } from './hooks';
import { 
  StructureTab, StructureColgroup, StructureHeader, StructureRow,
  FunctionTab, FunctionColgroup, FunctionHeader, FunctionRow,
  FailureTab, FailureColgroup, FailureHeader, FailureRow,
  RiskTab, RiskHeader, RiskRow,
  OptTab, OptHeader, OptRow,
  DocTab, DocHeader, DocRow,
} from './tabs';
import { FailureTab as FailureTabNew } from './tabs/failure';
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
import AllTabRenderer from './tabs/all/AllTabRenderer';
import FailureLinkResult from './components/FailureLinkResult';
// ★★★ 2026-01-12: AllTabRightPanel, APTableInline 제거 - 플러그인 통일 ★★★
import { 
  getStepNumber, 
  StructureTabFull, 
  FunctionTabFull, 
  FailureTabFull, 
  DocTabFull 
} from './components/TabFullComponents';
import { getPanelById } from './panels';
import { Fmea4Tab, convertToFmea4 } from './tabs/fmea4';
import { CPTab } from './tabs/cp';

/**
 * FMEA 워크시트 메인 페이지 컨텐츠
 */
function FMEAWorksheetPageContent() {
  const router = useRouter();
  
  // ✅ FMEA 워크시트 기본 배율 110% 설정
  // ⚠️ 2026-01-11: zoom은 클릭 이벤트에 영향을 줄 수 있어 비활성화
  // React.useEffect(() => {
  //   const worksheetContainer = document.getElementById('fmea-worksheet-container');
  //   if (worksheetContainer) {
  //     worksheetContainer.style.zoom = '1.1';
  //     worksheetContainer.style.transformOrigin = '0 0';
  //   }
  // }, []);
  
  // ✅ 상속 정보 상태
  const [inheritInfo, setInheritInfo] = React.useState<{
    parentFmeaId: string;
    parentSubject: string;
    inheritedAt: string;
  } | null>(null);
  
  // 워크시트 상태 관리 Hook
  const {
    state,
    setState,
    setStateSynced,  // ✅ stateRef 동기 업데이트 버전
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
    saveToLocalStorageOnly,
    saveAtomicDB,
    handleInputKeyDown,
    handleInputBlur,
    handleSelect,
    addL2,
  } = useWorksheetState();
  
  // ★ CP 동기화 훅 (모듈화)
  const {
    linkedCpNo,
    syncStatus,
    handleCpStructureSync,
    handleCpDataSync,
  } = useCpSync(selectedFmeaId);
  
  // 모달 상태
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isWorkElementModalOpen, setIsWorkElementModalOpen] = useState(false);
  const [isSpecialCharModalOpen, setIsSpecialCharModalOpen] = useState(false);
  const [isSODModalOpen, setIsSODModalOpen] = useState(false);
  const [showAPModal, setShowAPModal] = useState(false);
  const [show6APModal, setShow6APModal] = useState(false);
  
  // ★ 공정/작업요소 핸들러 훅 (모듈화)
  const {
    targetL2Id,
    setTargetL2Id,
    calculateStructureMissing,
    handleProcessSave,
    handleWorkElementSelect,
  } = useProcessHandlers({ state, setState, setDirty });
  
  // 우측 패널 활성화 상태
  const [activePanelId, setActivePanelId] = useState<string>('tree');
  
  // ★★★ 2026-01-19: 버튼 클릭 시 패널 유지 플래그 ★★★
  const panelButtonClickedRef = React.useRef(false);
  
  // ★★★ 2026-01-19: 탭별 기본 패널 설정 ★★★
  // - 구조분석~3L원인분석: 트리뷰 기본 표시
  // - ALL, 고장연결: 전체화면 (패널 없음) - 단, 버튼 클릭 시 해당 패널 유지
  React.useEffect(() => {
    // 버튼 클릭으로 탭 변경 시, 자동 리셋 스킵
    if (panelButtonClickedRef.current) {
      console.log('🔘 버튼 클릭으로 탭 변경 - 패널 유지:', activePanelId);
      panelButtonClickedRef.current = false;
      return;
    }
    
    const treeViewTabs = ['structure', 'function-l1', 'function-l2', 'function-l3', 'failure-l1', 'failure-l2', 'failure-l3'];
    
    if (treeViewTabs.includes(state.tab)) {
      console.log('🌲 트리뷰 탭 진입:', state.tab);
      setActivePanelId('tree');
    } else if (state.tab === 'all' || state.tab === 'failure-link') {
      console.log('🔲 전체화면 탭 진입:', state.tab);
      setActivePanelId('');
    }
  }, [state.tab]);
  
  // ★★★ RPN 컬럼 표시 여부 (rpn 패널 활성화 시 true) ★★★
  const showRPN = activePanelId === 'rpn' || activePanelId === 'rpn-chart';
  
  // 트리 접기/펼치기 상태
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  
  // ★★★ 2026-01-12: showAPInAll, apStageInAll 제거 - 플러그인 통일 ★★★
  
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
  
  // ★ 엑셀 핸들러 훅 (모듈화)
  const fmeaName = currentFmea?.fmeaInfo?.subject || currentFmea?.project?.productName || 'PFMEA';
  const {
    fileInputRef,
    importMessage,
    handleImportFile,
    handleStructureExport,
    handleDownloadTemplate,
    handleWorksheetExport,
  } = useExcelHandlers({ state, setState, setDirty, fmeaName });
  
  // ✅ 상속 정보 로드 (localStorage에서)
  React.useEffect(() => {
    if (!selectedFmeaId) return;
    
    try {
      const worksheetKey = `pfmea_worksheet_${selectedFmeaId}`;
      const saved = localStorage.getItem(worksheetKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed._inherited && parsed._inheritedFrom) {
          setInheritInfo({
            parentFmeaId: parsed._inheritedFrom,
            parentSubject: parsed._inheritedFrom,
            inheritedAt: parsed._inheritedAt || '',
          });
          console.log('[상속 정보] 로드:', parsed._inheritedFrom);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [selectedFmeaId]);

  // 작업요소 모달 연속입력 핸들러 (수동입력 후 즉시 워크시트 반영)
  const handleWorkElementContinuousAdd = useCallback((element: { id: string; m4: string; name: string }, addNewRow: boolean) => {
    if (!targetL2Id) {
      console.warn('[작업요소 연속입력] targetL2Id 없음 - 중단');
      return;
    }
    
    console.log('[작업요소 연속입력] 시작', { targetL2Id, element: element.name, addNewRow });
    
    setState(prev => {
      const newL2 = prev.l2.map(proc => {
        if (proc.id !== targetL2Id) return proc;
        
        // 기존 작업요소 목록 복사
        const existingL3 = [...proc.l3];
        
        // placeholder 행 제거 (클릭하여 추가 메시지가 있는 행)
        const meaningfulL3 = existingL3.filter(we => 
          we.name && !we.name.includes('클릭하여') && !we.name.includes('추가')
        );
        
        // 새 작업요소 추가
        const newWorkElement: WorkElement = {
          id: uid(),
          m4: element.m4 || 'MN',
          name: element.name,
          order: (meaningfulL3.length + 1) * 10,
          functions: [],
          processChars: [],
        };
        
        const updatedL3 = [...meaningfulL3, newWorkElement];
        
        // 새 행 추가 요청이 있으면 placeholder 행 추가
        if (addNewRow) {
          updatedL3.push({
            id: uid(),
            m4: '',
            name: '(클릭하여 작업요소 추가)',
            order: updatedL3.length * 10,
            functions: [],
            processChars: [],
          });
        }
        
        console.log('[작업요소 연속입력] 완료, 최종 l3:', updatedL3.length, '개');
        return { ...proc, l3: updatedL3 };
      });
      return { ...prev, l2: newL2 };
    });
    setDirty(true);
    requestAnimationFrame(() => saveToLocalStorage?.());
  }, [targetL2Id, setState, setDirty, saveToLocalStorage]);

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
    const q = (state.search || '').toLowerCase();
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
    setStateSynced,  // ✅ stateRef 동기 업데이트 버전
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
    saveToLocalStorageOnly,
    saveAtomicDB,
    onAPClick: () => setShowAPModal(true),
  };

  return (
    <>
      <PFMEATopNav selectedFmeaId={currentFmea?.id} />
      
      <div className="h-full flex flex-col font-[Segoe_UI,Malgun_Gothic,Arial,sans-serif]" style={{ background: COLORS.bg, color: COLORS.text }}>
        
        {/* ========== 상단 메뉴 바 ========== */}
        <TopMenuBar
          fmeaList={fmeaList}
          currentFmea={currentFmea}
          selectedFmeaId={selectedFmeaId}
          cpNo={linkedCpNo}
          dirty={dirty}
          isSaving={isSaving}
          syncStatus={syncStatus}
          lastSaved={lastSaved}
          currentTab={state.tab}
          importMessage={importMessage}
          fileInputRef={fileInputRef}
          onFmeaChange={handleFmeaChange}
          onSave={() => {
            saveToLocalStorage();
            saveAtomicDB();
          }}
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
          onOpen5AP={() => {
            // ALL 탭으로 이동 후 5AP 패널 표시
            panelButtonClickedRef.current = true;
            if (state.tab !== 'all') setState(prev => ({ ...prev, tab: 'all' }));
            setActivePanelId(prev => prev === '5ap' ? '' : '5ap');
          }}
          onOpen6AP={() => {
            panelButtonClickedRef.current = true;
            if (state.tab !== 'all') setState(prev => ({ ...prev, tab: 'all' }));
            setActivePanelId(prev => prev === '6ap' ? '' : '6ap');
          }}
          onOpenRPN={() => {
            panelButtonClickedRef.current = true;
            if (state.tab !== 'all') setState(prev => ({ ...prev, tab: 'all' }));
            setActivePanelId(prev => prev === 'rpn' ? '' : 'rpn');
          }}
          onOpenChain={() => {
            panelButtonClickedRef.current = true;
            if (state.tab !== 'all') setState(prev => ({ ...prev, tab: 'all' }));
            setActivePanelId(prev => prev === 'chain' ? '' : 'chain');
          }}
          onOpenPDF={() => {
            panelButtonClickedRef.current = true;
            setActivePanelId(prev => prev === 'pdf' ? '' : 'pdf');
          }}
          onCpStructureSync={handleCpStructureSync}
          onCpDataSync={handleCpDataSync}
          state={state}
        />

        {/* ✅ 상속 모드 배너 */}
        {inheritInfo && (
          <div 
            className="fixed top-16 left-[50px] right-0 h-7 z-[99] bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 border-b border-blue-800 flex items-center justify-center gap-4 text-white text-xs"
          >
            <span className="font-bold">
              🔵 상속 모드
            </span>
            <span>|</span>
            <span>
              기반 FMEA: <span className="font-semibold text-yellow-200">{inheritInfo.parentFmeaId}</span>
            </span>
            <a 
              href={`/pfmea/worksheet?id=${inheritInfo.parentFmeaId}`}
              className="px-2 py-0.5 bg-white/20 rounded hover:bg-white/30 transition-colors"
            >
              원본 보기
            </a>
            <button 
              onClick={() => {
                if (confirm('상속 정보를 해제하시겠습니까?\n데이터는 유지되지만, 상속 표시가 사라집니다.')) {
                  // localStorage에서 상속 정보 제거
                  const worksheetKey = `pfmea_worksheet_${selectedFmeaId}`;
                  const saved = localStorage.getItem(worksheetKey);
                  if (saved) {
                    const parsed = JSON.parse(saved);
                    delete parsed._inherited;
                    delete parsed._inheritedFrom;
                    delete parsed._inheritedAt;
                    localStorage.setItem(worksheetKey, JSON.stringify(parsed));
                  }
                  setInheritInfo(null);
                }
              }}
              className="px-2 py-0.5 bg-red-500/50 rounded hover:bg-red-500/70 transition-colors"
            >
              상속 해제
            </button>
          </div>
        )}

        {/* ===== 탭 메뉴 (고정, top-16 = 64px) ===== */}
        <div 
          className={`fixed ${inheritInfo ? 'top-[92px]' : 'top-16'} left-[50px] right-0 h-9 z-[98] bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 border-b-[2px] border-[#1a237e]`}
        >
          <TabMenu 
            state={state} 
            setState={setState}
            setDirty={setDirty}
            saveToLocalStorage={saveToLocalStorage}
            saveAtomicDB={saveAtomicDB} 
            onOpen5AP={() => {
              panelButtonClickedRef.current = true;
              if (state.tab !== 'all') setState(prev => ({ ...prev, tab: 'all' }));
              setActivePanelId(prev => prev === '5ap' ? '' : '5ap');
            }}
            onOpen6AP={() => {
              panelButtonClickedRef.current = true;
              if (state.tab !== 'all') setState(prev => ({ ...prev, tab: 'all' }));
              setActivePanelId(prev => prev === '6ap' ? '' : '6ap');
            }}
            onAllClick={() => {
              console.log('🔴 onAllClick 호출됨! activePanelId를 빈값으로 설정');
              setActivePanelId('');
            }}
          />
        </div>

        {/* ========== 메인 레이아웃 (메뉴 아래, 상속 배너 고려) ========== */}
        {/* ✅ All 탭: overflow-auto로 브라우저 스크롤 허용 */}
        <div className={`fixed ${inheritInfo ? 'top-[128px]' : 'top-[100px]'} left-[50px] right-0 bottom-0 flex flex-row ${state.tab === 'all' ? 'overflow-auto' : 'overflow-hidden'}`}>
          
          {/* ===== 좌측: 워크시트 영역 ===== */}
          <div id="fmea-worksheet-container" className={`flex-1 flex flex-col min-w-0 bg-white ${state.tab === 'all' ? 'overflow-visible' : 'overflow-hidden'}`}>

            {/* 구조분석 제목 바는 StructureTab 내부 헤더로 이동됨 (표준화 완료) */}

            {/* ✅ All 탭: 좌우 스크롤 지원 (2026-01-12 수정) */}
            {state.tab === 'all' ? (
              <div 
                id="all-tab-scroll-wrapper"
                className="worksheet-scroll-container"
                style={{ 
                  flex: 1,
                  overflowX: 'scroll',
                  overflowY: 'auto',
                  background: '#fff',
                  position: 'relative',
                }}
              >
                {/* 전체보기 탭: 통합 화면 (40열 구조) - 원자성 DB 기반 */}
                <AllTabRenderer 
                  tab={state.tab} 
                  rows={rows} 
                  state={state}
                  setState={setState}
                  setDirty={setDirty}
                  l1Spans={l1Spans} 
                  l1TypeSpans={l1TypeSpans}
                  l1FuncSpans={l1FuncSpans}
                  l2Spans={l2Spans}
                  onAPClick={() => setShowAPModal(true)}
                  visibleSteps={state.visibleSteps || [2, 3, 4, 5, 6]}
                  fmeaId={selectedFmeaId || undefined}
                  useAtomicDB={true}
                  showRPN={showRPN}
                  // ★★★ 2026-01-19: ALL 탭 내 패널 전환 핸들러 ★★★
                  onOpen5AP={() => {
                    panelButtonClickedRef.current = true;
                    setActivePanelId(prev => prev === '5ap' ? '' : '5ap');
                  }}
                  onOpen6AP={() => {
                    panelButtonClickedRef.current = true;
                    setActivePanelId(prev => prev === '6ap' ? '' : '6ap');
                  }}
                  onOpenRPN={() => {
                    panelButtonClickedRef.current = true;
                    setActivePanelId(prev => prev === 'rpn' ? '' : 'rpn');
                  }}
                  activePanelId={activePanelId}
                />
              </div>
            ) : (
              /* 다른 탭: 브라우저 하단 고정 스크롤바 */
              <div 
                id="worksheet-scroll-container"
                className="worksheet-scroll-container"
                style={{ 
                  flex: 1,
                  overflowX: 'scroll',
                  overflowY: 'auto',
                  background: '#fff',
                  position: 'relative',
                }}
                onWheel={(e) => {
                  // 마우스 휠로 좌우 스크롤 (Shift 없이도 가능)
                  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
              >
                {/* 기초정보 없으면 안내 메시지 */}
                {currentFmea && !currentFmea.fmeaInfo?.subject && (
                  <div 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '200px',
                    }}
                    className="bg-yellow-50 border-2 border-dashed border-amber-400 rounded-lg m-5 p-5"
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
                {/* 워크시트 콘텐츠 */}
                {state.tab.startsWith('function') ? (
                  <FunctionTabFull {...tabProps} />
                ) : state.tab.startsWith('failure') ? (
                  <FailureTabFull {...tabProps} />
                ) : state.tab === 'fmea4' ? (
                  <Fmea4Tab 
                    state={state} 
                    setState={setState} 
                    setDirty={setDirty} 
                  />
                ) : (
                  <table className="w-full border-collapse table-fixed">
                    {state.tab === 'structure' && <StructureTabFull {...tabProps} />}
                    {state.tab === 'doc' && <DocTabFull {...tabProps} />}
                  </table>
                )}
              </div>
            )}
          </div>
          {/* 워크시트 영역 닫힘 */}

          {/* ===== 워크시트-트리뷰 구분선 (2px 네이비) ===== */}
          {/* ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★ */}
          {/* ★★★ [중요] 고장연결(failure-link) 화면 - 코드 프리즈 ★★★ */}
          {/* ★★★ 고장연결 화면에는 트리뷰 영역이 필요 없음 ★★★ */}
          {/* ★★★ UI/UX 수정 절대 금지 - 2026-01-12 ★★★ */}
          {/* ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★ */}
          {/* ★★★ ALL 탭: 기본은 전체화면(트리뷰 없음), 5AP/6AP/RPN 클릭 시에만 우측 패널 표시 ★★★ */}
          {/* ★★★ ALL 탭 클릭 시 → activePanelId가 null이 되어 전체화면으로 복귀 ★★★ */}
          {(state.tab !== 'failure-link' && state.tab !== 'all') || 
           (state.tab === 'all' && ['5ap', '6ap', 'rpn', 'rpn-chart', 'chain', 'pdf'].includes(activePanelId)) ? (
            <>
              <div className="w-[2px] bg-[#1a237e] shrink-0" />

              {/* ===== 우측: 플러그인 패널 영역 (350px 통일) ===== */}
              <div className="w-[350px] shrink-0 flex flex-col bg-[#f0f4f8] overflow-hidden h-full">
                {/* 플러그인 패널 콘텐츠 (레이지 로딩) */}
                <Suspense fallback={
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    ⏳ 로딩 중...
                  </div>
                }>
                  {(() => {
                    const panel = getPanelById(activePanelId);
                    if (!panel) return null;
                    const PanelComponent = panel.component;
                    return <PanelComponent state={state} setState={setState} />;
                  })()}
                </Suspense>
              </div>
            </>
          ) : null}
        </div>

        {/* 
          ★★★ 2026-01-12: 모달 패턴 통일 ★★★
          ProcessSelectModal, WorkElementSelectModal → StructureTab 내부에서 렌더링
          (기능분석/고장분석과 동일한 패턴)
        */}

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

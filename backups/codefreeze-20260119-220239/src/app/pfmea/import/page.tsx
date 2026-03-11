'use client';

/**
 * @file page.tsx
 * @description PFMEA 기초정보 Excel Import 메인 페이지
 * @author AI Assistant
 * @created 2025-12-26
 * @updated 2025-12-26 - 디자인 시스템 표준화 적용
 * @refactored 2026-01-01 - 훅/상수 분리로 모듈화 (1746줄 → 목표 700줄)
 */

import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronUp, ChevronDown, Save, Upload, CheckCircle, GitCompare } from 'lucide-react';
import PFMEATopNav from '@/components/layout/PFMEATopNav';
import { COLORS, SIZES, TABLE_STYLES, BUTTON_STYLES, LAYOUT_STYLES } from '@/styles/design-tokens';
import { ImportedFlatData } from './types';
import { parseMultiSheetExcel, ParseResult } from './excel-parser';
import {
  downloadEmptyTemplate,
  downloadSampleTemplate,
  downloadRelationAEmpty,
  downloadRelationASample,
  downloadRelationBEmpty,
  downloadRelationBSample,
  downloadRelationCEmpty,
  downloadRelationCSample,
} from './excel-template';
import { PREVIEW_OPTIONS } from './sampleData';
import { tw } from './tailwindClasses';
import { useImportFileHandlers, useRelationData as useRelationDataHook, usePreviewHandlers, useRelationHandlers, useAutoSave, type BackupInfo } from './hooks';
import {
  downloadFmeaSample,
  handleDownloadPreview as utilDownloadPreview,
  handlePartialFileSelect as utilPartialFileSelect,
  handlePartialImport as utilPartialImport,
  handleRelationDownload as utilRelationDownload,
  handleRelationImport as utilRelationImport,
} from './utils';
import { loadActiveMasterDataset, saveMasterDataset } from './utils/master-api';
import DataCompareModal, { ChangeItem } from './components/DataCompareModal';
import { compareData, applyChanges } from './utils/compareData';
import FailureChainPopup from './FailureChainPopup';
import { FailureChain } from './types';

// FMEA 프로젝트 타입
interface FMEAProject {
  id: string;
  fmeaInfo?: {
    subject?: string;
  };
  project?: {
    productName?: string;
  };
}

function PFMEAImportPageContent() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get('id');
  const mode = searchParams.get('mode'); // 'master' | 'new' | 'excel' | null
  const fmeaTypeFromUrl = searchParams.get('type'); // 'M' | 'F' | 'P' | null (FMEA 유형)
  
  // FMEA 선택 상태
  const [fmeaList, setFmeaList] = useState<FMEAProject[]>([]);
  const [selectedFmeaId, setSelectedFmeaId] = useState<string>(idFromUrl || '');
  const [masterDatasetId, setMasterDatasetId] = useState<string | null>(null);
  const [masterDatasetName, setMasterDatasetName] = useState<string>('MASTER');
  
  // 상태 관리 - 빈 배열로 초기화 (저장된 데이터 우선 로드)
  const [importType, setImportType] = useState<'full' | 'partial'>('full');
  const [fileName, setFileName] = useState<string>('');
  const [flatData, setFlatData] = useState<ImportedFlatData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false); // 데이터 로드 완료 여부
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  
  // Import 상태
  const [pendingData, setPendingData] = useState<ImportedFlatData[]>([]); // 파싱된 데이터 임시 저장
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  
  // 좌측 미리보기
  const [previewColumn, setPreviewColumn] = useState('A2');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // 우측 관계형 탭
  const [relationTab, setRelationTab] = useState<'A' | 'B' | 'C'>('A');
  
  // 개별 입포트 상태
  const [partialItemCode, setPartialItemCode] = useState('A3'); // 개별 입포트할 항목 코드
  const [partialFileName, setPartialFileName] = useState<string>('');
  const [partialPendingData, setPartialPendingData] = useState<ImportedFlatData[]>([]);
  const [isPartialParsing, setIsPartialParsing] = useState(false);
  
  // 저장 상태
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);  // 데이터 변경 여부
  const [selectedRelationRows, setSelectedRelationRows] = useState<Set<string>>(new Set()); // 관계형 테이블 선택 행
  
  // 샘플 다운로드용 FMEA 선택 상태
  const [sampleFmeaL0, setSampleFmeaL0] = useState<string>('');
  const [sampleFmeaL1, setSampleFmeaL1] = useState<string>('');
  const [sampleFmeaL2, setSampleFmeaL2] = useState<string>('');
  const [sampleFmeaL3, setSampleFmeaL3] = useState<string>('');

  // 관계형 데이터 다운로드 선택 상태 (A: L2-L3, B: L1-L2-L3, C: L1-L2-L3 전체)
  const [relationDownloadType, setRelationDownloadType] = useState<'A' | 'B' | 'C'>('C');

  // 관계형 데이터 입포트
  const relationFileInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const partialFileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 비교 모달 상태
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareChanges, setCompareChanges] = useState<ChangeItem[]>([]);
  const [previousFlatData, setPreviousFlatData] = useState<ImportedFlatData[]>([]); // 비교용 이전 데이터
  const compareFileInputRef = useRef<HTMLInputElement>(null);

  // ✅ 비교 모드 상태 (미리보기 테이블 내 인라인 비교)
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [dbData, setDbData] = useState<ImportedFlatData[]>([]); // DB에서 로드한 원본 데이터
  const [confirmSelections, setConfirmSelections] = useState<Set<string>>(new Set()); // 확정 선택된 항목 ID

  // ✅ 분석 데이터 비교 모드 상태 (셀 단위 비교)
  const [isAnalysisCompareMode, setIsAnalysisCompareMode] = useState(false);
  const [analysisDbData, setAnalysisDbData] = useState<ImportedFlatData[]>([]); // DB에서 로드한 분석 원본 데이터
  // 셀 단위 확정: "processNo-itemCode" 형태의 키 저장
  const [analysisCellConfirms, setAnalysisCellConfirms] = useState<Set<string>>(new Set());

  // ✅ 고장 인과관계 팝업 상태
  const [isFailureChainPopupOpen, setIsFailureChainPopupOpen] = useState(false);
  const [selectedProcessNoForPopup, setSelectedProcessNoForPopup] = useState<string>('');
  const [selectedProcessNameForPopup, setSelectedProcessNameForPopup] = useState<string>('');
  const [failureChains, setFailureChains] = useState<FailureChain[]>([]);

  // =====================================================
  // 훅에서 핸들러 가져오기
  // =====================================================

  // ✅ 자동 저장 및 백업 기능 (데이터 변경 시 3초 후 자동 localStorage 저장)
  const {
    createBackup,
    getBackupList,
    restoreBackup,
    deleteBackup,
  } = useAutoSave({
    flatData,
    isLoaded,
    debounceMs: 3000,
  });

  // 백업 관련 상태
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupList, setBackupList] = useState<BackupInfo[]>([]);

  // 통계 및 관계형 데이터 (먼저 호출해야 getRelationData 사용 가능)
  const previewData = flatData.filter(d => d.itemCode === previewColumn);
  const { stats, getRelationData, relationData } = useRelationDataHook(flatData, relationTab);

  // ✅ processNo → A1 value(실제 공정번호) 매핑 생성 (미리보기 표시용)
  const processNoToA1Value = useMemo(() => {
    const map = new Map<string, string>();
    flatData.filter(d => d.itemCode === 'A1').forEach(d => {
      if (d.value) {
        map.set(d.processNo, d.value);
      }
    });
    return map;
  }, [flatData]);

  // ✅ 공정번호 표시 헬퍼 (내부 processNo → A1 value로 변환)
  const getDisplayProcessNo = (processNo: string) => {
    return processNoToA1Value.get(processNo) || processNo;
  };

  /** FMEA 기초정보 미리 보기 데이터 다운로드 */
  const handleDownloadPreview = () => utilDownloadPreview(previewColumn, flatData);

  // 미리보기 핸들러 (훅에서 가져옴)
  const {
    handleAllDelete,
    handleDeleteSelected,
    handleRowSelect,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleSavePreview,
  } = usePreviewHandlers({
    flatData,
    setFlatData,
    previewColumn,
    selectedRows,
    setSelectedRows,
    draggedIndex,
    setDraggedIndex,
    setIsSaved,
    setIsSaving,
    setDirty,
    // ✅ 항상 DB에 저장 (mode 무관) - 현재 flatData에 있는 항목만 교체
    externalPersist: async (data: ImportedFlatData[]) => {
      try {
        // flatData에 포함된 고유 항목 코드 추출
        const itemCodesInData = [...new Set(data.map(d => d.itemCode).filter(Boolean))];

        const res = await saveMasterDataset({
          datasetId: masterDatasetId,
          name: masterDatasetName || 'MASTER',
          setActive: true,
          replace: true,
          // ✅ 핵심: flatData에 있는 항목만 교체 (다른 항목 보존)
          replaceItemCodes: itemCodesInData,
          relationData: null,
          flatData: data,
        });
        if (!res.ok) {
          console.warn('[PFMEA Import] DB master save failed (localStorage kept)');
          alert('⚠️ DB 저장 실패! 로컬에만 저장되었습니다. 새로고침 시 데이터가 복원되지 않을 수 있습니다.');
          return;
        }
        if (res.datasetId) setMasterDatasetId(res.datasetId);
        console.log(`✅ DB 저장 완료: ${data.length}건 [항목: ${itemCodesInData.join(', ')}]`);
      } catch (error) {
        console.error('[PFMEA Import] DB save error:', error);
        alert('⚠️ DB 저장 오류! 로컬에만 저장되었습니다.');
      }
    },
  });

  // 관계형 핸들러 (훅에서 가져옴)
  const {
    handleRelationRowSelect,
    handleRelationDeleteSelected,
    handleRelationAllDelete,
    handleSaveRelation,
  } = useRelationHandlers({
    flatData,
    setFlatData,
    relationTab,
    selectedRelationRows,
    setSelectedRelationRows,
    getRelationData,
    setIsSaved,
    setDirty,      // ✅ 변경 상태 표시
    setIsSaving,   // ✅ 저장 중 상태
    relationFileInputRef,
  });

  // =====================================================
  // 개별 입포트 및 관계형 핸들러 (유틸리티 함수 래퍼)
  // =====================================================

  /** 개별 입포트 파일 선택 */
  const handlePartialFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await utilPartialFileSelect(file, {
      partialItemCode,
      setPartialItemCode,  // 파일명 기반 자동 선택용
      setPartialFileName,
      setIsPartialParsing,
      setPartialPendingData,
      flatData,  // A1 공정번호 매핑용
    });
    // 같은 파일 재선택 가능하도록 input 리셋
    if (partialFileInputRef.current) {
      partialFileInputRef.current.value = '';
    }
  };

  /** 개별 입포트 실행 */
  const handlePartialImport = () => {
    utilPartialImport(
      partialItemCode,
      partialPendingData,
      flatData,
      setFlatData,
      setPartialPendingData,
      setPreviewColumn,
      setIsSaved
    );
    // Import 후 파일명 초기화
    setPartialFileName('');
  };

  /** 관계형 데이터 Excel 다운로드 */
  const handleRelationDownload = () => utilRelationDownload(relationTab, getRelationData);

  /** 관계형 데이터 Excel 입포트 */
  const handleRelationImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await utilRelationImport(file, relationTab, flatData, setFlatData, setIsSaved, relationFileInputRef);
  };

  // =====================================================
  // 고장 인과관계 팝업 핸들러
  // =====================================================

  /** 고장형태/원인/영향 셀 클릭 시 팝업 열기 */
  const handleOpenFailureChainPopup = (processNo: string) => {
    console.log('🔗 handleOpenFailureChainPopup 호출됨:', processNo);

    // processNo는 내부 키값 (예: "proc-0", "proc-1")
    // A1 기초정보에서 해당 processNo의 공정번호(value)와 공정명(A2) 찾기
    const a1Item = flatData.find(d => d.processNo === processNo && d.itemCode === 'A1');
    const a2Item = flatData.find(d => d.processNo === processNo && d.itemCode === 'A2');

    console.log('🔗 찾은 A1:', a1Item, 'A2:', a2Item);

    const displayProcessNo = a1Item?.value || processNo;
    const processName = a2Item?.value || '';

    setSelectedProcessNoForPopup(processNo);
    setSelectedProcessNameForPopup(`${displayProcessNo} - ${processName}`);
    setIsFailureChainPopupOpen(true);

    console.log('🔗 팝업 열기:', { processNo, displayProcessNo, processName });
  };

  /** 인과관계 체인 저장 */
  const handleSaveFailureChain = (chain: FailureChain) => {
    setFailureChains(prev => [...prev, chain]);
  };

  /** 인과관계 체인 삭제 */
  const handleDeleteFailureChain = (chainId: string) => {
    setFailureChains(prev => prev.filter(c => c.id !== chainId));
  };

  // 페이지 로드 시 FMEA 목록 및 저장된 데이터 불러오기
  useEffect(() => {
    // ✅ FMEA 목록 로드 - DB API 우선 (FMEA 리스트와 동일한 소스)
    const loadFmeaList = async () => {
      try {
        // 1. DB에서 프로젝트 목록 조회
        const response = await fetch('/api/fmea/projects');
        const result = await response.json();
        
        if (result.success && result.projects.length > 0) {
          // DB 데이터 사용
          console.log('✅ [Import] DB에서 FMEA 목록 로드:', result.projects.length, '건');
          setFmeaList(result.projects);
          
          // URL에서 id 파라미터가 있으면 해당 FMEA 선택
          if (idFromUrl) {
            setSelectedFmeaId(idFromUrl);
          } else if (!selectedFmeaId && result.projects.length > 0) {
            setSelectedFmeaId(result.projects[0].id);
          }
          return;
        }
      } catch (error) {
        console.warn('⚠️ [Import] DB API 호출 실패, localStorage 폴백:', error);
      }
      
      // 2. DB에 데이터 없으면 localStorage 확인 (폴백)
      const storedProjects = localStorage.getItem('pfmea-projects');
      if (storedProjects) {
        try {
          const projects: FMEAProject[] = JSON.parse(storedProjects);
          console.log('📦 [Import] localStorage에서 FMEA 목록 로드:', projects.length, '건');
          setFmeaList(projects);
          
          if (idFromUrl) {
            setSelectedFmeaId(idFromUrl);
          } else if (!selectedFmeaId && projects.length > 0) {
            setSelectedFmeaId(projects[0].id);
          }
        } catch (e) {
          console.error('FMEA 목록 로드 실패:', e);
        }
      }
    };
    
    loadFmeaList();
    
    // ✅ mode=new: 자동 로드 금지 (빈 상태로 시작)
    if (mode === 'new') {
      setIsLoaded(true);
      return;
    }

    const load = async () => {
      // ✅ DB Master 데이터 우선 로드 (항상 시도)
      try {
        const loaded = await loadActiveMasterDataset();
        if (loaded.flatData.length > 0) {
          // ✅ 빈 값 제외 (DB 저장 기준과 일치, UI 표시도 동일하게)
          const validData = loaded.flatData.filter((d: any) => d.value && d.value.trim() !== '');
          setFlatData(validData);
          setMasterDatasetId(loaded.datasetId);
          setMasterDatasetName(loaded.datasetName || 'MASTER');
          setFileName(`DB Master: ${loaded.datasetName || 'MASTER'} (${validData.length}건)`);
          console.log(`✅ DB Master 로드 완료: ${validData.length}건`);
          setIsLoaded(true);
          return;
        }
      } catch (e) {
        console.warn('[PFMEA Import] DB master load failed, fallback to localStorage:', e);
      }

      // localStorage 폴백 (DB 로드 실패 시)
      const savedData = localStorage.getItem('pfmea_master_data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // ✅ 빈 값 제외 (DB 저장 기준과 일치)
            const normalized = parsed
              .map((d: any) => ({
                ...d,
                createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
              }))
              .filter((d: any) => d.value && d.value.trim() !== '');
            setFlatData(normalized);
            const savedAt = localStorage.getItem('pfmea_saved_at');
            setFileName(`저장된 데이터 (${savedAt ? new Date(savedAt).toLocaleString('ko-KR') : ''})`);
          }
        } catch (e) {
          console.error('저장된 데이터 파싱 오류:', e);
        }
      }
      setIsLoaded(true);
    };

    void load();
  }, [idFromUrl, selectedFmeaId, mode]);

  // 파일 선택 및 Import 핸들러 (훅에서 가져옴)
  const { handleFileSelect, handleImport } = useImportFileHandlers({
    setFileName,
    setIsParsing,
    setImportSuccess,
    setParseResult,
    setPendingData,
    setFlatData,
    setIsImporting,
    setMasterDatasetId,
    setIsSaved,    // ✅ 저장 상태 표시
    setDirty,      // ✅ 변경 상태 표시
    flatData,
    pendingData,
    parseMultiSheetExcel,
    saveToMaster: true, // ✅ Master FMEA에 자동 저장
  });

  // =====================================================
  // 데이터 비교 기능 핸들러
  // =====================================================

  /** 비교용 파일 선택 핸들러 */
  const handleCompareFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 현재 데이터 저장 (비교 기준)
      setPreviousFlatData([...flatData]);

      // 새 파일 파싱
      const result = await parseMultiSheetExcel(file);
      if (!result.success) {
        alert('파일 파싱에 실패했습니다: ' + result.errors.join(', '));
        return;
      }

      // flatData 형식으로 변환
      const newFlatData: ImportedFlatData[] = [];

      // 공정 데이터 변환
      result.processes.forEach(proc => {
        const processNo = proc.processNo;

        // A2: 공정명
        if (proc.processName) {
          newFlatData.push({
            id: `compare-A2-${processNo}-${Date.now()}`,
            processNo,
            category: 'A',
            itemCode: 'A2',
            value: proc.processName,
            createdAt: new Date(),
          });
        }

        // A3: 공정기능
        proc.processDesc.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-A3-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'A',
              itemCode: 'A3',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // A4: 제품특성
        proc.productChars.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-A4-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'A',
              itemCode: 'A4',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // A5: 고장형태
        proc.failureModes.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-A5-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'A',
              itemCode: 'A5',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // A6: 검출관리
        proc.detectionCtrls.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-A6-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'A',
              itemCode: 'A6',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // B1: 작업요소
        proc.workElements.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-B1-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'B',
              itemCode: 'B1',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // B2: 요소기능
        proc.elementFuncs.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-B2-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'B',
              itemCode: 'B2',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // B3: 공정특성
        proc.processChars.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-B3-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'B',
              itemCode: 'B3',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // B4: 고장원인
        proc.failureCauses.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-B4-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'B',
              itemCode: 'B4',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // B5: 예방관리
        proc.preventionCtrls.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-B5-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'B',
              itemCode: 'B5',
              value: val,
              createdAt: new Date(),
            });
          }
        });
      });

      // 완제품 데이터 변환
      result.products.forEach((prod, idx) => {
        const processNo = prod.productProcessName || `C-${idx + 1}`;

        // C1: 구분
        if (prod.productProcessName) {
          newFlatData.push({
            id: `compare-C1-${idx}-${Date.now()}`,
            processNo: 'ALL',
            category: 'C',
            itemCode: 'C1',
            value: prod.productProcessName,
            createdAt: new Date(),
          });
        }

        // C2: 제품기능
        prod.productFuncs.forEach((val, fidx) => {
          if (val) {
            newFlatData.push({
              id: `compare-C2-${idx}-${fidx}-${Date.now()}`,
              processNo: 'ALL',
              category: 'C',
              itemCode: 'C2',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // C3: 요구사항
        prod.requirements.forEach((val, ridx) => {
          if (val) {
            newFlatData.push({
              id: `compare-C3-${idx}-${ridx}-${Date.now()}`,
              processNo: 'ALL',
              category: 'C',
              itemCode: 'C3',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // C4: 고장영향
        prod.failureEffects.forEach((val, eidx) => {
          if (val) {
            newFlatData.push({
              id: `compare-C4-${idx}-${eidx}-${Date.now()}`,
              processNo: 'ALL',
              category: 'C',
              itemCode: 'C4',
              value: val,
              createdAt: new Date(),
            });
          }
        });
      });

      // 비교 수행
      const changes = compareData(flatData, newFlatData);
      setCompareChanges(changes);
      setIsCompareModalOpen(true);

      console.log(`📊 비교 완료: 추가 ${changes.filter(c => c.changeType === 'added').length}, 수정 ${changes.filter(c => c.changeType === 'modified').length}, 삭제 ${changes.filter(c => c.changeType === 'removed').length}`);

    } catch (error) {
      console.error('비교 파일 처리 오류:', error);
      alert('파일 처리 중 오류가 발생했습니다.');
    }

    // 파일 입력 초기화
    if (compareFileInputRef.current) {
      compareFileInputRef.current.value = '';
    }
  };

  /** ✅ 비교 모드 시작 - DB 데이터와 새 데이터 비교 */
  const handleStartCompareMode = async () => {
    // 새로 입포트된 데이터가 없으면 경고
    const newData = flatData.filter(d => d.itemCode === previewColumn);
    if (newData.length === 0) {
      alert('비교할 새 데이터가 없습니다. 먼저 데이터를 입포트하세요.');
      return;
    }

    try {
      // DB에서 현재 저장된 원본 데이터 로드
      const loaded = await loadActiveMasterDataset();
      if (loaded.flatData.length > 0) {
        const validData = loaded.flatData.filter((d: any) => d.value && d.value.trim() !== '');
        setDbData(validData);
        setIsCompareMode(true);
        setConfirmSelections(new Set()); // 초기화
        console.log(`📊 비교 모드 시작: DB ${validData.filter((d: any) => d.itemCode === previewColumn).length}건 vs 새 데이터 ${newData.length}건`);
      } else {
        alert('DB에 저장된 기존 데이터가 없습니다.');
      }
    } catch (error) {
      console.error('DB 데이터 로드 오류:', error);
      alert('DB 데이터를 불러오는 중 오류가 발생했습니다.');
    }
  };

  /** ✅ 비교 모드 종료 */
  const handleCancelCompareMode = () => {
    setIsCompareMode(false);
    setDbData([]);
    setConfirmSelections(new Set());
  };

  /** ✅ 확정 선택 토글 */
  const handleToggleConfirm = (id: string) => {
    setConfirmSelections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /** ✅ 전체 확정 선택 */
  const handleSelectAllConfirm = (checked: boolean) => {
    if (checked) {
      const allIds = flatData.filter(d => d.itemCode === previewColumn).map(d => d.id);
      setConfirmSelections(new Set(allIds));
    } else {
      setConfirmSelections(new Set());
    }
  };

  /** ✅ 확정 저장 - 선택된 새 데이터로 DB 업데이트 (기존 데이터 완전 대체) */
  const handleConfirmSave = async () => {
    if (confirmSelections.size === 0) {
      alert('확정할 항목을 선택하세요.');
      return;
    }

    try {
      // 확정된 항목 (새 데이터)
      const confirmedItems = flatData.filter(d => confirmSelections.has(d.id));

      // ✅ 핵심 수정: flatData 기반으로 업데이트 (다른 항목들 보존)
      // 1. 현재 항목코드(previewColumn)가 아닌 데이터: flatData 그대로 유지
      // 2. 현재 항목코드(previewColumn)인 데이터: 확정된 새 데이터로 대체
      // 3. flatData에 없지만 dbData에 있는 다른 항목들도 보존

      let updatedData: ImportedFlatData[] = [];
      const processedIds = new Set<string>();

      // ✅ A1(공정번호) 변경 시 연관 데이터 processNo 동기화
      // DB의 기존 공정번호 → 새 공정번호 매핑 생성
      const processNoMapping: Map<string, string> = new Map();
      if (previewColumn === 'A1') {
        // 기존 DB의 A1 데이터
        const dbA1Items = dbData.filter(d => d.itemCode === 'A1');
        // 새로 확정된 A1 데이터
        confirmedItems.forEach((newItem, idx) => {
          // 동일 순서의 DB 항목과 매핑 (공정번호가 변경된 경우)
          const dbItem = dbA1Items[idx];
          if (dbItem && dbItem.value !== newItem.value) {
            // 기존 공정번호(dbItem.value) → 새 공정번호(newItem.value)
            processNoMapping.set(dbItem.value, newItem.value);
            console.log(`📋 공정번호 변경 감지: "${dbItem.value}" → "${newItem.value}"`);
          }
        });
      }

      // flatData에서 현재 항목코드가 아닌 것은 그대로 유지 (processNo 동기화 적용)
      flatData.filter(d => d.itemCode !== previewColumn).forEach(item => {
        // A1 변경 시 연관 데이터의 processNo도 업데이트
        if (processNoMapping.size > 0 && processNoMapping.has(item.processNo)) {
          updatedData.push({
            ...item,
            processNo: processNoMapping.get(item.processNo)!
          });
        } else {
          updatedData.push(item);
        }
        processedIds.add(item.id);
      });

      // 현재 항목코드는 확정된 새 데이터로 대체
      confirmedItems.forEach(item => {
        updatedData.push(item);
        processedIds.add(item.id);
      });

      // dbData에만 있고 flatData에 없는 데이터도 보존 (현재 항목코드 제외, processNo 동기화 적용)
      dbData.filter(d => d.itemCode !== previewColumn).forEach(dbItem => {
        if (!processedIds.has(dbItem.id)) {
          // processNo 매핑 적용
          const newProcessNo = processNoMapping.has(dbItem.processNo)
            ? processNoMapping.get(dbItem.processNo)!
            : dbItem.processNo;

          // id가 다르더라도 같은 processNo + itemCode가 있는지 확인
          const exists = updatedData.some(
            u => u.processNo === newProcessNo && u.itemCode === dbItem.itemCode
          );
          if (!exists) {
            updatedData.push({
              ...dbItem,
              processNo: newProcessNo
            });
          }
        }
      });

      const dbCount = dbData.filter(d => d.itemCode === previewColumn).length;

      // ✅ A1 변경 시 전체 데이터 교체 (processNo 연동 때문)
      const itemCodesToReplace = processNoMapping.size > 0
        ? undefined  // 전체 교체
        : previewColumn;  // 현재 항목만 교체

      // DB에 저장
      const res = await saveMasterDataset({
        datasetId: masterDatasetId,
        name: masterDatasetName || 'MASTER',
        setActive: true,
        replace: true,
        replaceItemCodes: itemCodesToReplace,
        flatData: updatedData,
      });

      if (res.ok) {
        if (res.datasetId) {
          setMasterDatasetId(res.datasetId);
        }
        setFlatData(updatedData);
        setIsSaved(true);
        setIsCompareMode(false);
        setDbData([]);
        setConfirmSelections(new Set());

        const syncMsg = processNoMapping.size > 0
          ? `\n⚠️ 공정번호 변경으로 연관 데이터(${processNoMapping.size}건) 동기화됨`
          : '';
        console.log(`✅ 기초정보 확정 저장 완료: ${confirmedItems.length}건 [항목: ${previewColumn}]${syncMsg}`);
        alert(`✅ ${confirmedItems.length}건의 새 데이터가 확정 저장되었습니다.\n기존 데이터(${dbCount}건)가 대체되었습니다.${syncMsg}`);
      } else {
        alert('저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('확정 저장 오류:', error);
      alert('확정 저장 중 오류가 발생했습니다.');
    }
  };

  /** 비교 결과 적용 핸들러 */
  const handleApplyChanges = async (selectedChanges: ChangeItem[]) => {
    try {
      // 선택된 변경사항 적용
      const updatedData = applyChanges(flatData, selectedChanges);
      setFlatData(updatedData);
      setDirty(true);
      setIsSaved(false);

      // 변경된 항목 코드 추출
      const changedItemCodes = [...new Set(selectedChanges.map(c => c.itemCode).filter(Boolean))];

      // DB에 저장 - 변경된 항목만 교체
      const res = await saveMasterDataset({
        datasetId: masterDatasetId,
        name: masterDatasetName || 'MASTER',
        setActive: true,
        replace: true,
        replaceItemCodes: changedItemCodes.length > 0 ? changedItemCodes : undefined,
        flatData: updatedData,
      });

      if (res.ok) {
        if (res.datasetId) {
          setMasterDatasetId(res.datasetId);
        }
        setIsSaved(true);
        alert(`✅ ${selectedChanges.length}건의 변경사항이 적용되었습니다.`);
      } else {
        alert('저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('변경사항 적용 오류:', error);
      alert('변경사항 적용 중 오류가 발생했습니다.');
    }
  };

  // =====================================================
  // ✅ 분석 데이터 비교 모드 핸들러 (셀 단위)
  // =====================================================

  /** ✅ 분석 데이터 비교 모드 시작 - DB 데이터와 새 데이터 비교 */
  const handleStartAnalysisCompareMode = async () => {
    // 현재 탭에 해당하는 새 데이터 확인
    const tabPrefix = relationTab; // 'A', 'B', 'C'
    const newData = flatData.filter(d => d.itemCode?.startsWith(tabPrefix));
    if (newData.length === 0) {
      alert('비교할 새 데이터가 없습니다. 먼저 데이터를 입포트하세요.');
      return;
    }

    // ✅ 기초정보(A1) 확인: 분석데이터 비교 전에 기초정보가 있어야 함
    const a1Data = flatData.filter(d => d.itemCode === 'A1');
    if (a1Data.length === 0 && tabPrefix !== 'C') {
      alert('⚠️ 기초정보(L2-1 공정번호)가 없습니다.\n먼저 기초정보를 입력하거나 DB에서 불러오세요.');
      return;
    }

    // ✅ 분석데이터의 processNo가 기초정보(A1)에 있는지 확인
    if (tabPrefix !== 'C') {
      const validProcessNos = new Set(a1Data.map(d => d.processNo));
      const invalidData = newData.filter(d => !validProcessNos.has(d.processNo));
      if (invalidData.length > 0) {
        const invalidProcessNos = [...new Set(invalidData.map(d => d.processNo))];
        alert(`⚠️ 기초정보에 없는 공정번호가 분석데이터에 있습니다:\n${invalidProcessNos.join(', ')}\n\n기초정보와 분석데이터의 공정번호를 일치시켜 주세요.`);
        return;
      }
    }

    try {
      // DB에서 현재 저장된 원본 데이터 로드
      const loaded = await loadActiveMasterDataset();
      if (loaded.flatData.length > 0) {
        const validData = loaded.flatData.filter((d: any) => d.value && d.value.trim() !== '');
        setAnalysisDbData(validData);
        setIsAnalysisCompareMode(true);
        setAnalysisCellConfirms(new Set()); // 초기화
        const dbCount = validData.filter((d: any) => d.itemCode?.startsWith(tabPrefix)).length;
        console.log(`📊 분석 비교 모드 시작: DB ${dbCount}건 vs 새 데이터 ${newData.length}건`);
      } else {
        alert('DB에 저장된 기존 데이터가 없습니다.');
      }
    } catch (error) {
      console.error('DB 데이터 로드 오류:', error);
      alert('DB 데이터를 불러오는 중 오류가 발생했습니다.');
    }
  };

  /** ✅ 분석 데이터 비교 모드 종료 */
  const handleCancelAnalysisCompareMode = () => {
    setIsAnalysisCompareMode(false);
    setAnalysisDbData([]);
    setAnalysisCellConfirms(new Set());
  };

  /** ✅ 분석 셀 확정 토글 (processNo-itemCode 키 사용) */
  const handleToggleAnalysisCellConfirm = (processNo: string, itemCode: string) => {
    const key = `${processNo}-${itemCode}`;
    setAnalysisCellConfirms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  /** ✅ 분석 전체 확정 선택 (현재 탭의 모든 변경된 셀) */
  const handleSelectAllAnalysisConfirm = (checked: boolean) => {
    if (checked) {
      const tabPrefix = relationTab;
      const allKeys = new Set<string>();
      // 새 데이터에서 변경된 셀만 선택
      flatData
        .filter(d => d.itemCode?.startsWith(tabPrefix))
        .forEach(newItem => {
          const dbItem = analysisDbData.find(
            d => d.processNo === newItem.processNo && d.itemCode === newItem.itemCode
          );
          // 변경되었거나 신규인 경우만 선택
          if (!dbItem || dbItem.value !== newItem.value) {
            allKeys.add(`${newItem.processNo}-${newItem.itemCode}`);
          }
        });
      setAnalysisCellConfirms(allKeys);
    } else {
      setAnalysisCellConfirms(new Set());
    }
  };

  /** ✅ 분석 확정 저장 - 선택된 셀의 새 데이터로 DB 업데이트 */
  const handleAnalysisConfirmSave = async () => {
    if (analysisCellConfirms.size === 0) {
      alert('확정할 셀을 선택하세요.');
      return;
    }

    try {
      // 확정된 셀의 키 목록
      const confirmedKeys = analysisCellConfirms;

      // 확정된 항목의 고유 itemCode 추출 (현재 탭 기준)
      const confirmedItemCodes = [...new Set(
        [...confirmedKeys].map(key => key.split('-')[1]).filter(Boolean)
      )];

      // ✅ 데이터 일관성 검증: 분석데이터의 processNo가 기초정보(A1)에 존재하는지 확인
      const validProcessNos = new Set(
        flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo)
      );
      const invalidProcessNos: string[] = [];
      [...confirmedKeys].forEach(key => {
        const processNo = key.split('-')[0];
        if (processNo !== 'ALL' && !validProcessNos.has(processNo)) {
          invalidProcessNos.push(processNo);
        }
      });

      if (invalidProcessNos.length > 0) {
        const uniqueInvalid = [...new Set(invalidProcessNos)];
        alert(`⚠️ 기초정보에 없는 공정번호가 있습니다:\n${uniqueInvalid.join(', ')}\n\n먼저 기초정보(L2-1 공정번호)를 확인하세요.`);
        return;
      }

      // ✅ 핵심 수정: flatData 기반으로 업데이트 (기존 데이터 보존)
      // 1. 확정된 셀은 flatData(새 데이터)의 값 사용
      // 2. 확정되지 않은 셀은 analysisDbData(DB 원본)의 값 사용
      // 3. 다른 탭의 데이터(확정된 itemCode와 무관한)는 그대로 유지

      const updatedData: ImportedFlatData[] = [];
      const processedKeys = new Set<string>();

      // 먼저 flatData의 모든 데이터를 순회
      flatData.forEach(item => {
        const key = `${item.processNo}-${item.itemCode}`;

        // 확정된 itemCode가 아닌 경우: flatData 그대로 유지 (다른 탭 데이터 보존)
        if (!confirmedItemCodes.includes(item.itemCode)) {
          updatedData.push(item);
          processedKeys.add(key);
          return;
        }

        // 확정된 itemCode인 경우:
        if (confirmedKeys.has(key)) {
          // 확정된 셀: 새 데이터(flatData) 사용
          updatedData.push(item);
          processedKeys.add(key);
        } else {
          // 확정되지 않은 셀: DB 원본 데이터 사용
          const dbItem = analysisDbData.find(
            d => d.processNo === item.processNo && d.itemCode === item.itemCode
          );
          if (dbItem) {
            updatedData.push(dbItem);
            processedKeys.add(key);
          }
          // DB에도 없으면 새 데이터 무시 (확정되지 않았으므로)
        }
      });

      // DB에만 있고 flatData에 없는 데이터도 보존 (확정된 itemCode 제외)
      analysisDbData.forEach(dbItem => {
        const key = `${dbItem.processNo}-${dbItem.itemCode}`;
        if (!processedKeys.has(key) && !confirmedItemCodes.includes(dbItem.itemCode)) {
          updatedData.push(dbItem);
        }
      });

      // 확정된 셀 개수 계산
      const confirmedCount = [...confirmedKeys].length;

      // DB에 저장 - 확정된 항목들만 교체
      const res = await saveMasterDataset({
        datasetId: masterDatasetId,
        name: masterDatasetName || 'MASTER',
        setActive: true,
        replace: true,
        replaceItemCodes: confirmedItemCodes, // ✅ 확정된 항목만 교체
        flatData: updatedData,
      });

      if (res.ok) {
        if (res.datasetId) {
          setMasterDatasetId(res.datasetId);
        }
        setFlatData(updatedData);
        setIsSaved(true);
        setIsAnalysisCompareMode(false);
        setAnalysisDbData([]);
        setAnalysisCellConfirms(new Set());
        console.log(`✅ 분석 확정 저장 완료: ${confirmedCount}건 [항목: ${confirmedItemCodes.join(', ')}]`);
        alert(`✅ ${confirmedCount}건의 새 데이터가 확정 저장되었습니다.`);
      } else {
        alert('저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('분석 확정 저장 오류:', error);
      alert('확정 저장 중 오류가 발생했습니다.');
    }
  };

  /** ✅ 셀이 변경되었는지 확인하는 헬퍼 함수 */
  const isAnalysisCellChanged = (processNo: string, itemCode: string, newValue: string | undefined): boolean => {
    const dbItem = analysisDbData.find(d => d.processNo === processNo && d.itemCode === itemCode);
    if (!dbItem) return true; // 신규
    return dbItem.value !== newValue;
  };

  /** ✅ 셀이 신규인지 확인하는 헬퍼 함수 */
  const isAnalysisCellNew = (processNo: string, itemCode: string): boolean => {
    return !analysisDbData.find(d => d.processNo === processNo && d.itemCode === itemCode);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden font-[Malgun_Gothic,sans-serif]">
      {/* 상단 고정 바로가기 메뉴 */}
      <PFMEATopNav selectedFmeaId={selectedFmeaId} />

      {/* 스크롤 가능한 워크시트 영역 */}
      <div className="flex-1 overflow-y-auto pt-9 px-3 pb-3 bg-gray-100">
        {/* 제목 */}
        <h1 className="text-base font-bold text-[#00587a] mb-3">
          📥 PFMEA 기초정보 Excel Import
        </h1>

        {/* FMEA 유형별 안내 메시지 (등록화면에서 넘어온 경우) */}
        {mode === 'excel' && fmeaTypeFromUrl && (
          <div className={`mb-3 px-4 py-3 rounded-lg border-2 ${
            fmeaTypeFromUrl === 'M' ? 'bg-purple-50 border-purple-300' :
            fmeaTypeFromUrl === 'F' ? 'bg-blue-50 border-blue-300' :
            'bg-green-50 border-green-300'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {fmeaTypeFromUrl === 'M' ? '🟣' : fmeaTypeFromUrl === 'F' ? '🔵' : '🟢'}
              </span>
              <div>
                <div className={`font-bold text-sm ${
                  fmeaTypeFromUrl === 'M' ? 'text-purple-700' :
                  fmeaTypeFromUrl === 'F' ? 'text-blue-700' :
                  'text-green-700'
                }`}>
                  {fmeaTypeFromUrl === 'M' ? 'Master' : fmeaTypeFromUrl === 'F' ? 'Family' : 'Part'} FMEA 기초정보 Import
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  아래에서 FMEA명을 선택한 후, 엑셀 파일을 업로드하세요.
                  {fmeaTypeFromUrl === 'M' && ' Master FMEA는 다른 FMEA의 기준이 됩니다.'}
                  {fmeaTypeFromUrl === 'F' && ' Family FMEA는 동일 제품군에 적용됩니다.'}
                  {fmeaTypeFromUrl === 'P' && ' Part FMEA는 개별 부품에 적용됩니다.'}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* 기초정보 다운로드 테이블 */}
      <div className={tw.tableWrapper}>
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-[100px]" />
          <col />
          <col className="w-[150px]" />
          <col className="w-[80px]" />
          <col className="w-[80px]" />
        </colgroup>
        <thead>
          <tr>
            <th className={tw.headerCell}>구 분</th>
            <th className={tw.headerCell}>설명</th>
            <th className={tw.headerCellSm}>템플렛 선택</th>
            <th className={tw.headerCellSm}>샘플다운로드</th>
            <th className={tw.headerCellSm}>템플렛 다운로드</th>
          </tr>
        </thead>
        <tbody>
          {/* 1행: FMEA전체 */}
          <tr>
            <td className={tw.rowHeaderSm}>FMEA전체</td>
            <td className={tw.cell + " text-center"}>FMEA명 선택 템플렛</td>
            <td className={tw.cellPad}>
              <select
                className={tw.select}
                value={selectedFmeaId}
                onChange={(e) => setSelectedFmeaId(e.target.value)}
              >
                <option value="">선택</option>
                {fmeaList.map(f => (<option key={f.id} value={f.id}>{(f as any).fmeaNo || f.fmeaInfo?.subject || 'FMEA'}</option>))}
              </select>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => {
                const selectedFmea = fmeaList.find(f => f.id === selectedFmeaId);
                const fmeaName = selectedFmea ? ((selectedFmea as any).fmeaNo || selectedFmea.fmeaInfo?.subject || 'FMEA') : 'PFMEA_기초정보';
                downloadSampleTemplate(fmeaName);
              }} className={tw.btnPrimary}>드롭다운</button>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => {
                const selectedFmea = fmeaList.find(f => f.id === selectedFmeaId);
                const fmeaName = selectedFmea ? ((selectedFmea as any).fmeaNo || selectedFmea.fmeaInfo?.subject || 'FMEA') : 'PFMEA_기초정보';
                downloadEmptyTemplate(fmeaName);
              }} className={tw.btnPrimary}>드롭다운</button>
            </td>
          </tr>
          {/* 2행: 마스터 FMEA */}
          <tr>
            <td className={tw.rowHeader}>마스터 FMEA</td>
            <td className={tw.cell + " text-center"}>마스터 FMEA 기초정보</td>
            <td className={tw.cellPad}>
              <select className={tw.select} disabled>
                <option value="">등록된 마스터 없음</option>
              </select>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadEmptyTemplate('마스터_FMEA')} className={tw.btnGreen}>드롭다운</button>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadEmptyTemplate('마스터_FMEA')} className={tw.btnGreen}>드롭다운</button>
            </td>
          </tr>
          {/* 3행: 패밀리 FMEA */}
          <tr>
            <td className={tw.rowHeader}>패밀리 FMEA</td>
            <td className={tw.cell + " text-center"}>마스터 FMEA 기초정보</td>
            <td className={tw.cellPad}>
              <select className={tw.select} disabled>
                <option value="">등록된 패밀리 없음</option>
              </select>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadEmptyTemplate('패밀리_FMEA')} className={tw.btnBlue}>드롭다운</button>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadEmptyTemplate('패밀리_FMEA')} className={tw.btnBlue}>드롭다운</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      {/* 상단과 메인 영역 사이 간격 */}
      <div className="h-4"></div>

      {/* FMEA 명 선택 (필수) */}
      <div className="flex items-center gap-4 mb-4 px-4 py-2.5 bg-amber-50 border border-amber-400 rounded">
        <span className="font-bold text-red-600 whitespace-nowrap text-xs">⚠️ FMEA 명 입력 필수 :</span>
        <select
          value={selectedFmeaId}
          onChange={(e) => setSelectedFmeaId(e.target.value)}
          className="flex-1 px-2.5 py-1.5 border border-gray-400 rounded text-xs bg-white font-bold"
        >
          {fmeaList.length === 0 && <option value="">FMEA 미등록 - 먼저 FMEA를 등록하세요</option>}
          {fmeaList.map(fmea => (
            <option key={fmea.id} value={fmea.id}>
              {fmea.fmeaInfo?.subject || fmea.project?.productName || fmea.id}
            </option>
          ))}
        </select>
        <button 
          onClick={() => window.location.href = '/pfmea/register'}
          className="px-3 py-1.5 bg-blue-600 text-white border-none rounded cursor-pointer text-[11px] font-bold whitespace-nowrap"
        >
          + 신규 등록
        </button>
      </div>

      {/* 블록 1: FMEA 기초정보 입력 + FMEA 분석 데이타 입력 (5:5 비율) */}
      <div className="flex gap-5 items-start mb-5">
        {/* 좌측: FMEA 기초정보 입력 - 50% */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-bold mb-1.5 text-[#00587a]">FMEA 기초정보 입력</h3>
          <div className={tw.tableWrapper}>
            <table className="w-full border-collapse table-fixed">
              <colgroup><col className="w-[90px]" /><col /><col className="w-20" /><col className="w-20" /></colgroup>
              <tbody>
                <tr>
                  <td className={tw.rowHeader}>전체 입포트</td>
                  <td className={tw.cell}>
                    {isParsing ? (
                      <span className="text-gray-400">파싱 중...</span>
                    ) : fileName ? (
                      <span className="text-[#00587a]">{fileName}</span>
                    ) : null}
                    {pendingData.length > 0 && !importSuccess && (
                      <span className="ml-2 text-yellow-700 text-[10px]">({pendingData.length}건 대기중)</span>
                    )}
                    {importSuccess && (
                      <span className="ml-2 text-green-700 text-[10px]">
                        <CheckCircle size={12} className="align-middle mr-0.5 inline" />
                        Import 완료!
                      </span>
                    )}
                  </td>
                  <td className={tw.cellPad}>
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleFileSelect}
                        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                        ref={fileInputRef}
                      />
                      <span className={tw.btnBrowse}>찾아보기</span>
                    </label>
                  </td>
                  <td className={tw.cellPad}>
                    <button 
                      onClick={handleImport}
                      disabled={pendingData.length === 0 || isImporting}
                      className={pendingData.length > 0 ? tw.btnSuccess : tw.btnSuccessDisabled}
                    >
                      {isImporting ? '처리중...' : 'Import'}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className={tw.rowHeader}>개별 입포트</td>
                  <td className={tw.cell}>
                    <div className="flex items-center gap-2">
                      {/* 항목 선택 드롭다운 - 선택 시 미리보기도 연동 */}
                      <select
                        value={partialItemCode}
                        onChange={(e) => {
                          const newCode = e.target.value;
                          setPartialItemCode(newCode);
                          setPreviewColumn(newCode); // 미리보기 연동
                        }}
                        className="px-2 py-1 border border-gray-400 rounded text-[11px] bg-[#e0f2fb]"
                      >
                        {PREVIEW_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {/* 파일명 표시 */}
                      {isPartialParsing ? (
                        <span className="text-gray-400 text-[11px]">파싱 중...</span>
                      ) : partialFileName ? (
                        <span className="text-[#00587a] text-[11px]">{partialFileName}</span>
                      ) : null}
                      {partialPendingData.length > 0 && (
                        <span className="text-yellow-700 text-[10px]">({partialPendingData.length}건)</span>
                      )}
                    </div>
                  </td>
                  <td className={tw.cellCenter}>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        ref={partialFileInputRef}
                        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                        onChange={handlePartialFileSelect}
                      />
                      <span className="px-3 py-1 bg-gray-100 border border-gray-400 rounded cursor-pointer text-[11px]">찾아보기</span>
                    </label>
                  </td>
                  <td className={tw.cellCenter}>
                    <button 
                      onClick={handlePartialImport}
                      disabled={partialPendingData.length === 0}
                      className={`px-3.5 py-1 border-none rounded text-[11px] font-bold leading-none ${
                        partialPendingData.length > 0 
                          ? 'bg-green-500 text-white cursor-pointer' 
                          : 'bg-gray-300 text-white cursor-not-allowed'
                      }`}
                    >
                      Import
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 우측: FMEA 분석 데이타 입력 */}
        <div className="flex-1">
          <h3 className="text-[13px] font-bold mb-1.5 text-[#00587a]">FMEA 분석 데이타 입력</h3>
          <div className={tw.tableWrapper}>
            <table className="w-full border-collapse table-fixed">
              <colgroup><col className="w-[100px]" /><col /><col className="w-[85px]" /><col className="w-[85px]" /></colgroup>
              <tbody>
                {/* 전체 입포트 */}
                <tr>
                  <td className={tw.rowHeader}>전체 입포트</td>
                  <td className={tw.cell}>고장형태, 영향 및 원인분석 자료</td>
                  <td className={tw.cellCenter}>
                    <label className="cursor-pointer">
                      <input type="file" accept=".xlsx,.xls" className="hidden" />
                      <span className="inline-block px-3.5 py-1 bg-gray-100 border border-gray-300 rounded text-[11px] font-medium leading-none">찾아보기</span>
                    </label>
                  </td>
                  <td className={tw.cellCenter}>
                    <button className="px-3 py-1 bg-green-500 text-white border-none rounded cursor-pointer text-[11px] font-bold">Import</button>
                  </td>
                </tr>
                {/* 개별 입포트 */}
                <tr>
                  <td className={tw.rowHeader}>개별 입포트</td>
                  <td className={tw.cell}>
                    <div className="flex gap-2">
                      <select
                        className="px-2 py-1 border border-gray-400 rounded text-[11px] bg-orange-50"
                        value={relationTab}
                        onChange={(e) => setRelationTab(e.target.value as 'A' | 'B' | 'C')}
                      >
                        <option value="A">고장형태 분석 자료</option>
                        <option value="B">고장원인 분석 자료</option>
                        <option value="C">고장영향 분석 자료</option>
                      </select>
                    </div>
                  </td>
                  <td className={tw.cellCenter}>
                    <label className="cursor-pointer">
                      <input type="file" accept=".xlsx,.xls" className="hidden" />
                      <span className="inline-block px-3.5 py-1 bg-gray-100 border border-gray-300 rounded text-[11px] font-medium leading-none">찾아보기</span>
                    </label>
                  </td>
                  <td className={tw.cellCenter}>
                    <button className="px-3 py-1 bg-green-500 text-white border-none rounded cursor-pointer text-[11px] font-bold">Import</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 블록 2: FMEA 기초정보 미리 보기 + FMEA 분석 DATA 미리 보기 */}
      <div className="flex gap-5 items-stretch pb-[20px]">
        {/* 좌측: FMEA 기초정보 미리 보기 - 기본 650px, 배율에 따라 반응형 */}
        <div className="min-w-[400px] max-w-[750px] flex flex-col border-2 border-[#00587a] rounded-lg overflow-hidden bg-white shadow-lg" style={{ flex: '1 1 650px' }}>
          {/* FMEA 기초정보 미리 보기 헤더 */}
          <div className="bg-gradient-to-br from-[#00587a] to-[#007a9e] text-white px-4 py-2.5 text-sm font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>📋</span> FMEA 기초정보 미리 보기
            </div>
            {/* 입력 상태 표시 - previewColumn 기준으로 계산 */}
            <div className="flex items-center gap-3 text-[11px] font-normal">
              {(() => {
                const validCount = previewData.filter(d => d.value && d.value.trim() !== '').length;
                const emptyCount = previewData.filter(d => !d.value || d.value.trim() === '').length;
                return (
                  <>
                    <span className="bg-white/20 px-2 py-0.5 rounded">
                      항목: <b className="text-yellow-300">{validCount}</b>건
                    </span>
                    <span className={`px-2 py-0.5 rounded ${emptyCount > 0 ? 'bg-red-500/50' : 'bg-green-500/50'}`}>
                      누락: <b className={emptyCount > 0 ? 'text-red-200' : 'text-green-200'}>{emptyCount}</b>건
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
          
          {/* 탭 + 테이블 통합 wrapper */}
          <div className="flex-1 flex flex-col">
            {/* 탭 - 테이블 헤더와 동일한 너비 */}
            <div className="flex w-full border-b border-gray-400 shrink-0">
              <select 
                value={previewColumn}
                onChange={(e) => setPreviewColumn(e.target.value)}
                className="flex-1 px-2 py-2 border-none font-bold bg-[#e0f2fb] text-[#00587a] text-xs"
              >
                {PREVIEW_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button 
                onClick={handleDownloadPreview}
                className="px-2.5 py-2 bg-blue-50 text-blue-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]"
              >다운로드</button>
              <button 
                onClick={handleAllDelete}
                className="px-2.5 py-2 bg-red-50 text-red-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]"
              >All Del.</button>
              <button 
                onClick={handleDeleteSelected}
                className="px-2.5 py-2 bg-yellow-100 text-yellow-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]"
              >Del.</button>
              <button
                onClick={handleSavePreview}
                disabled={isSaving}
                className={`px-3 py-2 border-none border-l border-gray-400 font-bold text-[11px] transition-colors ${
                  isSaved
                    ? 'bg-green-500 text-white cursor-pointer'
                    : 'bg-purple-100 text-purple-800 cursor-pointer'
                } ${isSaving ? 'cursor-not-allowed' : ''}`}
              >
                {isSaving ? '저장중...' : isSaved ? '✓ 저장됨' : '저장'}
              </button>
              <button
                onClick={() => {
                  setBackupList(getBackupList());
                  setShowBackupModal(true);
                }}
                className="px-2.5 py-2 bg-orange-50 text-orange-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px] hover:bg-orange-100 transition-colors"
                title="백업 관리"
              >
                📦 백업
              </button>
              {isCompareMode ? (
                <>
                  <button
                    onClick={() => handleSelectAllConfirm(true)}
                    className="px-2.5 py-2 bg-purple-100 text-purple-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px] flex items-center gap-1 hover:bg-purple-200 transition-colors"
                  >
                    ✓ 전체선택
                  </button>
                  <button
                    onClick={handleConfirmSave}
                    className="px-2.5 py-2 bg-green-500 text-white border-none border-l border-gray-400 cursor-pointer font-bold text-[11px] flex items-center gap-1 hover:bg-green-600 transition-colors"
                  >
                    <Save className="w-3 h-3" /> 확정저장 ({confirmSelections.size})
                  </button>
                  <button
                    onClick={handleCancelCompareMode}
                    className="px-2.5 py-2 bg-gray-200 text-gray-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px] hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartCompareMode}
                  className="px-2.5 py-2 bg-cyan-50 text-cyan-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px] flex items-center gap-1 hover:bg-cyan-100 transition-colors"
                >
                  <GitCompare className="w-3 h-3" /> 비교
                </button>
              )}
            </div>

            {/* 테이블 - 스크롤 영역 (고정 높이 350px) */}
            <div className="flex-1 overflow-y-auto max-h-[350px] border-t border-gray-200 bg-gray-50">
              <table className="w-full border-collapse table-fixed">
                {isCompareMode ? (
                  // ✅ 비교 모드: 변경전/변경후/확정선택 컬럼 추가
                  <colgroup>
                    <col className="w-[30px]" />
                    <col className="w-[35px]" />
                    <col className="w-[60px]" />
                    <col className="w-[35%]" />
                    <col className="w-[35%]" />
                    <col className="w-[50px]" />
                  </colgroup>
                ) : (
                  <colgroup><col className="w-[30px]" /><col className="w-[35px]" /><col className="w-[35px]" /><col className="w-[60px]" /><col /></colgroup>
                )}
                <thead className="sticky top-0 z-[1]">
                  {isCompareMode ? (
                    // ✅ 비교 모드 헤더
                    <tr>
                      <th className={tw.headerCell}>
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAllConfirm(e.target.checked)}
                          checked={confirmSelections.size > 0 &&
                                   confirmSelections.size === flatData.filter(d => d.itemCode === previewColumn).length}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className={tw.headerCell}>NO</th>
                      <th className={tw.headerCell}>공정번호</th>
                      <th className={`${tw.headerCell} bg-red-600`}>
                        변경전 (DB)
                        <span className="text-yellow-300 ml-1">
                          ({dbData.filter(d => d.itemCode === previewColumn).length})
                        </span>
                      </th>
                      <th className={`${tw.headerCell} bg-green-600`}>
                        변경후 (신규)
                        <span className="text-yellow-300 ml-1">
                          ({flatData.filter(d => d.itemCode === previewColumn).length})
                        </span>
                      </th>
                      <th className={`${tw.headerCell} bg-purple-600`}>확정</th>
                    </tr>
                  ) : (
                    // 일반 모드 헤더
                    <tr>
                      <th className={tw.headerCell}>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            const selectedData = flatData.filter(d => d.itemCode === previewColumn);
                            if (e.target.checked) {
                              setSelectedRows(new Set(selectedData.map(d => d.id)));
                            } else {
                              setSelectedRows(new Set());
                            }
                          }}
                          checked={flatData.filter(d => d.itemCode === previewColumn).length > 0 &&
                                   flatData.filter(d => d.itemCode === previewColumn).every(d => selectedRows.has(d.id))}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className={tw.headerCell}>NO</th>
                      <th className={tw.headerCell}>순서</th>
                      <th className={tw.headerCell}>공정번호</th>
                      {/* 선택된 항목명 동적 표시 + 데이터 개수 */}
                      <th className={tw.headerCell}>
                        {PREVIEW_OPTIONS.find(o => o.value === previewColumn)?.label.split(' ')[1] || '항목'}
                        <span className="text-yellow-300 ml-1">
                          ({flatData.filter(d => d.itemCode === previewColumn && d.value && d.value.trim() !== '').length})
                        </span>
                      </th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {(() => {
                    // ✅ 비교 모드: DB데이터 vs 새 데이터 비교 테이블
                    if (isCompareMode) {
                      const newData = flatData
                        .filter(d => d.itemCode === previewColumn)
                        .sort((a, b) => {
                          const numA = parseInt(a.processNo, 10);
                          const numB = parseInt(b.processNo, 10);
                          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                          return a.processNo.localeCompare(b.processNo, 'ko');
                        });

                      const dbDataFiltered = dbData
                        .filter(d => d.itemCode === previewColumn)
                        .sort((a, b) => {
                          const numA = parseInt(a.processNo, 10);
                          const numB = parseInt(b.processNo, 10);
                          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                          return a.processNo.localeCompare(b.processNo, 'ko');
                        });

                      // 공정번호 기준으로 매핑 (새 데이터 기준)
                      return newData.map((newItem, i) => {
                        // 같은 공정번호의 DB 데이터 찾기
                        const dbItem = dbDataFiltered.find(d => d.processNo === newItem.processNo);
                        const isChanged = dbItem ? dbItem.value !== newItem.value : true;
                        const isNew = !dbItem;

                        return (
                          <tr
                            key={newItem.id}
                            className={`${confirmSelections.has(newItem.id) ? 'bg-purple-50' : isChanged ? 'bg-yellow-50' : 'bg-white'}`}
                          >
                            <td className={tw.cellCenter}>
                              <input
                                type="checkbox"
                                checked={confirmSelections.has(newItem.id)}
                                onChange={() => handleToggleConfirm(newItem.id)}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className={tw.cellCenter}>{i + 1}</td>
                            <td className={tw.cellCenter}>{getDisplayProcessNo(newItem.processNo)}</td>
                            {/* 변경전 (DB) */}
                            <td className={`${tw.cell} ${isNew ? 'bg-gray-100 text-gray-400 italic' : isChanged ? 'bg-red-100 line-through text-red-600' : ''}`}>
                              {isNew ? '(신규)' : dbItem?.value || ''}
                            </td>
                            {/* 변경후 (신규) - 클릭하여 수정 가능 */}
                            <td className={`${tw.cellPad} ${isChanged ? 'bg-green-100' : ''}`}>
                              <input
                                type="text"
                                value={newItem.value}
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  setFlatData(prev => prev.map(d =>
                                    d.id === newItem.id ? { ...d, value: newValue } : d
                                  ));
                                }}
                                className={`w-full px-1 py-0.5 text-[11px] border border-transparent rounded focus:border-blue-400 focus:outline-none ${isChanged ? 'bg-green-50 font-bold text-green-700' : 'bg-white'}`}
                              />
                            </td>
                            {/* 확정 - 선택 버튼 (모든 항목에 표시) */}
                            <td className={`${tw.cellCenter} bg-purple-50`}>
                              <button
                                onClick={() => handleToggleConfirm(newItem.id)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors shadow-sm ${
                                  confirmSelections.has(newItem.id)
                                    ? 'bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-300'
                                    : 'bg-white text-purple-600 border border-purple-400 hover:bg-purple-100'
                                }`}
                              >
                                {confirmSelections.has(newItem.id) ? '✓ 확정' : '선택'}
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    }

                    // ✅ 일반 모드: 기존 테이블 로직
                    // 선택한 항목 코드에 해당하는 데이터 필터링 + processNo(공정번호) 기준 정렬
                    const selectedData = flatData
                      .filter(d => d.itemCode === previewColumn)
                      .sort((a, b) => {
                        // 숫자 비교 우선, 숫자가 아닌 경우 문자열 비교
                        const numA = parseInt(a.processNo, 10);
                        const numB = parseInt(b.processNo, 10);
                        if (!isNaN(numA) && !isNaN(numB)) {
                          return numA - numB;
                        }
                        return a.processNo.localeCompare(b.processNo, 'ko');
                      });

                    if (selectedData.length === 0) {
                      // 데이터 없으면 10개 빈 행
                      return Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i}>
                          <td className={tw.cellCenter}></td>
                          <td className={tw.cellCenter}>{i + 1}</td>
                          <td className={`${tw.cellCenter} align-middle`}>
                            <div className="flex flex-col items-center justify-center gap-0">
                              <ChevronUp className="w-2.5 h-2.5 text-gray-300" />
                              <ChevronDown className="w-2.5 h-2.5 text-gray-300" />
                            </div>
                          </td>
                          <td className={tw.cellPad}>
                            <input
                              type="text"
                              placeholder="공정번호"
                              className={tw.inputCenter}
                              onBlur={(e) => {
                                if (e.target.value) {
                                  const row = e.target.closest('tr');
                                  const valueInput = row?.querySelector('input[placeholder="값 입력"]') as HTMLInputElement;
                                  const newData: ImportedFlatData = {
                                    id: `new-init-${Date.now()}-${i}`,
                                    processNo: e.target.value,
                                    category: previewColumn.startsWith('A') ? 'A' : previewColumn.startsWith('B') ? 'B' : 'C',
                                    itemCode: previewColumn,
                                    value: valueInput?.value || '',
                                    createdAt: new Date(),
                                  };
                                  setFlatData(prev => [...prev, newData]);
                                  setDirty(true);
                                }
                              }}
                            />
                          </td>
                          <td className={tw.cellPad}>
                            <input
                              type="text"
                              placeholder="값 입력"
                              className={tw.input}
                            />
                          </td>
                        </tr>
                      ));
                    }

                    // 선택한 항목 데이터 표시 (드래그앤드랍 지원)
                    const rows = selectedData.map((item, i) => (
                      <tr
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(i)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(i)}
                        onDragEnd={handleDragEnd}
                        className={`cursor-grab ${
                          draggedIndex === i ? 'bg-blue-50' : selectedRows.has(item.id) ? 'bg-orange-50' : 'bg-white'
                        }`}
                      >
                        <td className={tw.cellCenter}>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(item.id)}
                            onChange={() => handleRowSelect(item.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className={tw.cellCenter}>{i + 1}</td>
                        <td className={`${tw.cellCenter} align-middle`}>
                          <div className="flex flex-col items-center justify-center gap-0 cursor-grab">
                            <ChevronUp className="w-2.5 h-2.5 text-gray-500" />
                            <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
                          </div>
                        </td>
                        <td className={tw.cellCenter}>{getDisplayProcessNo(item.processNo)}</td>
                        <td className={tw.cell}>{item.value}</td>
                      </tr>
                    ));

                    // 10행 미만이면 빈 행 추가 (입력 가능)
                    const emptyRows = Array.from({ length: Math.max(0, 10 - selectedData.length) }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td className={tw.cellCenter}><input type="checkbox" /></td>
                        <td className={tw.cellCenter}>{selectedData.length + i + 1}</td>
                        <td className={`${tw.cellCenter} align-middle`}>
                          <div className="flex flex-col items-center justify-center gap-0">
                            <ChevronUp className="w-2.5 h-2.5 text-gray-300" />
                            <ChevronDown className="w-2.5 h-2.5 text-gray-300" />
                          </div>
                        </td>
                        <td className={tw.cellPad}>
                          <input
                            type="text"
                            placeholder="공정번호"
                            className={tw.inputCenter}
                            onBlur={(e) => {
                              if (e.target.value) {
                                const row = e.target.closest('tr');
                                const valueInput = row?.querySelector('input[placeholder="값 입력"]') as HTMLInputElement;
                                const newData: ImportedFlatData = {
                                  id: `new-left-${Date.now()}-${i}`,
                                  processNo: e.target.value,
                                  category: previewColumn.startsWith('A') ? 'A' : previewColumn.startsWith('B') ? 'B' : 'C',
                                  itemCode: previewColumn,
                                  value: valueInput?.value || '',
                                  createdAt: new Date(),
                                };
                                setFlatData(prev => [...prev, newData]);
                                setDirty(true);
                              }
                            }}
                          />
                        </td>
                        <td className={tw.cellPad}>
                          <input
                            type="text"
                            placeholder="값 입력"
                            className={tw.input}
                          />
                        </td>
                      </tr>
                    ));

                    return [...rows, ...emptyRows];
                  })()}
                </tbody>
              </table>
            </div>
            {/* 데이터 끝 표시 푸터 */}
            <div className="px-4 py-2 bg-gradient-to-br from-[#e0f2fb] to-gray-100 border-t-2 border-gray-800 text-[11px] text-gray-700 text-center shrink-0 font-bold">
              ▼ 총 {flatData.filter(d => d.itemCode === previewColumn).length}건 ━━ 데이터 끝 ━━ ▼
            </div>
          </div>
        </div>

        {/* 우측: FMEA 분석 DATA 미리 보기 - 기본 650px, 배율에 따라 반응형 */}
        <div className="min-w-[400px] max-w-[750px] flex flex-col border-2 border-[#00587a] rounded-lg overflow-hidden bg-white shadow-lg" style={{ flex: '1 1 650px' }}>
          {/* FMEA 분석 DATA 미리 보기 헤더 */}
          <div className={`${isAnalysisCompareMode ? 'bg-gradient-to-br from-amber-600 to-amber-500' : 'bg-gradient-to-br from-[#00587a] to-[#007a9e]'} text-white px-4 py-2.5 text-sm font-bold flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <span>{isAnalysisCompareMode ? '🔍' : '📈'}</span>
              {isAnalysisCompareMode ? 'FMEA 분석 DATA 비교 모드' : 'FMEA 분석 DATA 미리 보기'}
            </div>
            {/* 비교 모드: 변경 통계 / 일반 모드: 레벨별 입력 상태 */}
            <div className="flex items-center gap-2 text-[11px] font-normal">
              {isAnalysisCompareMode ? (
                <>
                  <span className="bg-yellow-300/40 px-2 py-0.5 rounded">
                    변경: <b className="text-yellow-100">{
                      (() => {
                        const tabPrefix = relationTab;
                        let changedCount = 0;
                        flatData.filter(d => d.itemCode?.startsWith(tabPrefix)).forEach(newItem => {
                          const dbItem = analysisDbData.find(d => d.processNo === newItem.processNo && d.itemCode === newItem.itemCode);
                          if (!dbItem || dbItem.value !== newItem.value) changedCount++;
                        });
                        return changedCount;
                      })()
                    }</b>
                  </span>
                  <span className="bg-green-300/40 px-2 py-0.5 rounded">
                    신규: <b className="text-green-100">{
                      (() => {
                        const tabPrefix = relationTab;
                        let newCount = 0;
                        flatData.filter(d => d.itemCode?.startsWith(tabPrefix)).forEach(newItem => {
                          const dbItem = analysisDbData.find(d => d.processNo === newItem.processNo && d.itemCode === newItem.itemCode);
                          if (!dbItem) newCount++;
                        });
                        return newCount;
                      })()
                    }</b>
                  </span>
                  <span className="bg-purple-300/40 px-2 py-0.5 rounded">
                    확정: <b className="text-purple-100">{analysisCellConfirms.size}</b>
                  </span>
                </>
              ) : (
                <>
                  <span className="bg-blue-500/40 px-2 py-0.5 rounded">
                    L2: <b className="text-blue-200">{stats.aCount}</b>
                  </span>
                  <span className="bg-green-500/40 px-2 py-0.5 rounded">
                    L3: <b className="text-green-200">{stats.bCount}</b>
                  </span>
                  <span className="bg-orange-500/40 px-2 py-0.5 rounded">
                    L1: <b className="text-orange-200">{stats.cCount}</b>
                  </span>
                  <span className="bg-white/20 px-2 py-0.5 rounded">
                    공정: <b className="text-yellow-300">{stats.processCount}</b>개
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* 탭 + 테이블 통합 wrapper - FMEA 기초정보 미리 보기와 동일한 디자인 */}
          <div className="flex-1 flex flex-col">
            {/* 탭 - 드롭다운 + 버튼 */}
            <div className="flex w-full border-b border-gray-400 shrink-0">
              <select
                value={relationTab}
                onChange={(e) => setRelationTab(e.target.value as 'A' | 'B' | 'C')}
                className="flex-1 px-2 py-2 border-none font-bold bg-[#e0f2fb] text-[#00587a] text-xs"
                disabled={isAnalysisCompareMode}
              >
                <option value="A">고장형태 분석(2L)</option>
                <option value="B">고장원인 분석(3L)</option>
                <option value="C">고장영향 분석(1L)</option>
              </select>
              {/* ✅ 비교 모드 버튼들 */}
              {isAnalysisCompareMode ? (
                <>
                  <button
                    onClick={() => handleSelectAllAnalysisConfirm(analysisCellConfirms.size === 0)}
                    className="px-2.5 py-2 bg-purple-100 text-purple-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]"
                  >
                    {analysisCellConfirms.size > 0 ? '전체해제' : '전체선택'}
                  </button>
                  <button
                    onClick={handleAnalysisConfirmSave}
                    className="px-2.5 py-2 bg-green-500 text-white border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]"
                  >
                    ✓ 확정저장 ({analysisCellConfirms.size})
                  </button>
                  <button
                    onClick={handleCancelAnalysisCompareMode}
                    className="px-2.5 py-2 bg-gray-500 text-white border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleRelationDownload}
                    className="px-2.5 py-2 bg-blue-50 text-blue-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]"
                  >다운로드</button>
                  <button
                    onClick={handleRelationAllDelete}
                    className="px-2.5 py-2 bg-red-50 text-red-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]"
                  >All Del.</button>
                  <button
                    onClick={handleRelationDeleteSelected}
                    className="px-2.5 py-2 bg-yellow-100 text-yellow-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]"
                  >Del.</button>
                  <button
                    onClick={handleSaveRelation}
                    className="px-3 py-2 bg-purple-100 text-purple-800 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]"
                  >저장</button>
                  <button
                    onClick={handleStartAnalysisCompareMode}
                    className="px-2.5 py-2 bg-amber-100 text-amber-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px] flex items-center gap-1"
                  >
                    <GitCompare className="w-3 h-3" /> 비교
                  </button>
                </>
              )}
            </div>

            {/* 분석 DATA 테이블 - 스크롤 영역 (고정 높이 350px) */}
            <div className="flex-1 overflow-y-auto max-h-[350px] border-t border-gray-200 bg-gray-50">
              <table className="w-full border-collapse table-fixed">
              <colgroup><col className="w-[25px]" /><col className="w-[35px]" /><col className="w-[35px]" /><col className="w-[50px]" /><col className="w-20" /><col className="w-[35%]" /><col className="w-[15%]" /><col className="w-[15%]" /></colgroup>
              <thead className="sticky top-0 z-[1]">
                <tr>
                  <th className={`${tw.headerCell} break-words`}><input type="checkbox" /></th>
                  <th className={`${tw.headerCell} break-words`}>NO</th>
                  <th className={`${tw.headerCell} break-words`}>순서</th>
                  {relationTab === 'A' && (
                    <>
                      <th className={`${tw.headerCell} break-words`}>공정번호</th>
                      <th className={`${tw.headerCell} break-words`}>공정명</th>
                      <th className={`${tw.headerCell} break-words`}>A3 기능</th>
                      <th className={`${tw.headerCell} break-words`}>A4 특성</th>
                      <th className={`${tw.headerCell} break-words`}>A5 고장형태</th>
                    </>
                  )}
                  {relationTab === 'B' && (
                    <>
                      <th className={`${tw.headerCell} break-words`}>공정번호</th>
                      <th className={`${tw.headerCell} break-words`}>작업요소</th>
                      <th className={`${tw.headerCell} break-words`}>B2 기능</th>
                      <th className={`${tw.headerCell} break-words`}>B3 특성</th>
                      <th className={`${tw.headerCell} break-words`}>B4 고장원인</th>
                    </>
                  )}
                  {relationTab === 'C' && (
                    <>
                      <th className={`${tw.headerCell} break-words`}>구분</th>
                      <th className={`${tw.headerCell} break-words`}>제품기능</th>
                      <th className={`${tw.headerCell} break-words`}>C3 요구사항</th>
                      <th className={`${tw.headerCell} break-words`}>C4 고장영향</th>
                      <th className={`${tw.headerCell} break-words`}>심각도</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // ✅ 비교 모드: 셀 단위 변경 감지 및 노란색 하이라이트
                  if (isAnalysisCompareMode && relationData.length > 0) {
                    return relationData.map((row, i) => {
                      const keys = Object.keys(row);
                      const displayNo = row.A1 || String(i + 1);
                      // ✅ 실제 processNo 사용 (선택/삭제에 사용)
                      const actualProcessNo = (row as any)._processNo || displayNo;

                      // 현재 탭에 따른 항목 코드 목록
                      const itemCodes = relationTab === 'A'
                        ? ['A1', 'A2', 'A3', 'A4', 'A5']
                        : relationTab === 'B'
                        ? ['A1', 'B1', 'B2', 'B3', 'B4']
                        : ['C1', 'C2', 'C3', 'C4'];

                      return (
                        <tr key={i} className="bg-white">
                          <td className={tw.cellCenter}>
                            <input
                              type="checkbox"
                              checked={selectedRelationRows.has(actualProcessNo)}
                              onChange={() => handleRelationRowSelect(actualProcessNo)}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className={tw.cellCenter}>{i + 1}</td>
                          <td className={`${tw.cellCenter} align-middle`}>
                            <div className="flex flex-col items-center justify-center gap-0">
                              <ChevronUp className="w-2.5 h-2.5 text-gray-500" />
                              <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
                            </div>
                          </td>
                          {keys.filter(k => !k.startsWith('_')).slice(0, 5).map((key, j) => {
                            const val = row[key as keyof typeof row];
                            const itemCode = itemCodes[j] || key;
                            const cellKey = `${actualProcessNo}-${itemCode}`;
                            const isChanged = isAnalysisCellChanged(actualProcessNo, itemCode, val);
                            const isNew = isAnalysisCellNew(actualProcessNo, itemCode);
                            const isConfirmed = analysisCellConfirms.has(cellKey);

                            // ✅ A5(고장형태), B4(고장원인), C4(고장영향) 셀은 클릭 가능
                            const isFailureCell = itemCode === 'A5' || itemCode === 'B4' || itemCode === 'C4';
                            // ✅ _processNo 필드 직접 사용 (useRelationData에서 제공)
                            const internalProcessNoForPopup = (row as any)._processNo || actualProcessNo;

                            // 셀 스타일 결정
                            let cellBgClass = '';
                            if (isConfirmed) {
                              cellBgClass = 'bg-purple-100 ring-2 ring-purple-400 ring-inset';
                            } else if (isNew) {
                              cellBgClass = 'bg-green-100';
                            } else if (isChanged) {
                              cellBgClass = 'bg-yellow-200';
                            }

                            return (
                              <td
                                key={j}
                                className={`${tw.cellPad} ${cellBgClass} cursor-pointer transition-colors hover:brightness-95 ${isFailureCell ? 'hover:bg-orange-100' : ''}`}
                                onClick={() => {
                                  if (isFailureCell) {
                                    // 고장 관련 셀 클릭: 팝업 열기 + 미리보기 연동
                                    setPreviewColumn(itemCode); // 미리보기 연동
                                    handleOpenFailureChainPopup(internalProcessNoForPopup);
                                  } else if (isChanged || isNew) {
                                    // 변경/신규 셀 클릭: 확정 토글
                                    handleToggleAnalysisCellConfirm(actualProcessNo, itemCode);
                                  } else {
                                    // 일반 셀 클릭: 미리보기 연동
                                    setPreviewColumn(itemCode);
                                  }
                                }}
                                title={isFailureCell ? '클릭하여 인과관계 보기 (미리보기 연동)' : isConfirmed ? '✓ 확정됨 (클릭하여 해제)' : isNew ? '신규 데이터 (클릭하여 확정)' : isChanged ? '변경됨 (클릭하여 확정)' : '클릭하여 미리보기'}
                              >
                                {val ? (
                                  <span
                                    className={`break-words whitespace-normal leading-tight block px-1 py-0.5 ${isChanged || isNew ? 'font-bold' : ''} ${isFailureCell ? 'text-orange-700 underline cursor-pointer' : ''}`}
                                    onClick={(e) => {
                                      if (isFailureCell) {
                                        e.stopPropagation();
                                        setPreviewColumn(itemCode); // ✅ 미리보기 연동 추가
                                        handleOpenFailureChainPopup(internalProcessNoForPopup);
                                      }
                                    }}
                                  >
                                    {isConfirmed && <span className="text-purple-600 mr-1">✓</span>}
                                    {val}
                                  </span>
                                ) : isFailureCell ? (
                                  // ✅ 고장 관련 셀: 값이 없어도 클릭 가능한 링크 표시
                                  <span
                                    className="text-orange-400 text-[10px] cursor-pointer hover:text-orange-600 underline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewColumn(itemCode); // ✅ 미리보기 연동 추가
                                      handleOpenFailureChainPopup(internalProcessNoForPopup);
                                    }}
                                  >
                                    [선택]
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-[10px]">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  }

                  // ✅ 일반 모드: 기존 로직 유지
                  if (relationData.length === 0) {
                    return Array.from({ length: 10 }).map((_, i) => {
                      const cols = relationTab === 'A' ? ['A1', 'A2', 'A3', 'A4', 'A5'] : relationTab === 'B' ? ['A1', 'B1', 'B2', 'B3', 'B4'] : ['C1', 'C2', 'C3', 'C4', 'C5'];
                      const emptyProcessNo = `empty-${i}`;
                      return (
                        <tr key={i}>
                          <td className={tw.cellCenter}>
                            <input
                              type="checkbox"
                              checked={selectedRelationRows.has(emptyProcessNo)}
                              onChange={() => handleRelationRowSelect(emptyProcessNo)}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className={tw.cellCenter}>{i + 1}</td>
                          <td className={`${tw.cellCenter} align-middle`}>
                            <div className="flex flex-col items-center justify-center gap-0">
                              <ChevronUp className="w-2.5 h-2.5 text-gray-300" />
                              <ChevronDown className="w-2.5 h-2.5 text-gray-300" />
                            </div>
                          </td>
                          {cols.map((col, j) => (
                            <td key={j} className={tw.cellPad}>
                              <input
                                type="text"
                                placeholder="클릭하여 입력"
                                className={tw.input}
                                onBlur={(e) => {
                                  if (e.target.value) {
                                    const newData: ImportedFlatData = {
                                      id: `new-${Date.now()}-${i}-${j}`,
                                      processNo: col === 'A1' ? e.target.value : String(i + 1),
                                      category: col.startsWith('A') ? 'A' : col.startsWith('B') ? 'B' : 'C',
                                      itemCode: col,
                                      value: e.target.value,
                                      createdAt: new Date(),
                                    };
                                    setFlatData(prev => [...prev, newData]);
                                    setDirty(true);
                                  }
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    });
                  }

                  // ✅ 일반 모드: 데이터 표시
                  return relationData.map((row, i) => {
                    const keys = Object.keys(row);
                    const displayNo = row.A1 || String(i + 1);
                    // ✅ 실제 processNo 사용 (선택/삭제에 사용)
                    const actualProcessNo = (row as any)._processNo || displayNo;
                    return (
                      <tr key={i} className={selectedRelationRows.has(actualProcessNo) ? 'bg-orange-50' : 'bg-white'}>
                        <td className={tw.cellCenter}>
                          <input
                            type="checkbox"
                            checked={selectedRelationRows.has(actualProcessNo)}
                            onChange={() => handleRelationRowSelect(actualProcessNo)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className={tw.cellCenter}>{i + 1}</td>
                        <td className={`${tw.cellCenter} align-middle`}>
                          <div className="flex flex-col items-center justify-center gap-0">
                            <ChevronUp className="w-2.5 h-2.5 text-gray-500" />
                            <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
                          </div>
                        </td>
                        {keys.filter(k => !k.startsWith('_')).slice(0, 5).map((key, j) => {
                          const val = row[key as keyof typeof row];
                          // ✅ A5(고장형태), B4(고장원인), C4(고장영향) 셀은 클릭 가능
                          const isFailureCell = key === 'A5' || key === 'B4' || key === 'C4';
                          // ✅ _processNo 필드 직접 사용 (useRelationData에서 제공)
                          const internalProcessNo = (row as any)._processNo || row.A1 || String(i + 1);

                          return (
                            <td
                              key={j}
                              className={`${tw.cellPad} ${isFailureCell ? 'cursor-pointer hover:bg-orange-100 transition-colors' : 'cursor-pointer hover:bg-gray-50'}`}
                              onClick={() => {
                                if (isFailureCell) {
                                  // 고장 관련 셀 클릭: 팝업 열기 + 미리보기 연동
                                  setPreviewColumn(key);
                                  handleOpenFailureChainPopup(internalProcessNo);
                                } else {
                                  // 일반 셀 클릭: 미리보기 연동
                                  setPreviewColumn(key);
                                }
                              }}
                              title={isFailureCell ? '클릭하여 인과관계 보기 (미리보기 연동)' : '클릭하여 미리보기'}
                            >
                              {val ? (
                                <span
                                  className={`break-words whitespace-normal leading-tight block px-1 py-0.5 ${isFailureCell ? 'text-orange-700 underline cursor-pointer' : ''}`}
                                  onClick={(e) => {
                                    if (isFailureCell) {
                                      e.stopPropagation();
                                      setPreviewColumn(key); // ✅ 미리보기 연동 추가
                                      handleOpenFailureChainPopup(internalProcessNo);
                                    }
                                  }}
                                >
                                  {val}
                                </span>
                              ) : isFailureCell ? (
                                // ✅ 고장 관련 셀: 값이 없어도 클릭 가능한 링크 표시
                                <span
                                  className="text-orange-400 text-[10px] cursor-pointer hover:text-orange-600 underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewColumn(key); // ✅ 미리보기 연동 추가
                                    handleOpenFailureChainPopup(internalProcessNo);
                                  }}
                                >
                                  [선택]
                                </span>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="입력"
                                  className={tw.input}
                                  onBlur={(e) => {
                                    if (e.target.value) {
                                      const processNo = row.A1 || (row as any).C1 || String(i + 1);
                                      const newData: ImportedFlatData = {
                                        id: `edit-${Date.now()}-${i}-${j}`,
                                        processNo: String(processNo),
                                        category: key.startsWith('A') ? 'A' : key.startsWith('B') ? 'B' : 'C',
                                        itemCode: key,
                                        value: e.target.value,
                                        createdAt: new Date(),
                                      };
                                      setFlatData(prev => [...prev, newData]);
                                      setDirty(true);
                                    }
                                  }}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
              </table>
            </div>
            {/* 데이터 끝 표시 푸터 */}
            <div className="px-4 py-2 bg-gradient-to-br from-[#e0f2fb] to-gray-100 border-t-2 border-gray-800 text-[11px] text-gray-700 text-center shrink-0 font-bold">
              ▼ 총 {relationData.length}건 ━━ 데이터 끝 ━━ ▼
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* 비교용 파일 입력 (hidden) */}
      <input
        ref={compareFileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        onChange={handleCompareFileSelect}
      />

      {/* 데이터 비교 모달 */}
      <DataCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onApply={handleApplyChanges}
        changes={compareChanges}
        title="기초정보 변경 비교"
        description="새로 업로드된 파일과 기존 기초정보를 비교합니다. 적용할 항목을 선택하세요."
      />

      {/* 고장 인과관계 팝업 */}
      <FailureChainPopup
        isOpen={isFailureChainPopupOpen}
        onClose={() => setIsFailureChainPopupOpen(false)}
        processNo={selectedProcessNoForPopup}
        processName={selectedProcessNameForPopup}
        flatData={flatData}
        existingChains={failureChains}
        onSaveChain={handleSaveFailureChain}
        onDeleteChain={handleDeleteFailureChain}
      />

      {/* 백업 관리 모달 */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-orange-50">
              <h3 className="font-bold text-orange-800">📦 백업 관리</h3>
              <button
                onClick={() => setShowBackupModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              {/* 새 백업 생성 */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <button
                  onClick={() => {
                    const label = prompt('백업 이름을 입력하세요 (선택사항):');
                    const key = createBackup(label || undefined);
                    if (key) {
                      alert('✅ 백업이 생성되었습니다.');
                      setBackupList(getBackupList());
                    }
                  }}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors font-bold"
                >
                  ➕ 새 백업 생성 ({flatData.filter(d => d.value?.trim()).length}건)
                </button>
              </div>

              {/* 백업 목록 */}
              <div className="text-sm font-bold text-gray-700 mb-2">백업 목록 (최대 5개)</div>
              {backupList.length === 0 ? (
                <div className="text-gray-500 text-sm py-4 text-center">
                  저장된 백업이 없습니다.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {backupList.map((backup) => (
                    <div
                      key={backup.key}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 text-sm">{backup.label}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(backup.timestamp).toLocaleString('ko-KR')} · {backup.count}건
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!confirm(`"${backup.label}" 백업을 복원하시겠습니까?\n\n⚠️ 현재 데이터가 덮어씌워집니다.`)) return;
                            const restored = restoreBackup(backup.key);
                            if (restored) {
                              setFlatData(restored);
                              setShowBackupModal(false);
                              alert('✅ 백업이 복원되었습니다.');
                            } else {
                              alert('❌ 백업 복원에 실패했습니다.');
                            }
                          }}
                          className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                          복원
                        </button>
                        <button
                          onClick={() => {
                            if (!confirm(`"${backup.label}" 백업을 삭제하시겠습니까?`)) return;
                            deleteBackup(backup.key);
                            setBackupList(getBackupList());
                          }}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowBackupModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Suspense boundary wrapper for useSearchParams
export default function PFMEAImportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">로딩 중...</div>}>
      <PFMEAImportPageContent />
    </Suspense>
  );
}

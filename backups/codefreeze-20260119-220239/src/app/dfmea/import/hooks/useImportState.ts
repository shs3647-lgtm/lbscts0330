/**
 * @file useImportState.ts
 * @description PFMEA Import 페이지 상태 관리 훅
 * @created 2025-12-31
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ImportedFlatData } from '../types';
import { ParseResult } from '../excel-parser';

// FMEA 프로젝트 타입
export interface FMEAProject {
  id: string;
  fmeaNo?: string;
  fmeaInfo?: {
    subject?: string;
  };
  project?: {
    productName?: string;
  };
}

export interface UseImportStateReturn {
  // FMEA 선택 상태
  fmeaList: FMEAProject[];
  setFmeaList: React.Dispatch<React.SetStateAction<FMEAProject[]>>;
  selectedFmeaId: string;
  setSelectedFmeaId: React.Dispatch<React.SetStateAction<string>>;
  
  // 기본 상태
  importType: 'full' | 'partial';
  setImportType: React.Dispatch<React.SetStateAction<'full' | 'partial'>>;
  fileName: string;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  isLoaded: boolean;
  isParsing: boolean;
  setIsParsing: React.Dispatch<React.SetStateAction<boolean>>;
  parseResult: ParseResult | null;
  setParseResult: React.Dispatch<React.SetStateAction<ParseResult | null>>;
  
  // Import 상태
  pendingData: ImportedFlatData[];
  setPendingData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  isImporting: boolean;
  setIsImporting: React.Dispatch<React.SetStateAction<boolean>>;
  importSuccess: boolean;
  setImportSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  
  // 좌측 미리보기
  previewColumn: string;
  setPreviewColumn: React.Dispatch<React.SetStateAction<string>>;
  selectedRows: Set<string>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  draggedIndex: number | null;
  setDraggedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  
  // 우측 관계형 탭
  relationTab: 'A' | 'B' | 'C';
  setRelationTab: React.Dispatch<React.SetStateAction<'A' | 'B' | 'C'>>;
  
  // 개별 입포트 상태
  partialItemCode: string;
  setPartialItemCode: React.Dispatch<React.SetStateAction<string>>;
  partialFileName: string;
  setPartialFileName: React.Dispatch<React.SetStateAction<string>>;
  partialPendingData: ImportedFlatData[];
  setPartialPendingData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  isPartialParsing: boolean;
  setIsPartialParsing: React.Dispatch<React.SetStateAction<boolean>>;
  
  // 저장 상태
  isSaved: boolean;
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  dirty: boolean;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  selectedRelationRows: Set<string>;
  setSelectedRelationRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  // 샘플 다운로드용 FMEA 선택 상태
  sampleFmeaL0: string;
  setSampleFmeaL0: React.Dispatch<React.SetStateAction<string>>;
  sampleFmeaL1: string;
  setSampleFmeaL1: React.Dispatch<React.SetStateAction<string>>;
  sampleFmeaL2: string;
  setSampleFmeaL2: React.Dispatch<React.SetStateAction<string>>;
  sampleFmeaL3: string;
  setSampleFmeaL3: React.Dispatch<React.SetStateAction<string>>;
  
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  partialFileInputRef: React.RefObject<HTMLInputElement | null>;
  relationFileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useImportState(idFromUrl: string | null): UseImportStateReturn {
  // FMEA 선택 상태
  const [fmeaList, setFmeaList] = useState<FMEAProject[]>([]);
  const [selectedFmeaId, setSelectedFmeaId] = useState<string>(idFromUrl || '');
  
  // 기본 상태
  const [importType, setImportType] = useState<'full' | 'partial'>('full');
  const [fileName, setFileName] = useState<string>('');
  const [flatData, setFlatData] = useState<ImportedFlatData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  
  // Import 상태
  const [pendingData, setPendingData] = useState<ImportedFlatData[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  
  // 좌측 미리보기
  const [previewColumn, setPreviewColumn] = useState('A2');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // 우측 관계형 탭
  const [relationTab, setRelationTab] = useState<'A' | 'B' | 'C'>('A');
  
  // 개별 입포트 상태
  const [partialItemCode, setPartialItemCode] = useState('A3');
  const [partialFileName, setPartialFileName] = useState<string>('');
  const [partialPendingData, setPartialPendingData] = useState<ImportedFlatData[]>([]);
  const [isPartialParsing, setIsPartialParsing] = useState(false);
  
  // 저장 상태
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedRelationRows, setSelectedRelationRows] = useState<Set<string>>(new Set());
  
  // 샘플 다운로드용 FMEA 선택 상태
  const [sampleFmeaL0, setSampleFmeaL0] = useState<string>('');
  const [sampleFmeaL1, setSampleFmeaL1] = useState<string>('');
  const [sampleFmeaL2, setSampleFmeaL2] = useState<string>('');
  const [sampleFmeaL3, setSampleFmeaL3] = useState<string>('');
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const partialFileInputRef = useRef<HTMLInputElement | null>(null);
  const relationFileInputRef = useRef<HTMLInputElement | null>(null);
  
  // 페이지 로드 시 FMEA 목록 및 저장된 데이터 불러오기
  useEffect(() => {
    // FMEA 목록 로드
    const storedProjects = localStorage.getItem('pfmea-projects');
    if (storedProjects) {
      try {
        const projects: FMEAProject[] = JSON.parse(storedProjects);
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
    
    // 저장된 데이터 불러오기
    const savedData = localStorage.getItem('pfmea_master_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFlatData(parsed);
          const savedAt = localStorage.getItem('pfmea_saved_at');
          setFileName(`저장된 데이터 (${savedAt ? new Date(savedAt).toLocaleString('ko-KR') : ''})`);
          console.log('📂 저장된 데이터 불러옴:', parsed.length, '건');
        }
      } catch (e) {
        console.error('저장된 데이터 파싱 오류:', e);
      }
    }
    setIsLoaded(true);
  }, [idFromUrl, selectedFmeaId]);
  
  return {
    fmeaList, setFmeaList,
    selectedFmeaId, setSelectedFmeaId,
    importType, setImportType,
    fileName, setFileName,
    flatData, setFlatData,
    isLoaded,
    isParsing, setIsParsing,
    parseResult, setParseResult,
    pendingData, setPendingData,
    isImporting, setIsImporting,
    importSuccess, setImportSuccess,
    previewColumn, setPreviewColumn,
    selectedRows, setSelectedRows,
    draggedIndex, setDraggedIndex,
    relationTab, setRelationTab,
    partialItemCode, setPartialItemCode,
    partialFileName, setPartialFileName,
    partialPendingData, setPartialPendingData,
    isPartialParsing, setIsPartialParsing,
    isSaved, setIsSaved,
    isSaving, setIsSaving,
    dirty, setDirty,
    selectedRelationRows, setSelectedRelationRows,
    sampleFmeaL0, setSampleFmeaL0,
    sampleFmeaL1, setSampleFmeaL1,
    sampleFmeaL2, setSampleFmeaL2,
    sampleFmeaL3, setSampleFmeaL3,
    fileInputRef,
    partialFileInputRef,
    relationFileInputRef,
  };
}






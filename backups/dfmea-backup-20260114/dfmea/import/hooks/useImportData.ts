/**
 * @file useImportData.ts
 * @description Import 데이터 관리 훅
 */

import { useState, useEffect, useRef } from 'react';
import { ImportedFlatData } from '../types';
import { ParseResult, parseMultiSheetExcel } from '../excel-parser';
import { SAMPLE_DATA } from '../sampleData';
import { FMEAProject } from '../importTypes';

/** Import 데이터 훅 반환 타입 */
export interface UseImportDataReturn {
  // FMEA 선택 상태
  fmeaList: FMEAProject[];
  selectedFmeaId: string;
  setSelectedFmeaId: (id: string) => void;
  
  // 데이터 상태
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  isLoaded: boolean;
  
  // 파싱 상태
  fileName: string;
  isParsing: boolean;
  parseResult: ParseResult | null;
  pendingData: ImportedFlatData[];
  
  // Import 상태
  isImporting: boolean;
  importSuccess: boolean;
  
  // 저장 상태
  isSaved: boolean;
  isSaving: boolean;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  
  // 액션
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleApplyParsedData: () => void;
  handleSave: () => Promise<void>;
  loadSampleData: () => void;
}

/**
 * Import 데이터 관리 훅
 */
export function useImportData(idFromUrl: string | null): UseImportDataReturn {
  // FMEA 선택 상태
  const [fmeaList, setFmeaList] = useState<FMEAProject[]>([]);
  const [selectedFmeaId, setSelectedFmeaId] = useState<string>(idFromUrl || '');
  
  // 데이터 상태
  const [flatData, setFlatData] = useState<ImportedFlatData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // 파싱 상태
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [pendingData, setPendingData] = useState<ImportedFlatData[]>([]);
  
  // Import 상태
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  
  // 저장 상태
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // FMEA 리스트 로드
  useEffect(() => {
    const loadFmeaList = () => {
      const projects: FMEAProject[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('fmea-list-')) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              if (Array.isArray(parsed)) {
                projects.push(...parsed);
              }
            }
          } catch (e) {
            console.error('FMEA 리스트 파싱 오류:', e);
          }
        }
      }
      // 개별 FMEA도 로드
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('pfmea-') && !key.includes('worksheet') && !key.includes('import')) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              if (parsed.id && !projects.find(p => p.id === parsed.id)) {
                projects.push(parsed);
              }
            }
          } catch (e) {
            console.error('개별 FMEA 파싱 오류:', e);
          }
        }
      }
      setFmeaList(projects);
    };
    loadFmeaList();
  }, []);
  
  // 선택된 FMEA의 저장된 데이터 로드
  useEffect(() => {
    if (selectedFmeaId) {
      const savedKey = `pfmea-import-${selectedFmeaId}`;
      const savedData = localStorage.getItem(savedKey);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setFlatData(parsed);
          setIsSaved(true);
        } catch (e) {
          console.error('저장된 데이터 파싱 오류:', e);
          setFlatData([]);
        }
      } else {
        setFlatData([]);
        setIsSaved(false);
      }
      setIsLoaded(true);
      setDirty(false);
    }
  }, [selectedFmeaId]);
  
  // 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setIsParsing(true);
    
    try {
      const result = await parseMultiSheetExcel(file);
      setParseResult(result);
      // ParseResult는 processes/products를 포함 - pendingData 변환은 별도 처리 필요
      // setPendingData는 추후 변환 로직에서 처리
      setIsParsing(false);
    } catch (error) {
      console.error('파싱 오류:', error);
      setIsParsing(false);
      alert('파일 파싱 중 오류가 발생했습니다.');
    }
    
    // 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // 파싱된 데이터 적용
  const handleApplyParsedData = () => {
    if (pendingData.length > 0) {
      setIsImporting(true);
      setTimeout(() => {
        setFlatData(prev => [...prev, ...pendingData]);
        setPendingData([]);
        setParseResult(null);
        setIsImporting(false);
        setImportSuccess(true);
        setDirty(true);
        setTimeout(() => setImportSuccess(false), 2000);
      }, 500);
    }
  };
  
  // 저장 핸들러
  const handleSave = async () => {
    if (!selectedFmeaId) {
      alert('FMEA를 선택해주세요.');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const saveKey = `pfmea-import-${selectedFmeaId}`;
      localStorage.setItem(saveKey, JSON.stringify(flatData));
      setIsSaved(true);
      setDirty(false);
      console.log('✅ 데이터 저장 완료:', saveKey);
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // 샘플 데이터 로드
  const loadSampleData = () => {
    setFlatData(SAMPLE_DATA);
    setDirty(true);
  };
  
  return {
    fmeaList,
    selectedFmeaId,
    setSelectedFmeaId,
    flatData,
    setFlatData,
    isLoaded,
    fileName,
    isParsing,
    parseResult,
    pendingData,
    isImporting,
    importSuccess,
    isSaved,
    isSaving,
    dirty,
    setDirty,
    handleFileUpload,
    handleApplyParsedData,
    handleSave,
    loadSampleData,
  };
}





'use client';

/**
 * @file page.tsx
 * @description DFMEA 기초정보 Excel Import 메인 페이지
 * @author AI Assistant
 * @created 2025-12-26
 * @updated 2025-12-30 - 모듈화 리팩토링 (constants, utils 분리)
 */

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronUp, ChevronDown, Save, Upload, CheckCircle } from 'lucide-react';
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
import { SAMPLE_DATA, PREVIEW_OPTIONS, FMEAProject } from './constants';
import { 
  downloadFmeaSample, 
  handleDownloadPreview as utilDownloadPreview,
  handleRelationDownload as utilRelationDownload,
  handleRelationImport as utilRelationImport,
  handlePartialFileSelect as utilPartialFileSelect,
  handlePartialImport as utilPartialImport,
  convertParseResultToFlatData,
} from './utils';
import { useImportHandlers, useRelationData, usePreviewHandlers, useRelationHandlers } from './hooks';
import { tw } from './tailwindClasses';

// SAMPLE_DATA, PREVIEW_OPTIONS, FMEAProject는 ./constants에서 import

function PFMEAImportPageContent() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get('id');
  
  // FMEA 선택 상태
  const [fmeaList, setFmeaList] = useState<FMEAProject[]>([]);
  const [selectedFmeaId, setSelectedFmeaId] = useState<string>(idFromUrl || '');
  
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
  
  // downloadFmeaSample은 ./utils에서 import됨
  
  // 관계형 데이터 입포트
  const relationFileInputRef = useRef<HTMLInputElement | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const partialFileInputRef = useRef<HTMLInputElement | null>(null);

  // =====================================================
  // 훅 사용
  // =====================================================

  // 관계형 데이터 처리
  const { getRelationData, relationData } = useRelationData(flatData, relationTab);

  // 미리보기 핸들러
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
  });

  // 관계형 핸들러
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
    relationFileInputRef,
  });

  // Import 핸들러 (handleFileSelect는 아래에서 별도 정의)
  const { handleImport } = useImportHandlers({
    flatData,
    setFlatData,
    pendingData,
    setPendingData,
    setIsImporting,
    setImportSuccess,
    setIsParsing,
    setParseResult,
    setFileName,
    fileInputRef,
    setDirty,
  });

  /** FMEA 기초정보 미리 보기 데이터 다운로드 - 유틸 함수 호출 래퍼 */
  const handleDownloadPreview = () => utilDownloadPreview(previewColumn, flatData);

  // 핸들러 함수들은 훅에서 가져옴 (위에서 정의됨)

  // =====================================================
  // 개별 입포트 핸들러 (유틸 함수 래퍼)
  // =====================================================

  /** 개별 입포트 파일 선택 */
  const handlePartialFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await utilPartialFileSelect(file, {
      partialItemCode,
      setPartialFileName,
      setIsPartialParsing,
      setPartialPendingData,
    });
  };

  /** 개별 입포트 실행 */
  const handlePartialImport = () => {
    utilPartialImport(
      partialItemCode, partialPendingData, flatData,
      setFlatData, setPartialPendingData, setPreviewColumn, setIsSaved
    );
  };

  // =====================================================
  // 관계형 데이터 다운로드/입포트 핸들러 (유틸 함수 래퍼)
  // =====================================================

  /** 관계형 데이터 Excel 다운로드 */
  const handleRelationDownload = () => utilRelationDownload(relationTab, getRelationData);

  /** 관계형 데이터 Excel 입포트 */
  const handleRelationImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await utilRelationImport(file, relationTab, flatData, setFlatData, setIsSaved, relationFileInputRef);
  };

  // handleSavePreview와 handleSaveRelation은 훅에서 가져옴 (위에서 정의됨)

  // 페이지 로드 시 FMEA 목록 및 저장된 데이터 불러오기
  useEffect(() => {
    // FMEA 목록 로드
    const storedProjects = localStorage.getItem('pfmea-projects');
    if (storedProjects) {
      try {
        const projects: FMEAProject[] = JSON.parse(storedProjects);
        setFmeaList(projects);
        // URL에서 id 파라미터가 있으면 해당 FMEA 선택 (등록화면에서 넘어온 경우)
        if (idFromUrl) {
          setSelectedFmeaId(idFromUrl);
        } else if (!selectedFmeaId && projects.length > 0) {
          // URL 파라미터 없고, 선택된 FMEA도 없으면 첫 번째 선택
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
          console.log('📂 저장된 데이터 불러옴:', parsed.length, '건', savedAt ? `(${savedAt})` : '');
        }
      } catch (e) {
        console.error('저장된 데이터 파싱 오류:', e);
      }
    }
    setIsLoaded(true);
  }, [idFromUrl, selectedFmeaId]);

  // 파일 선택 핸들러 (파싱 후 pendingData에 저장, Import 버튼 클릭 시 DB 저장)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setIsParsing(true);
    setImportSuccess(false);
    
    try {
      const result = await parseMultiSheetExcel(file);
      setParseResult(result);
      
      // Flat 데이터 생성 (유틸 함수 사용)
      const flat = convertParseResultToFlatData(result);
      
      // 파싱된 데이터를 pendingData에 저장 + 미리보기에 바로 표시
      setPendingData(flat);
      setFlatData(flat);  // 미리보기에 바로 표시
      
      // 디버깅: 파싱 결과 출력
      console.log('📊 전체 Import 결과:');
      console.log('  - 공정 수:', result.processes.length);
      console.log('  - 제품 수:', result.products.length);
      console.log('  - 시트별 현황:', result.sheetSummary);
      console.log('  - Flat 데이터 수:', flat.length);
      if (result.errors.length > 0) {
        console.warn('  - 오류:', result.errors);
      }
    } catch (error) {
      console.error('파싱 오류:', error);
    } finally {
      setIsParsing(false);
    }
  };

  // handleImport는 훅에서 가져옴 (위에서 정의됨)

  // 미리보기 데이터 필터링
  const previewData = flatData.filter(d => d.itemCode === previewColumn);
  
  // 통계 계산
  const stats = {
    total: flatData.length,
    processCount: new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo)).size,
    aCount: flatData.filter(d => d.itemCode.startsWith('A')).length,
    bCount: flatData.filter(d => d.itemCode.startsWith('B')).length,
    cCount: flatData.filter(d => d.itemCode.startsWith('C')).length,
    missing: flatData.filter(d => !d.value || d.value.trim() === '').length,
  };

  // getRelationData와 relationData는 훅에서 가져옴 (위에서 정의됨)

  return (
    <>
      {/* 상단 고정 바로가기 메뉴 */}
      <PFMEATopNav selectedFmeaId={selectedFmeaId} />
      
      <div className="pt-9 px-3 pb-3 bg-gray-100 min-h-screen font-[Malgun_Gothic,sans-serif]">
        {/* 제목 */}
        <h1 className="text-base font-bold text-[#00587a] mb-3">
          📥 PFMEA 기초정보 Excel Import
        </h1>

      {/* 기초정보 테이블 (FMEA 선택 + 빈템플렛/샘플 통합) */}
      <div className={tw.tableWrapper}>
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-[85px]" />
          <col /><col /><col /><col /><col /><col />
          <col className="w-[150px]" />
          <col className="w-[55px]" />
          <col className="w-[55px]" />
        </colgroup>
        <thead>
          <tr>
            <th className={tw.headerCell}>구분</th>
            <th colSpan={6} className={tw.headerCell}>항목</th>
            <th className={tw.headerCellSm}>FMEA명</th>
            <th className={tw.headerCellSm}>빈템플렛</th>
            <th className={tw.headerCellSm}>샘플</th>
          </tr>
        </thead>
        <tbody>
          {/* L0 공통요소 */}
          <tr>
            <td className={tw.rowHeaderSm}>L0 공통</td>
            <td className={tw.cell}>L0-1 사람</td>
            <td className={tw.cell}>L0-2 부자재</td>
            <td className={tw.cell}>L0-3 작업환경</td>
            <td className={tw.cell}></td>
            <td className={tw.cell}></td>
            <td className={tw.cell}></td>
            <td className={tw.cellPad}>
              <select className={tw.select}>
                <option value="">선택</option>
                {fmeaList.map(f => (<option key={f.id} value={f.id}>{(f as any).fmeaNo || f.fmeaInfo?.subject || 'FMEA'}</option>))}
              </select>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadEmptyTemplate()} className={tw.btnPrimary}>양식</button>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadSampleTemplate()} className={tw.btnPrimary}>샘플</button>
            </td>
          </tr>
          {/* L1 고장영향 */}
          <tr>
            <td className={tw.rowHeader}>L1 고장영향</td>
            <td className={tw.cell}>L1-1 구분</td>
            <td className={tw.cell}>L1-2 제품기능</td>
            <td className={tw.cell}>L1-3 요구사항</td>
            <td className={tw.cell}>L1-4 고장영향</td>
            <td className={tw.cell}></td>
            <td className={tw.cell}></td>
            <td className={tw.cellPad}>
              <select className={tw.select}>
                <option value="">선택</option>
                {fmeaList.map(f => (<option key={f.id} value={f.id}>{(f as any).fmeaNo || f.fmeaInfo?.subject || 'FMEA'}</option>))}
              </select>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadRelationCEmpty()} className={tw.btnDanger}>양식</button>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadRelationCSample()} className={tw.btnDanger}>샘플</button>
            </td>
          </tr>
          {/* L2 고장형태 */}
          <tr>
            <td className={tw.rowHeader}>L2 고장형태</td>
            <td className={tw.cell}>L2-1 공정번호</td>
            <td className={tw.cell}>L2-2 공정명</td>
            <td className={tw.cell}>L2-3 공정기능</td>
            <td className={tw.cell}>L2-4 제품특성</td>
            <td className={tw.cell}>L2-5 고장형태</td>
            <td className={tw.cell}>L2-6 검출관리</td>
            <td className={tw.cellPad}>
              <select className={tw.select}>
                <option value="">선택</option>
                {fmeaList.map(f => (<option key={f.id} value={f.id}>{(f as any).fmeaNo || f.fmeaInfo?.subject || 'FMEA'}</option>))}
              </select>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadRelationAEmpty()} className={tw.btnBlue}>양식</button>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadRelationASample()} className={tw.btnBlue}>샘플</button>
            </td>
          </tr>
          {/* L3 고장원인 */}
          <tr>
            <td className={tw.rowHeader}>L3 고장원인</td>
            <td className={tw.cell}>L3-1 작업요소</td>
            <td className={tw.cell}>L3-2 요소기능</td>
            <td className={tw.cell}>L3-3 공정특성</td>
            <td className={tw.cell}>L3-4 고장원인</td>
            <td className={tw.cell}>L3-5 예방관리</td>
            <td className={tw.cell}></td>
            <td className={tw.cellPad}>
              <select className={tw.select}>
                <option value="">선택</option>
                {fmeaList.map(f => (<option key={f.id} value={f.id}>{(f as any).fmeaNo || f.fmeaInfo?.subject || 'FMEA'}</option>))}
              </select>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadRelationBEmpty()} className={tw.btnGreen}>양식</button>
            </td>
            <td className={tw.cellPad}>
              <button onClick={() => downloadRelationBSample()} className={tw.btnGreen}>샘플</button>
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
                      <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} ref={fileInputRef} />
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
                      {/* 항목 선택 드롭다운 */}
                      <select
                        value={partialItemCode}
                        onChange={(e) => setPartialItemCode(e.target.value)}
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
                      <select className="px-2 py-1 border border-gray-400 rounded text-[11px] bg-orange-50">
                        <option value="C">고장영향 분석 자료</option>
                        <option value="A">고장형태 분석 자료</option>
                        <option value="B">고장원인 분석 자료</option>
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
      <div className="flex gap-5 items-stretch">
        {/* 좌측: FMEA 기초정보 미리 보기 - 고정 400px */}
        <div className="w-[400px] shrink-0 flex flex-col border-2 border-[#00587a] rounded-lg overflow-hidden bg-white shadow-lg">
          {/* FMEA 기초정보 미리 보기 헤더 */}
          <div className="bg-gradient-to-br from-[#00587a] to-[#007a9e] text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2">
            <span>📋</span> FMEA 기초정보 미리 보기
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
            </div>

            {/* 테이블 - 스크롤 영역 (고정 높이 350px) */}
            <div className="flex-1 overflow-y-auto max-h-[350px] border-t border-gray-200 bg-gray-50">
              <table className="w-full border-collapse table-fixed">
                <colgroup><col className="w-[30px]" /><col className="w-[35px]" /><col className="w-[35px]" /><col className="w-[60px]" /><col /></colgroup>
                <thead className="sticky top-0 z-[1]">
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
                    {/* 선택된 항목명 동적 표시 */}
                    <th className={tw.headerCell}>{PREVIEW_OPTIONS.find(o => o.value === previewColumn)?.label.split(' ')[1] || '항목'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // 선택한 항목 코드에 해당하는 데이터 필터링
                    const selectedData = flatData.filter(d => d.itemCode === previewColumn);
                    
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
                        <td className={tw.cellCenter}>{item.processNo}</td>
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

        {/* 우측: FMEA 분석 DATA 미리 보기 - 나머지 영역 */}
        <div className="flex-1 flex flex-col border-2 border-[#00587a] rounded-lg overflow-hidden bg-white shadow-lg">
          {/* FMEA 분석 DATA 미리 보기 헤더 */}
          <div className="bg-gradient-to-br from-[#00587a] to-[#007a9e] text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2">
            <span>📈</span> FMEA 분석 DATA 미리 보기
          </div>
          
          {/* 탭 + 테이블 통합 wrapper - FMEA 기초정보 미리 보기와 동일한 디자인 */}
          <div className="flex-1 flex flex-col">
            {/* 탭 - 드롭다운 + 버튼 */}
            <div className="flex w-full border-b border-gray-400 shrink-0">
              <select 
                value={relationTab}
                onChange={(e) => setRelationTab(e.target.value as 'A' | 'B' | 'C')}
                className="flex-1 px-2 py-2 border-none font-bold bg-[#e0f2fb] text-[#00587a] text-xs"
              >
                <option value="A">고장형태 분석(2L)</option>
                <option value="B">고장원인 분석(3L)</option>
                <option value="C">고장영향 분석(1L)</option>
              </select>
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
                {relationData.length === 0 ? (
                  Array.from({ length: 10 }).map((_, i) => {
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
                  })
                ) : (
                  relationData.map((row, i) => {
                    const keys = Object.keys(row);
                    const processNo = row.A1 || String(i + 1);
                    return (
                      <tr key={i} className={selectedRelationRows.has(processNo) ? 'bg-orange-50' : 'bg-white'}>
                        <td className={tw.cellCenter}>
                          <input 
                            type="checkbox" 
                            checked={selectedRelationRows.has(processNo)}
                            onChange={() => handleRelationRowSelect(processNo)}
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
                        {keys.slice(0, 5).map((key, j) => {
                          const val = row[key as keyof typeof row];
                          return (
                            <td key={j} className={tw.cellPad}>
                              {val ? (
                                <span className="break-words whitespace-normal leading-tight block px-1 py-0.5">{val}</span>
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
                  })
                )}
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
    </>
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

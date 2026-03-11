/**
 * PDFViewer - PDF 뷰어 패널
 * 
 * 기능:
 * - PDF 파일 업로드 (드래그앤드롭 + 클릭)
 * - 여러 PDF 파일 관리 (추가/삭제)
 * - 페이지 네비게이션
 * - 확대/축소
 * - FMEA별 PDF 저장 (localStorage)
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker 설정 (로컬 — CDN 의존성 제거)
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/** 샘플 PDF (항상 표시, public/sample-pfmea.pdf) */
const SAMPLE_PDF: PDFFile = {
  id: 'sample-pfmea',
  name: 'LB_BUMP_PFMEA_개요서.pdf (샘플)',
  data: '/sample-pfmea.pdf',   // URL 경로 (Base64가 아닌 URL)
  uploadedAt: '2026-03-02T00:00:00.000Z',
  isSample: true,
};

interface PDFFile {
  id: string;
  name: string;
  data: string; // Base64 encoded 또는 URL 경로
  uploadedAt: string;
  isSample?: boolean; // 샘플 PDF 여부
}

interface PDFViewerProps {
  state: any;
}

export default function PDFViewer({ state }: PDFViewerProps) {
  const fmeaId = state?.fmeaId || 'default';
  const storageKey = `pdf-files-${fmeaId}`;
  
  // PDF 파일 목록
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  
  // 뷰어 상태
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // localStorage에서 PDF 목록 로드 + 샘플 PDF 항상 포함
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: PDFFile[] = JSON.parse(saved);
        // 샘플 PDF를 맨 앞에 항상 포함 (중복 방지)
        const withoutSample = parsed.filter(f => f.id !== SAMPLE_PDF.id);
        const allFiles = [SAMPLE_PDF, ...withoutSample];
        setPdfFiles(allFiles);
        if (!selectedFileId) {
          setSelectedFileId(allFiles[0].id);
        }
      } else {
        // 저장된 파일이 없으면 샘플 PDF만 표시
        setPdfFiles([SAMPLE_PDF]);
        setSelectedFileId(SAMPLE_PDF.id);
      }
    } catch (e) {
      console.error('PDF 목록 로드 실패:', e);
      // 에러 시에도 샘플 PDF 표시
      setPdfFiles([SAMPLE_PDF]);
      setSelectedFileId(SAMPLE_PDF.id);
    }
  }, [storageKey]);
  
  // 선택된 PDF 파일
  const selectedFile = pdfFiles.find(f => f.id === selectedFileId);
  
  // 파일 읽기 함수
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  // 파일 업로드 처리
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsLoading(true);
    const newFiles: PDFFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf') {
        alert(`${file.name}은(는) PDF 파일이 아닙니다.`);
        continue;
      }
      
      // 10MB 제한으로 증가
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}이(가) 10MB를 초과합니다.`);
        continue;
      }
      
      try {
        const base64 = await readFileAsBase64(file);
        newFiles.push({
          id: `pdf-${Date.now()}-${i}`,
          name: file.name,
          data: base64,
          uploadedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('파일 읽기 실패:', file.name, e);
      }
    }
    
    if (newFiles.length > 0) {
      setPdfFiles(prev => [...prev, ...newFiles]);
      setSelectedFileId(newFiles[0].id);
    }
    
    setIsLoading(false);
    
    // 파일 입력 초기화 (같은 파일 재선택 가능하도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  // 파일 추가 버튼 클릭
  const handleAddClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  // 드래그 앤 드롭
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);
  
  // PDF 삭제 (샘플 PDF는 삭제 불가)
  const handleDeletePDF = useCallback((id: string) => {
    const target = pdfFiles.find(f => f.id === id);
    if (target?.isSample) return; // 샘플 삭제 방지
    if (!confirm('이 PDF 파일을 삭제하시겠습니까?')) return;

    setPdfFiles(prev => {
      const newList = prev.filter(f => f.id !== id);
      if (selectedFileId === id) {
        setSelectedFileId(newList.length > 0 ? newList[0].id : null);
      }
      return newList;
    });
  }, [selectedFileId, pdfFiles]);

  // 전체 삭제 (샘플 PDF는 유지)
  const handleDeleteAll = useCallback(() => {
    const userFiles = pdfFiles.filter(f => !f.isSample);
    if (userFiles.length === 0) return;
    if (!confirm('업로드한 PDF 파일을 모두 삭제하시겠습니까?\n(샘플 PDF는 유지됩니다)')) return;

    setPdfFiles([SAMPLE_PDF]);
    setSelectedFileId(SAMPLE_PDF.id);
  }, [pdfFiles]);
  
  // 저장 (샘플 PDF는 제외 — 항상 자동 로드됨)
  const handleSave = useCallback(() => {
    try {
      const userFiles = pdfFiles.filter(f => !f.isSample);
      localStorage.setItem(storageKey, JSON.stringify(userFiles));
      setSaveMessage('✅ 저장 완료');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (e) {
      console.error('PDF 저장 실패:', e);
      setSaveMessage('❌ 저장 실패');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  }, [pdfFiles, storageKey]);
  
  // PDF 로드 완료
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);
  
  // 줌 조절
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => setScale(1.0);
  
  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* 숨겨진 파일 입력 - 반드시 최상단에 하나만 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFileUpload(e.target.files);
        }}
      />
      
      {/* 헤더 + 액션 버튼 */}
      <div className="bg-blue-600 text-white py-2 px-3 shrink-0">
        <div className="flex justify-between items-center mb-2 pr-5">
          <span className="text-xs font-bold">📄 PDF 뷰어</span>
          <span className="text-[10px] font-normal opacity-80">
            {pdfFiles.length}개 파일
          </span>
        </div>
        {/* 액션 버튼들 */}
        <div className="flex gap-1">
          <button
            onClick={handleAddClick}
            className="flex-1 px-2 py-1 text-[10px] bg-green-500 hover:bg-green-600 rounded font-semibold"
          >
            ➕ 추가
          </button>
          <button
            onClick={() => selectedFileId && handleDeletePDF(selectedFileId)}
            disabled={!selectedFileId}
            className="flex-1 px-2 py-1 text-[10px] bg-red-500 hover:bg-red-600 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ 삭제
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={pdfFiles.length === 0}
            className="px-2 py-1 text-[10px] bg-red-700 hover:bg-red-800 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ 전체
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-2 py-1 text-[10px] bg-yellow-500 hover:bg-yellow-600 text-black rounded font-semibold"
          >
            💾 저장
          </button>
        </div>
        {saveMessage && (
          <div className="text-[10px] text-center mt-1 font-semibold">
            {saveMessage}
          </div>
        )}
      </div>
      
      {/* PDF 목록 (컴팩트) */}
      {pdfFiles.length > 0 && (
        <div className="border-b border-gray-300 bg-white shrink-0 max-h-[72px] overflow-y-auto">
          {pdfFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center justify-between px-2 py-0.5 text-[9px] cursor-pointer hover:bg-gray-100 border-b border-gray-50 last:border-b-0 leading-tight ${
                selectedFileId === file.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600'
              }`}
              onClick={() => {
                setSelectedFileId(file.id);
              }}
            >
              <div className="flex items-center gap-1 overflow-hidden min-w-0">
                <span className="text-[8px]">📄</span>
                <span className="truncate" title={file.name}>
                  {file.name}
                </span>
                {file.isSample && (
                  <span className="px-0.5 text-[7px] bg-blue-100 text-blue-600 rounded font-bold shrink-0">샘플</span>
                )}
              </div>
              {!file.isSample && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePDF(file.id);
                  }}
                  className="text-red-400 hover:text-red-600 p-0 text-[10px] shrink-0 ml-1"
                  title="삭제"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* 업로드 영역 (파일이 없을 때) */}
      {pdfFiles.length === 0 && (
        <div
          className={`flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed m-2 rounded-lg transition-colors cursor-pointer ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleAddClick}
        >
          <div className="text-[40px] mb-2">📁</div>
          <div className="text-sm font-semibold text-gray-600 mb-1">
            PDF 파일 업로드
          </div>
          <div className="text-[10px] text-gray-400 text-center">
            클릭하거나 드래그하여<br/>
            PDF 파일을 추가하세요<br/>
            (최대 10MB, 여러 파일 가능)
          </div>
        </div>
      )}
      
      {/* PDF 뷰어 */}
      {selectedFile && (
        <>
          {/* 컨트롤 바 (줌 + 페이지 수) */}
          <div className="flex items-center justify-between px-2 py-0.5 bg-gray-200 border-b border-gray-300 shrink-0">
            <span className="text-[9px] text-gray-500">
              {numPages > 0 ? `${numPages}페이지` : ''}
            </span>
            {/* 줌 컨트롤 */}
            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                className="px-1.5 py-0 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100"
              >
                −
              </button>
              <button
                onClick={resetZoom}
                className="px-1 py-0 text-[9px] bg-white border border-gray-300 rounded min-w-[32px] hover:bg-gray-100"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={zoomIn}
                className="px-1.5 py-0 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* PDF 렌더링 영역 — 모든 페이지 스크롤 */}
          <div
            className="flex-1 overflow-auto bg-gray-400 p-2"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Document
              file={selectedFile.data}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-[300px] text-white text-sm">
                  로딩 중...
                </div>
              }
              error={
                <div className="flex items-center justify-center h-[300px] text-red-200 text-sm">
                  PDF 로드 실패
                </div>
              }
            >
              <div className="flex flex-col items-center gap-2">
                {Array.from({ length: numPages }, (_, i) => (
                  <Page
                    key={`page-${i + 1}`}
                    pageNumber={i + 1}
                    scale={scale}
                    width={280}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                ))}
              </div>
            </Document>
          </div>
        </>
      )}
      
      {/* 드래그 오버레이 */}
      {isDragging && pdfFiles.length > 0 && (
        <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-white/90 px-6 py-4 rounded-lg shadow-lg text-center">
            <div className="text-3xl mb-2">📄</div>
            <div className="text-sm font-semibold text-blue-600">
              여기에 PDF 파일을 놓으세요
            </div>
          </div>
        </div>
      )}
      
      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-white px-6 py-4 rounded-lg shadow-lg text-center">
            <div className="text-2xl mb-2">⏳</div>
            <div className="text-sm font-semibold text-gray-700">
              업로드 중...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

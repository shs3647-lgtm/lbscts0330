// @ts-nocheck
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

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFFile {
  id: string;
  name: string;
  data: string; // Base64 encoded
  uploadedAt: string;
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
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // localStorage에서 PDF 목록 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPdfFiles(parsed);
        if (parsed.length > 0 && !selectedFileId) {
          setSelectedFileId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error('PDF 목록 로드 실패:', e);
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
      setPageNumber(1);
    }
    
    setIsLoading(false);
    
    // 파일 입력 초기화 (같은 파일 재선택 가능하도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  // 파일 추가 버튼 클릭
  const handleAddClick = useCallback(() => {
    console.log('📄 파일 추가 버튼 클릭');
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
  
  // PDF 삭제
  const handleDeletePDF = useCallback((id: string) => {
    if (!confirm('이 PDF 파일을 삭제하시겠습니까?')) return;
    
    setPdfFiles(prev => {
      const newList = prev.filter(f => f.id !== id);
      if (selectedFileId === id) {
        setSelectedFileId(newList.length > 0 ? newList[0].id : null);
        setPageNumber(1);
      }
      return newList;
    });
  }, [selectedFileId]);
  
  // 전체 삭제
  const handleDeleteAll = useCallback(() => {
    if (pdfFiles.length === 0) return;
    if (!confirm('모든 PDF 파일을 삭제하시겠습니까?')) return;
    
    setPdfFiles([]);
    setSelectedFileId(null);
    setPageNumber(1);
    setNumPages(0);
  }, [pdfFiles.length]);
  
  // 저장
  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pdfFiles));
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
    setPageNumber(1);
  }, []);
  
  // 페이지 이동
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  }, [numPages]);
  
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
          console.log('📄 파일 선택됨:', e.target.files?.length);
          handleFileUpload(e.target.files);
        }}
      />
      
      {/* 헤더 + 액션 버튼 */}
      <div className="bg-blue-600 text-white py-2 px-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
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
      
      {/* PDF 목록 */}
      {pdfFiles.length > 0 && (
        <div className="border-b border-gray-300 bg-white shrink-0 max-h-[100px] overflow-y-auto">
          {pdfFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center justify-between px-2 py-1.5 text-[10px] cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                selectedFileId === file.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
              onClick={() => {
                setSelectedFileId(file.id);
                setPageNumber(1);
              }}
            >
              <div className="flex items-center gap-1 overflow-hidden">
                <span>📄</span>
                <span className="truncate max-w-[200px]" title={file.name}>
                  {file.name}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePDF(file.id);
                }}
                className="text-red-400 hover:text-red-600 p-0.5 text-sm"
                title="삭제"
              >
                ✕
              </button>
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
          {/* 컨트롤 바 */}
          <div className="flex items-center justify-between px-2 py-1 bg-gray-200 border-b border-gray-300 shrink-0">
            {/* 페이지 네비게이션 */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(1)}
                disabled={pageNumber <= 1}
                className="px-1 py-0.5 text-[10px] bg-white border border-gray-300 rounded disabled:opacity-40"
                title="처음"
              >
                ⏮
              </button>
              <button
                onClick={() => goToPage(pageNumber - 1)}
                disabled={pageNumber <= 1}
                className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded disabled:opacity-40"
              >
                ◀
              </button>
              <span className="text-[10px] text-gray-600 min-w-[50px] text-center">
                {pageNumber}/{numPages}
              </span>
              <button
                onClick={() => goToPage(pageNumber + 1)}
                disabled={pageNumber >= numPages}
                className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded disabled:opacity-40"
              >
                ▶
              </button>
              <button
                onClick={() => goToPage(numPages)}
                disabled={pageNumber >= numPages}
                className="px-1 py-0.5 text-[10px] bg-white border border-gray-300 rounded disabled:opacity-40"
                title="끝"
              >
                ⏭
              </button>
            </div>
            
            {/* 줌 컨트롤 */}
            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100"
              >
                −
              </button>
              <button
                onClick={resetZoom}
                className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded min-w-[35px] hover:bg-gray-100"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={zoomIn}
                className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
          
          {/* PDF 렌더링 영역 */}
          <div 
            className="flex-1 overflow-auto bg-gray-400 p-2"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex justify-center">
              <Document
                file={selectedFile.data}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center h-[300px] text-white text-sm">
                    ⏳ 로딩 중...
                  </div>
                }
                error={
                  <div className="flex items-center justify-center h-[300px] text-red-200 text-sm">
                    ❌ PDF 로드 실패
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  width={300}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>
          </div>
          
          {/* 파일 정보 */}
          <div className="px-2 py-1 bg-gray-100 border-t border-gray-300 text-[9px] text-gray-500 shrink-0 truncate">
            📄 {selectedFile.name}
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

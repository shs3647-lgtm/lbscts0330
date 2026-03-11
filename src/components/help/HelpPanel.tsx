/**
 * @file help/HelpPanel.tsx
 * @description 공용 도움말 플로팅 윈도우 (드래그 이동 + 크기 조절 + 탭 네비게이션 + PDF 내보내기)
 * @module help
 * CODEFREEZE
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { HelpSectionDef, HelpManualMeta } from './types';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sections: HelpSectionDef[];
  meta: HelpManualMeta;
  initialSection?: string;
}

const DEFAULT_W = 720;
const DEFAULT_H = 480;

/**
 * 공용 도움말 플로팅 윈도우
 * - 헤더 드래그로 이동
 * - 우하단 핸들로 크기 조절
 * - 배경 페이지 조작 가능 (비모달)
 * - PDF 내보내기 (html2canvas + jspdf)
 */
export function HelpPanel({ isOpen, onClose, sections, meta, initialSection }: HelpPanelProps) {
  const [activeKey, setActiveKey] = useState(sections[0]?.key || '');
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // 위치 & 크기 (화면 중앙 초기값)
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  // 열릴 때 화면 중앙으로 초기화
  useEffect(() => {
    if (isOpen) {
      const cx = Math.max(0, Math.round((window.innerWidth - DEFAULT_W) / 2));
      const cy = Math.max(48, Math.round((window.innerHeight - DEFAULT_H) / 2 - 40));
      setPos({ x: cx, y: cy });
      setSize({ w: DEFAULT_W, h: DEFAULT_H });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialSection) {
      const found = sections.find(s => s.key === initialSection);
      if (found) setActiveKey(found.key);
    }
  }, [isOpen, initialSection, sections]);

  // 드래그 핸들러
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({ x: dragRef.current.origX + dx, y: Math.max(0, dragRef.current.origY + dy) });
    };
    const onUp = () => { dragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pos]);

  // 리사이즈 핸들러
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dw = ev.clientX - resizeRef.current.startX;
      const dh = ev.clientY - resizeRef.current.startY;
      setSize({ w: Math.max(400, resizeRef.current.origW + dw), h: Math.max(280, resizeRef.current.origH + dh) });
    };
    const onUp = () => { resizeRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [size]);

  // PDF 내보내기
  const handleExportPDF = useCallback(async () => {
    const contentDiv = printRef.current;
    if (!contentDiv) return;
    setExporting(true);

    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      // 숨김 해제하여 캡처 준비
      contentDiv.style.display = 'block';
      contentDiv.style.position = 'absolute';
      contentDiv.style.left = '-9999px';
      contentDiv.style.width = '800px';
      contentDiv.style.padding = '24px';
      contentDiv.style.backgroundColor = '#fff';
      contentDiv.style.fontFamily = 'Malgun Gothic, sans-serif';

      const canvas = await html2canvas(contentDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      // 다시 숨기기
      contentDiv.style.display = 'none';
      contentDiv.style.position = '';
      contentDiv.style.left = '';
      contentDiv.style.width = '';
      contentDiv.style.padding = '';

      const imgData = canvas.toDataURL('image/png');
      const imgW = canvas.width;
      const imgH = canvas.height;

      // A4 사이즈 PDF (210mm x 297mm)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = 210;
      const pdfH = 297;
      const margin = 10;
      const contentW = pdfW - margin * 2;
      const ratio = contentW / imgW;
      const scaledH = imgH * ratio;

      // 여러 페이지 지원
      let yOffset = 0;
      const pageH = pdfH - margin * 2;
      let isFirstPage = true;

      while (yOffset < scaledH) {
        if (!isFirstPage) pdf.addPage();
        const srcY = yOffset / ratio;
        const srcH = Math.min(pageH / ratio, imgH - srcY);
        if (srcH <= 0) break;

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = imgW;
        tmpCanvas.height = Math.ceil(srcH);
        const ctx = tmpCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, srcH);
          const pageImg = tmpCanvas.toDataURL('image/png');
          pdf.addImage(pageImg, 'PNG', margin, margin, contentW, srcH * ratio);
        }

        yOffset += pageH;
        isFirstPage = false;
      }

      const fileName = `${meta.module}_도움말_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF 내보내기 오류:', err);
      alert('PDF 내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  }, [meta]);

  if (!isOpen) return null;

  const ActiveComponent = sections.find(s => s.key === activeKey)?.component;
  const contentH = size.h - 80;

  return (
    <div
      className="fixed z-[9999] bg-yellow-50 border border-yellow-400 rounded-lg shadow-2xl flex flex-col select-none"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* 헤더 (드래그 영역) */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-yellow-200 border-b border-yellow-300 rounded-t-lg cursor-move shrink-0"
        onMouseDown={onDragStart}
      >
        <span className="text-xs font-bold text-yellow-800 select-none">{meta.title}</span>
        <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
              exporting
                ? 'bg-gray-200 text-gray-400 cursor-wait'
                : 'bg-white border border-yellow-400 text-yellow-800 hover:bg-yellow-100'
            }`}
            title="전체 매뉴얼 PDF 내보내기"
          >
            {exporting ? 'PDF...' : 'PDF'}
          </button>
          <button onClick={onClose} className="w-5 h-5 flex items-center justify-center text-yellow-700 hover:text-red-600 hover:bg-red-100 text-sm font-bold rounded transition-colors" title="닫기">&times;</button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-0.5 px-2 pt-1.5 pb-1 flex-wrap shrink-0 bg-yellow-50 border-b border-yellow-200">
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveKey(s.key)}
            className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors ${activeKey === s.key ? 'bg-yellow-400 text-yellow-900' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-300'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* 활성 섹션 콘텐츠 */}
      <div className="flex-1 px-3 py-2 text-[11px] text-gray-700 leading-relaxed overflow-y-auto" style={{ maxHeight: Math.max(100, contentH) }}>
        {ActiveComponent && <ActiveComponent />}
      </div>

      {/* 리사이즈 핸들 (우하단) */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={onResizeStart}
        title="크기 조절"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-yellow-500 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>

      {/* PDF 내보내기용 숨김 영역 (모든 섹션 렌더) */}
      <div ref={printRef} style={{ display: 'none' }}>
        <h1 style={{ fontSize: '18pt', color: '#00587a', borderBottom: '3px solid #00587a', paddingBottom: '8px', marginBottom: '16px' }}>
          {meta.title}
        </h1>
        <div style={{ fontSize: '9pt', color: '#666', marginBottom: '20px' }}>
          모듈: {meta.module} | 버전: {meta.version} | 최종 수정: {meta.lastUpdated} | 내보내기일: {new Date().toLocaleDateString('ko-KR')}
        </div>
        {sections.map(s => (
          <div key={s.key} style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14pt', color: '#00587a', margin: '24px 0 12px', padding: '6px 0', borderBottom: '1px solid #ccc' }}>{s.label}</div>
            <div><s.component /></div>
          </div>
        ))}
        <div style={{ marginTop: '40px', paddingTop: '12px', borderTop: '1px solid #ccc', fontSize: '8pt', color: '#999', textAlign: 'center' }}>
          FMEA On-Premise System | {meta.title}
        </div>
      </div>
    </div>
  );
}

export default HelpPanel;

/**
 * @file TopMenuBar.tsx
 * @description 워크시트 상단 메뉴바 (FMEA 선택, 저장, Import/Export, 특별특성 등)
 */

'use client';

import React from 'react';
import { COLORS } from '../constants';
import { topMenuBarStyle, saveButtonStyle, importMenuStyle, importMessageStyle, apContainerStyle, apCellStyle, apCellStyleWithWidth } from './TopMenuBarStyles';

interface TopMenuBarProps {
  fmeaList: any[];
  currentFmea: any;
  selectedFmeaId: string | null;
  dirty: boolean;
  isSaving: boolean;
  lastSaved: string;
  currentTab: string;
  importMessage: { type: 'success' | 'error'; text: string } | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFmeaChange: (id: string) => void;
  onSave: () => void;
  onNavigateToList: () => void;
  onExport: () => void;
  onImportClick: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  onOpenSpecialChar: () => void;
  onOpenSOD: () => void;
  onOpen5AP: () => void;
  onOpen6AP: () => void;
}

export default function TopMenuBar({ 
  fmeaList, currentFmea, selectedFmeaId, dirty, isSaving, lastSaved, currentTab, importMessage, fileInputRef,
  onFmeaChange, onSave, onNavigateToList, onExport, onImportClick, onImportFile, onDownloadTemplate, onOpenSpecialChar, onOpenSOD, onOpen5AP, onOpen6AP
}: TopMenuBarProps) {
  const [showImportMenu, setShowImportMenu] = React.useState(false);

  return (
    <div 
      className="flex items-center gap-2" 
      style={topMenuBarStyle}
    >
      {/* FMEA명 */}
      <div className="flex items-center gap-1.5">
        <span 
          className="text-white cursor-pointer hover:underline text-xs font-semibold" 
          onClick={onNavigateToList}
        >
          📋 FMEA명:
        </span>
        <select
          value={selectedFmeaId || '__NEW__'}
          onChange={(e) => onFmeaChange(e.target.value)}
          className="px-2 py-1 rounded border-0 bg-white/20 text-white min-w-[160px] text-xs font-normal"
        >
          <option value="__NEW__" className="text-gray-800 font-bold">📄 빈화면 (새로 작성)</option>
          {fmeaList.map((fmea: any) => (
            <option key={fmea.id} value={fmea.id} className="text-gray-800">
              {fmea.fmeaInfo?.subject || fmea.project?.productName || fmea.id}
            </option>
          ))}
        </select>
        <button 
          onClick={onNavigateToList} 
          className="px-2 py-1 text-white rounded hover:bg-white/20 text-xs"
        >
          📋
        </button>
      </div>

      <div className="w-px h-5 bg-white/30" />

      {/* 저장/Import/Export */}
      <div className="flex items-center gap-1.5 relative">
        <button 
          onClick={onSave} 
          disabled={isSaving} 
          className="px-3 py-1 rounded transition-all text-xs font-semibold"
          style={saveButtonStyle(isSaving, dirty)}
        >
          {isSaving ? '⏳저장중' : dirty ? '💾저장' : '✅저장됨'}
        </button>
        
        {/* Import 버튼 및 드롭다운 */}
        <div className="relative">
          <button 
            onClick={() => setShowImportMenu(!showImportMenu)}
            className="px-3 py-1 rounded transition-all bg-transparent border-transparent text-white text-xs font-medium hover:bg-white/15 hover:text-[#ffd600]"
          >
            📥Import▾
          </button>
          {showImportMenu && (
            <div 
              className="absolute top-full left-0 mt-1 bg-white rounded shadow-lg border z-50 min-w-[160px]"
              style={importMenuStyle}
              onMouseLeave={() => setShowImportMenu(false)}
            >
              <button
                onClick={() => { 
                  fileInputRef.current?.click(); 
                  setShowImportMenu(false); 
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b"
              >
                📂 Excel 파일 가져오기
              </button>
              <button
                onClick={() => { 
                  onDownloadTemplate(); 
                  setShowImportMenu(false); 
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50"
              >
                📋 템플릿 다운로드
              </button>
            </div>
          )}
        </div>
        
        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={onImportFile}
          className="hidden"
        />
        
        <button 
          onClick={onExport} 
          className="px-3 py-1 rounded transition-all bg-transparent border-transparent text-white text-xs font-medium hover:bg-white/15 hover:text-[#ffd600]"
        >
          📤Export
        </button>
        
        {/* Import 결과 메시지 */}
        {importMessage && (
          <span 
            className="px-3 py-1 rounded text-xs font-semibold"
            style={importMessageStyle(importMessage.type)}
          >
            {importMessage.text}
          </span>
        )}
      </div>

      <div className="w-px h-5 bg-white/30" />

      {/* 특별특성/SOD/5AP/6AP/LLD */}
      <div className="flex items-center gap-1.5 mr-[280px]">
        <button 
          onClick={onOpenSpecialChar} 
          className="px-3 py-1 rounded transition-all bg-transparent border-transparent text-white text-xs font-medium hover:bg-white/15 hover:text-[#ffd600]"
        >
          ⭐특별특성
        </button>
        <button 
          onClick={onOpenSOD} 
          className="px-3 py-1 rounded transition-all bg-transparent border-transparent text-white text-xs font-medium hover:bg-white/15 hover:text-[#ffd600]"
        >
          📊SOD
        </button>
        <button 
          onClick={onOpen5AP} 
          className="px-3 py-1 rounded transition-all bg-transparent border-transparent text-white text-xs font-medium hover:bg-white/15 hover:text-[#ffd600]"
        >
          5AP
        </button>
        <button 
          onClick={onOpen6AP} 
          className="px-3 py-1 rounded transition-all bg-transparent border-transparent text-white text-xs font-medium hover:bg-white/15 hover:text-[#ffd600]"
        >
          6AP
        </button>
        <button 
          className="px-3 py-1 rounded transition-all bg-transparent border-transparent text-white text-xs font-medium hover:bg-white/15 hover:text-[#ffd600]"
        >
          📚LLD
        </button>
      </div>

      {/* 우측 영역: 5단계 AP - 절대 위치 고정 (270px) */}
      <div className="flex-1" />
      <div style={apContainerStyle}>
        <div style={apCellStyleWithWidth('80px')}>
          <span className="text-[#ffd600] text-[11px] font-bold leading-none whitespace-nowrap">5단계 AP:</span>
        </div>
        <div style={apCellStyleWithWidth('60px')}>
          <span className="text-[#ef5350] text-[11px] font-bold leading-none whitespace-nowrap">H:0</span>
        </div>
        <div style={apCellStyleWithWidth('65px')}>
          <span className="text-[#ffc107] text-[11px] font-bold leading-none whitespace-nowrap">M:0</span>
        </div>
        <div style={apCellStyleWithWidth('65px')}>
          <span className="text-[#66bb6a] text-[11px] font-bold leading-none whitespace-nowrap">L:0</span>
        </div>
      </div>
    </div>
  );
}


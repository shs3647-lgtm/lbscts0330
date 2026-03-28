/**
 * @file FunctionL2Header.tsx
 * @description FunctionL2Tab 전용 헤더 컴포넌트
 * @updated 2026-02-16 - 헤더 표준화 (11px, bold, p-1, 배지 10px)
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


'use client';

import React, { useState } from 'react';
import { btnConfirm, btnEdit, badgeConfirmed, badgeMissing, badgeOk } from '@/styles/worksheet';
import { HelpPopup } from './HelpPopup';
import { ImportVerifyBadge } from './ImportVerifyBadge';
import { BiHeader } from './BaseWorksheetComponents';

interface FunctionL2HeaderProps {
  isConfirmed: boolean;
  missingCount: number;
  processCount: number;
  l2FunctionCount: number;
  productCharCount: number;
  onConfirm: () => void;
  onEdit: () => void;
  isAutoMode?: boolean;
  onToggleMode?: () => void;
  isLoadingMaster?: boolean;
  importProductCharCount?: number;
  importProcessCount?: number;
  importLoaded?: boolean;
  onMissingClick?: () => void;
}

export function FunctionL2Header({
  isConfirmed,
  missingCount,
  processCount,
  l2FunctionCount,
  productCharCount,
  onConfirm,
  onEdit,
  isAutoMode,
  onToggleMode,
  isLoadingMaster,
  importProductCharCount,
  importProcessCount,
  importLoaded,
  onMissingClick,
}: FunctionL2HeaderProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
      {/* 1행: 단계 구분 (11px, bold) */}
      <tr>
        <th className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center">
          <BiHeader ko="2L 구조분석" en="Structure" />
        </th>
        <th colSpan={3} className="bg-[#388e3c] text-white border border-[#ccc] p-1 text-[11px] font-bold">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap"><BiHeader ko="2L 기능분석" en="Function" /></span>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHelp(prev => !prev); }} className={`px-2 py-0 text-[10px] font-bold rounded cursor-pointer border whitespace-nowrap ${showHelp ? 'bg-yellow-400 text-gray-800 border-yellow-500' : 'bg-white/20 text-white border-white/40 hover:bg-white/30'}`} title="도움말 보기/닫기">도움말(Help)</button>
            </div>
            <div className="flex gap-1 shrink-0 items-center">
              {onToggleMode && (
                <button type="button" onClick={() => onToggleMode()}
                  disabled={isLoadingMaster === true}
                  className={`px-2 py-0 text-[10px] font-bold rounded cursor-pointer ${isAutoMode
                    ? 'bg-green-500 text-white border border-green-600'
                    : 'bg-gray-300 text-gray-700 border border-gray-400 hover:bg-gray-400'}`}
                  title={isAutoMode ? '자동모드 (클릭→수동)' : '수동모드 (클릭→자동)'}>
                  {isLoadingMaster ? '로딩...(Loading)' : isAutoMode ? '자동(Auto)' : '수동(Manual)'}
                </button>
              )}
              {isConfirmed ? (
                <span className={badgeConfirmed}>확정됨(Confirmed)({importLoaded && importProductCharCount ? importProductCharCount : productCharCount})</span>
              ) : (
                <button type="button" onClick={onConfirm} className={btnConfirm}>미확정(Unconfirmed)</button>
              )}
              {missingCount > 0 ? (
                <button type="button" onClick={onMissingClick} className={`${badgeMissing} cursor-pointer hover:opacity-80`} title="클릭하여 누락 항목으로 이동">누락(Missing) {missingCount}건(cases)</button>
              ) : (
                <span className={badgeOk}>누락(Missing) 0건(cases)</span>
              )}
              {importLoaded && importProductCharCount !== undefined && importProductCharCount > 0 && productCharCount !== importProductCharCount && (
                <ImportVerifyBadge label="제품특성" importCount={importProductCharCount} currentCount={productCharCount} loaded={importLoaded} />
              )}
              {(isConfirmed || missingCount > 0) && (
                <button type="button" onClick={onEdit} className={btnEdit}>수정(Edit)</button>
              )}
            </div>
          </div>
        </th>
      </tr>

      {showHelp && <HelpPopup helpKey="function-l2" onClose={() => setShowHelp(false)} />}

      {/* 2행: 항목 그룹 (11px, bold) */}
      <tr>
        <th className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap">
          <BiHeader ko="2. 메인 공정명" en="Main Process" />
        </th>
        <th colSpan={3} className="bg-[#388e3c] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center">
          <BiHeader ko="2. 메인공정기능 및 제품특성" en="Function & Product Char." />
        </th>
      </tr>

      {/* 3행: 세부 컬럼 (11px, bold, 2px 파란색 border-bottom) */}
      <tr className="bg-[#e8f5e9]">
        <th className="bg-[#e3f2fd] border border-[#ccc] px-0.5 py-0.5 text-[10px] font-bold" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="NO+공정명" en="Process" /><span className={`font-bold ${processCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({processCount})</span>
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] p-1 text-[11px] font-bold" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="메인공정기능" en="Main Function" /><span className={`font-bold ${l2FunctionCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({l2FunctionCount})</span>
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] border-r-[2px] border-r-green-600 p-1 text-[11px] font-bold text-gray-800" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="제품특성" en="Product Char." /><span className={`font-bold ${productCharCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({productCharCount})</span>
        </th>
        <th className="bg-green-600 text-white border border-[#ccc] border-l-0 p-1 text-[11px] font-bold text-center whitespace-nowrap" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }} title="Special Characteristic">
          <BiHeader ko="특별특성" en="SC" />
        </th>
      </tr>
    </thead>
  );
}

export default FunctionL2Header;

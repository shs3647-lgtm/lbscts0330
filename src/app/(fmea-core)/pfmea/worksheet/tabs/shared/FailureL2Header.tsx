// CODEFREEZE
/**
 * @file FailureL2Header.tsx
 * @description FailureL2Tab 전용 헤더 컴포넌트
 * @updated 2026-02-20 - colgroup 비율 최적화, CODEFREEZE
 */

'use client';

import React, { useState } from 'react';
import { btnConfirm, btnEdit, badgeConfirmed, badgeMissing, badgeOk } from '@/styles/worksheet';
import { HelpPopup } from './HelpPopup';
import { ImportVerifyBadge } from './ImportVerifyBadge';
import { useLocale } from '@/lib/locale';
import { BiHeader } from './BaseWorksheetComponents';

interface FailureL2HeaderProps {
  isConfirmed: boolean;
  isUpstreamConfirmed: boolean;
  missingCount: number;
  confirmedCount: number;
  onConfirm: () => void;
  onEdit: () => void;
  isAutoMode?: boolean;
  onToggleMode?: () => void;
  isLoadingMaster?: boolean;
  importFmCount?: number;
  importLoaded?: boolean;
}

export function FailureL2Header({
  isConfirmed,
  isUpstreamConfirmed,
  missingCount,
  confirmedCount,
  onConfirm,
  onEdit,
  isAutoMode,
  onToggleMode,
  isLoadingMaster,
  importFmCount,
  importLoaded,
}: FailureL2HeaderProps) {
  const { t } = useLocale();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
      {/* 1행: 11px, bold */}
      <tr>
        <th className="bg-[#1976d2] text-white border border-[#ccc] py-1 px-[9px] text-[11px] font-bold text-center whitespace-nowrap">
          <BiHeader ko="2L 구조분석" en="Structure" />
        </th>
        <th colSpan={3} className="bg-[#388e3c] text-white border border-[#ccc] p-1 text-[11px] font-bold">
          <div className="flex items-center justify-between gap-1">
            <span className="whitespace-nowrap"><BiHeader ko="2L 기능분석" en="Function" /></span>
            <div className="flex gap-1 items-center shrink-0">
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
              {(isConfirmed || missingCount > 0) && (
                <button type="button" onClick={onEdit} className={btnEdit}>수정(Edit)</button>
              )}
            </div>
          </div>
        </th>
        <th className="bg-[#f57c00] text-white border border-[#ccc] py-1 px-[9px] text-[11px] font-bold">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold whitespace-nowrap"><BiHeader ko="2L 고장분석" en="Failure" /></span>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHelp(prev => !prev); }} className={`px-1.5 py-0 text-[10px] font-bold rounded cursor-pointer border whitespace-nowrap shadow-sm ${showHelp ? 'bg-yellow-400 text-gray-800 border-yellow-500' : 'bg-white/20 text-white border-white/40 hover:bg-white/30'}`} title="도움말 보기/닫기">도움말(Help)</button>
            </div>
            <div className="flex gap-1 items-center shrink-0">
              {!isUpstreamConfirmed ? (
                <span className="bg-yellow-500 text-white px-2 py-0 rounded text-[10px] whitespace-nowrap">미확정(Unconfirmed)</span>
              ) : isConfirmed ? (
                <span className={badgeConfirmed}>확정됨(Confirmed)({importLoaded && importFmCount ? importFmCount : confirmedCount})</span>
              ) : (
                <button type="button" onClick={onConfirm} className={btnConfirm}>미확정(Unconfirmed)</button>
              )}
              <span className={missingCount > 0 ? badgeMissing : badgeOk}>누락(Missing) {missingCount}건(cases)</span>
              {importLoaded && importFmCount !== undefined && importFmCount > 0 && confirmedCount !== importFmCount && (
                <ImportVerifyBadge label="FM" importCount={importFmCount} currentCount={confirmedCount} loaded={importLoaded} />
              )}
            </div>
          </div>
        </th>
      </tr>

      {showHelp && <HelpPopup helpKey="failure-l2" onClose={() => setShowHelp(false)} />}

      {/* 2행: 11px, bold */}
      <tr>
        <th className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap">
          <BiHeader ko="2. 메인 공정명" en="Main Process" />
        </th>
        <th colSpan={3} className="bg-[#388e3c] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center">
          <BiHeader ko="2. 메인공정기능 및 제품특성" en="Function & Product Char." />
        </th>
        <th className="bg-[#f57c00] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center">
          <div className="flex items-center justify-center gap-1">
            <span><BiHeader ko="2. 고장형태" en="Failure Mode" /></span>
            {missingCount > 0 && (
              <span className="bg-orange-500 text-white px-1.5 py-0 rounded-full text-[10px]">누락(Missing) {missingCount}건(cases)</span>
            )}
          </div>
        </th>
      </tr>

      {/* 3행: 11px, bold, 2px 파란색 border-bottom */}
      <tr>
        <th className="bg-[#e3f2fd] border border-[#ccc] px-0.5 py-0.5 text-[10px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="NO+공정명" en="Process" />
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] p-1 text-[11px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="메인공정기능" en="Main Function" />
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] border-r-[2px] border-r-orange-500 p-1 text-[11px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="제품특성" en="Product Char." />
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap" style={{ color: '#2e7d32', boxShadow: 'inset 0 -2px 0 #2196f3' }} title="Special Characteristic">
          <BiHeader ko="특별특성" en="SC" />
        </th>
        <th className="bg-[#ffe0b2] border border-[#ccc] p-1 text-[11px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="고장형태" en="Failure Mode/FM" />
        </th>
      </tr>
    </thead>
  );
}

export default FailureL2Header;

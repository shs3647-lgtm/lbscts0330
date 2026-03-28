/**
 * @file FailureL3Header.tsx
 * @description FailureL3Tab 전용 헤더 컴포넌트
 * @updated 2026-02-27 — CODEFREEZE 해제, 누락 배지 클릭 가능하게 수정
 */

'use client';

import React, { useState } from 'react';
import { btnConfirm, btnEdit, badgeConfirmed, badgeMissing, badgeOk } from '@/styles/worksheet';
import { HelpPopup } from './HelpPopup';
import { ImportVerifyBadge } from './ImportVerifyBadge';
import { BiHeader } from './BaseWorksheetComponents';

interface FailureL3HeaderProps {
  isConfirmed: boolean;
  isUpstreamConfirmed: boolean;
  missingCount: number;
  failureCauseCount: number;
  totalCauseCount: number;
  processCharCount?: number;
  specialCharCount?: number;
  onConfirm: () => void;
  onEdit: () => void;
  isAutoMode?: boolean;
  onToggleMode?: () => void;
  isLoadingMaster?: boolean;
  onMissingClick?: () => void;
  importFcCount?: number;
  importLoaded?: boolean;
}

export function FailureL3Header({
  isConfirmed,
  isUpstreamConfirmed,
  missingCount,
  failureCauseCount,
  totalCauseCount,
  processCharCount,
  specialCharCount,
  onConfirm,
  onEdit,
  isAutoMode,
  onToggleMode,
  isLoadingMaster,
  onMissingClick,
  importFcCount,
  importLoaded,
}: FailureL3HeaderProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
      {/* 1행: 11px, bold */}
      <tr>
        <th colSpan={2} className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap">
          <BiHeader ko="3L 구조분석" en="Structure" />
        </th>
        <th colSpan={2} className="bg-[#388e3c] text-white border border-[#ccc] p-1 text-[11px] font-bold">
          <div className="flex items-center justify-between gap-1">
            <span className="whitespace-nowrap"><BiHeader ko="3L 기능분석" en="Function" /></span>
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
              <span className="font-bold whitespace-nowrap"><BiHeader ko="3L 고장분석" en="Failure" /></span>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHelp(prev => !prev); }} className={`px-1.5 py-0 text-[10px] font-bold rounded cursor-pointer border whitespace-nowrap shadow-sm ${showHelp ? 'bg-yellow-400 text-gray-800 border-yellow-500' : 'bg-white/20 text-white border-white/40 hover:bg-white/30'}`} title="도움말 보기/닫기">도움말(Help)</button>
            </div>
            <div className="flex gap-1 items-center shrink-0">
              {!isUpstreamConfirmed ? (
                <span className="bg-yellow-500 text-white px-2 py-0 rounded text-[10px] whitespace-nowrap">미확정(Unconfirmed)</span>
              ) : isConfirmed ? (
                <span className={badgeConfirmed}>확정됨(Confirmed)({importLoaded && importFcCount ? importFcCount : totalCauseCount})</span>
              ) : (
                <button type="button" onClick={onConfirm} className={btnConfirm}>미확정(Unconfirmed)</button>
              )}
              <span
                className={missingCount > 0 ? badgeMissing : badgeOk}
                onClick={missingCount > 0 ? onMissingClick : undefined}
                style={missingCount > 0 ? { cursor: 'pointer' } : undefined}
                title={missingCount > 0 ? '클릭하여 누락 항목으로 이동' : undefined}
              >누락(Missing) {missingCount}건(cases)</span>
              {importLoaded && importFcCount !== undefined && importFcCount > 0 && totalCauseCount !== importFcCount && (
                <ImportVerifyBadge label="FC" importCount={importFcCount} currentCount={totalCauseCount} loaded={importLoaded} />
              )}
            </div>
          </div>
        </th>
      </tr>

      {showHelp && <HelpPopup helpKey="failure-l3" onClose={() => setShowHelp(false)} />}

      {/* 2행: 11px, bold */}
      <tr>
        <th className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap">
          <BiHeader ko="2. 메인 공정명" en="Main Process" />
        </th>
        <th className="bg-[#1976d2] text-white border border-[#ccc] p-0.5 text-[10px] font-bold text-center whitespace-nowrap">
          WE
        </th>
        <th colSpan={2} className="bg-[#388e3c] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center">
          <BiHeader ko="3. 작업요소의 기능 및 공정특성" en="Function & Process Char." />
        </th>
        <th className="bg-[#f57c00] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center">
          <div className="flex items-center justify-center gap-1">
            <span><BiHeader ko="3. 고장원인" en="Failure Cause/FC" /></span>
            {missingCount > 0 && (
              <button type="button" onClick={onMissingClick} className="bg-orange-500 text-white px-1.5 py-0 rounded-full text-[10px] cursor-pointer hover:opacity-80">누락(Missing) {missingCount}건(cases)</button>
            )}
          </div>
        </th>
      </tr>

      {/* 3행: 11px, bold, 파란색 하단 구분선 */}
      <tr>
        <th className="bg-[#e3f2fd] border border-[#ccc] px-0.5 py-0.5 text-[10px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="NO+공정명" en="Process" />
        </th>
        <th className="bg-[#e3f2fd] border border-[#ccc] p-0.5 text-[10px] font-bold text-center whitespace-nowrap" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          WE
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] border-r-[2px] border-r-orange-500 p-1 text-[11px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="공정특성" en="Process Char." />{processCharCount != null && <span className={`font-bold ${processCharCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({processCharCount})</span>}
        </th>
        <th className="bg-orange-500 text-white border border-[#ccc] border-l-0 p-1 text-[10px] font-bold text-center whitespace-nowrap" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }} title="Special Characteristic">
          <BiHeader ko="특별특성" en="SC" />{specialCharCount != null && <span className="font-bold">({specialCharCount})</span>}
        </th>
        <th className="bg-[#ffe0b2] border border-[#ccc] p-1 text-[11px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="고장원인" en="Failure Cause/FC" /><span className={`font-bold ${failureCauseCount > 0 ? 'text-orange-800' : 'text-red-500'}`}>({failureCauseCount})</span>
        </th>
      </tr>
    </thead>
  );
}

export default FailureL3Header;

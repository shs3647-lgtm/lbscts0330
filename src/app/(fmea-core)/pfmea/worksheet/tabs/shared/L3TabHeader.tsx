/**
 * @file L3TabHeader.tsx
 * @description L3 탭(FunctionL3Tab, FailureL3Tab) 공용 헤더 컴포넌트
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
import { usePathname } from 'next/navigation';
import { btnConfirm, btnEdit, badgeConfirmed, badgeMissing, badgeOk } from '@/styles/worksheet';
import { HelpPopup } from './HelpPopup';
import { ImportVerifyBadge } from './ImportVerifyBadge';
import { BiHeader } from './BaseWorksheetComponents';
import { getFmeaLabels } from '@/lib/fmea-labels';

interface L3TabHeaderProps {
  tabType: 'function' | 'failure';
  isConfirmed: boolean;
  isUpstreamConfirmed?: boolean;
  missingCount: number;
  workElementCount: number;
  primaryCount: number;
  secondaryCount: number;
  onConfirm: () => void;
  onEdit: () => void;
  stepLabel: string;
  primaryLabel: string;
  secondaryLabel?: string;
  showSecondary?: boolean;
  totalCauseCount?: number;
  isAutoMode?: boolean;
  onToggleMode?: () => void;
  isLoadingMaster?: boolean;
  onMissingClick?: () => void;
  importPrimaryCount?: number;
  importSecondaryCount?: number;
  importLoaded?: boolean;
}

export function L3TabHeader({
  tabType,
  isConfirmed,
  isUpstreamConfirmed = true,
  missingCount,
  workElementCount,
  primaryCount,
  secondaryCount,
  onConfirm,
  onEdit,
  stepLabel,
  primaryLabel,
  secondaryLabel,
  showSecondary = true,
  isAutoMode,
  onToggleMode,
  isLoadingMaster,
  onMissingClick,
  importPrimaryCount,
  importSecondaryCount,
  importLoaded,
}: L3TabHeaderProps) {
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  const lb = getFmeaLabels(isDfmea);
  const effectiveSecondaryLabel = secondaryLabel ?? lb.l3Char;
  const isFunction = tabType === 'function';
  const stepBgColor = isFunction ? '#388e3c' : '#f57c00';
  const stepBgColorLight = isFunction ? '#c8e6c9' : '#ffe0b2';
  const [showHelp, setShowHelp] = useState(false);

  return (
    <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
      {/* 1행: 단계 구분 (11px, bold) */}
      <tr>
        <th colSpan={3} className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap">
          <BiHeader ko="3L 구조분석" en="Structure" />
        </th>
        <th colSpan={showSecondary ? 3 : 2} className="text-white border border-[#ccc] p-1 text-[11px] font-bold" style={{ background: stepBgColor }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap">{stepLabel}</span>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHelp(prev => !prev); }} className={`px-2 py-0 text-[10px] font-bold rounded cursor-pointer border whitespace-nowrap ${showHelp ? 'bg-yellow-400 text-gray-800 border-yellow-500' : 'bg-white/20 text-white border-white/40 hover:bg-white/30'}`} title="도움말 보기/닫기">도움말(Help)</button>
            </div>
            <div className="flex gap-1 items-center shrink-0 flex-wrap">
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
              {!isUpstreamConfirmed && tabType === 'failure' ? (
                <span className="bg-yellow-500 text-white px-2 py-0 rounded text-[10px] whitespace-nowrap">미확정(Unconfirmed)</span>
              ) : isConfirmed ? (
                <span className={badgeConfirmed}>확정됨(Confirmed)({
                  tabType === 'function' && importLoaded && importSecondaryCount
                    ? importSecondaryCount
                    : tabType === 'failure' && importLoaded && importPrimaryCount
                      ? importPrimaryCount
                      : primaryCount
                })</span>
              ) : (
                <button type="button" onClick={onConfirm} className={btnConfirm}>미확정(Unconfirmed)</button>
              )}
              {missingCount > 0 && (
                <button type="button" onClick={onMissingClick} className={`${badgeMissing} cursor-pointer hover:opacity-80`}>누락(Missing) {missingCount}건(cases)</button>
              )}
              {importLoaded && tabType === 'failure' && importPrimaryCount !== undefined && importPrimaryCount > 0 && primaryCount !== importPrimaryCount && (
                <ImportVerifyBadge
                  label="FC"
                  importCount={importPrimaryCount}
                  currentCount={primaryCount}
                  loaded={importLoaded}
                />
              )}
              {importLoaded && tabType === 'function' && importSecondaryCount !== undefined && importSecondaryCount > 0 && secondaryCount !== importSecondaryCount && (
                <ImportVerifyBadge
                  label={lb.l3Char}
                  importCount={importSecondaryCount}
                  currentCount={secondaryCount}
                  loaded={importLoaded}
                />
              )}
              {(isConfirmed || missingCount > 0) && (
                <button type="button" onClick={onEdit} className={btnEdit}>수정(Edit)</button>
              )}
            </div>
          </div>
        </th>
      </tr>

      {showHelp && <HelpPopup helpKey={isFunction ? 'function-l3' : 'failure-l3'} onClose={() => setShowHelp(false)} />}

      {/* 2행: 항목 그룹 (11px, bold) */}
      <tr>
        <th colSpan={3} className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center">
          <BiHeader ko={`3. ${lb.l3Short} (${lb.l3Attr})`} en="Work Element" />
        </th>
        <th colSpan={showSecondary ? 3 : 2} className="text-white border border-[#ccc] p-1 text-[11px] font-bold text-center" style={{ background: stepBgColor }}>
          {isFunction ? <BiHeader ko={`3. ${lb.l3Func}/${lb.l3Char}/특별특성`} en="SC" /> : <BiHeader ko={`3. ${lb.l3Char}/고장원인/발생도`} en="O" />}
          {missingCount > 0 && (
            <button type="button" onClick={onMissingClick} className="ml-1 bg-orange-500 text-white px-1.5 py-0 rounded-full text-[10px] cursor-pointer hover:opacity-80">
              누락(Missing) {missingCount}건(cases)
            </button>
          )}
        </th>
      </tr>

      {/* 3행: 세부 컬럼 (11px, bold, 2px 파란색 border-bottom) */}
      <tr style={{ background: stepBgColorLight }}>
        <th className="bg-[#e3f2fd] border border-[#ccc] px-0.5 py-0.5 text-[10px] font-bold" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko={lb.l2.replace(/ /g, '')} en="Main Process" />
        </th>
        <th className="bg-[#e3f2fd] border border-[#ccc] p-1 text-[11px] font-bold" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          {lb.l3Attr}
        </th>
        <th className="bg-[#e3f2fd] border border-[#ccc] p-1 text-[11px] font-bold" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko={lb.l3Short} en="Work Element" /><span className={`font-bold ${workElementCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({workElementCount})</span>
        </th>
        <th className="border border-[#ccc] p-1 text-[11px] font-bold" style={{ background: stepBgColorLight, boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          {primaryLabel}<span className={`font-bold ${primaryCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({primaryCount})</span>
        </th>
        {showSecondary && (
          <>
            <th className="border border-[#ccc] border-r-[2px] border-r-green-600 p-1 text-[11px] font-bold" style={{ background: stepBgColorLight, boxShadow: 'inset 0 -2px 0 #2196f3' }}>
              {secondaryLabel}<span className={`font-bold ${secondaryCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({secondaryCount})</span>
              {importLoaded && importSecondaryCount !== undefined && importSecondaryCount > 0 && (
                <span className="ml-1"><ImportVerifyBadge label={secondaryLabel || lb.l3Char} importCount={importSecondaryCount} currentCount={secondaryCount} loaded={importLoaded} /></span>
              )}
            </th>
            <th className="bg-green-600 text-white border border-[#ccc] border-l-0 p-1 text-[11px] font-bold text-center whitespace-nowrap" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }} title="Special Characteristic">
              <BiHeader ko="특별특성" en="SC" />
            </th>
          </>
        )}
        {!showSecondary && (
          <th className="bg-[#ffcc80] border border-[#ccc] p-1 text-[11px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
            <BiHeader ko="발생도" en="Occurrence/O" />
          </th>
        )}
      </tr>
    </thead>
  );
}

export default L3TabHeader;

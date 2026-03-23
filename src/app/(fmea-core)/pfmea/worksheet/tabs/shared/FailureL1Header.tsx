/**
 * @file FailureL1Header.tsx
 * @description FailureL1Tab 전용 헤더 컴포넌트
 * @updated 2026-02-16 - 헤더 표준화 (11px, bold, p-1, 배지 10px, 수평 배치)
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
import { S, F, X, btnConfirm, btnEdit, badgeConfirmed, badgeMissing, badgeOk } from '@/styles/worksheet';
import { HelpPopup } from './HelpPopup';
import { useLocale } from '@/lib/locale';
import { BiHeader } from './BaseWorksheetComponents';

interface FailureL1HeaderProps {
  isConfirmed: boolean;
  missingCount: number;
  effectCount: number;
  confirmedCount: number;
  onConfirm: () => void;
  onEdit: () => void;
  isAutoMode?: boolean;
  onToggleMode?: () => void;
  isLoadingMaster?: boolean;
  /** S추천 버튼 콜백 */
  onAutoRecommendS?: () => void;
  /** 심각도 미평가 FE 건수 */
  missingSeverityCount?: number;
}

export function FailureL1Header({
  isConfirmed,
  missingCount,
  effectCount,
  confirmedCount,
  onConfirm,
  onEdit,
  isAutoMode,
  onToggleMode,
  isLoadingMaster,
  onAutoRecommendS,
  missingSeverityCount,
}: FailureL1HeaderProps) {
  const { t } = useLocale();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
      {/* 1행: 11px, bold */}
      <tr>
        <th className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap">
          <BiHeader ko="1L 구조분석" en="Structure" />
        </th>
        <th colSpan={3} className="bg-[#388e3c] text-white border border-[#ccc] p-1 text-[11px] font-bold">
          <div className="flex items-center justify-between gap-1">
            <span className="whitespace-nowrap"><BiHeader ko="1L 기능분석" en="Function" /></span>
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
        <th colSpan={2} className="bg-[#f57c00] text-white border border-[#ccc] p-1 text-[11px] font-bold">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap font-bold"><BiHeader ko="1L 고장분석" en="Failure Analysis" /></span>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHelp(prev => !prev); }} className={`px-1.5 py-0 text-[10px] font-bold rounded cursor-pointer border whitespace-nowrap shadow-sm ${showHelp ? 'bg-yellow-400 text-gray-800 border-yellow-500' : 'bg-white/20 text-white border-white/40 hover:bg-white/30'}`} title="도움말 보기/닫기">도움말(Help)</button>
            </div>
            <div className="flex gap-1 items-center shrink-0">
              {isConfirmed ? (
                <span className={badgeConfirmed}>확정됨(Confirmed)({confirmedCount})</span>
              ) : (
                <button type="button" onClick={onConfirm} className={btnConfirm}>미확정(Unconfirmed)</button>
              )}
              {missingCount > 0 && (
                <span className={badgeMissing}>누락(Missing) {missingCount}건(cases)</span>
              )}
            </div>
          </div>
        </th>
      </tr>

      {showHelp && <HelpPopup helpKey="failure-l1" onClose={() => setShowHelp(false)} />}

      {/* 2행: 11px, bold */}
      <tr>
        <th className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap">
          <BiHeader ko="1. 완제품 공정명" en="Product Process" />
        </th>
        <th colSpan={3} className="bg-[#388e3c] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap">
          <BiHeader ko="1. 완제품 공정기능/요구사항" en="Function/Requirements" />
        </th>
        <th colSpan={2} className="bg-[#f57c00] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap">
          <div className="flex items-center justify-center gap-1">
            <span><BiHeader ko="1. 고장영향/심각도" en="FE/Severity" /></span>
            {onAutoRecommendS && (
              <button type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAutoRecommendS(); }}
                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer border whitespace-nowrap shadow-sm ${(missingSeverityCount ?? 0) > 0 ? 'bg-[#1565c0] text-white border-[#42a5f5] hover:bg-[#0d47a1]' : 'bg-white/20 text-white/80 border-white/30 hover:bg-white/30'}`}
                title={`심각도(S) 자동추천 — 미평가 ${missingSeverityCount ?? 0}건`}
              >
                S추천({missingSeverityCount ?? 0})
              </button>
            )}
          </div>
        </th>
      </tr>

      {/* 3행: 11px, bold, 2px 파란색 border-bottom */}
      <tr>
        <th className="bg-[#e3f2fd] border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="완제품 공정명" en="Product Process" />
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="구분" en="Type" />
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="완제품기능" en="Product Function" />
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="요구사항" en="Requirements" />
        </th>
        <th className="bg-[#ffe0b2] border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="고장영향" en="Failure Effect/FE" />
          {effectCount > 0 && (
            <span className="ml-1 bg-white text-orange-800 px-1 py-0 rounded text-[10px] font-bold">
              {effectCount}
            </span>
          )}
        </th>
        <th className="bg-[#ffe0b2] border border-[#ccc] p-1 text-[11px] font-bold text-center whitespace-nowrap" style={{ width: '30px', minWidth: '30px', maxWidth: '30px', boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          S
        </th>
      </tr>
    </thead>
  );
}

export default FailureL1Header;

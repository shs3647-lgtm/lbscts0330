/**
 * @file ImportStepBar.tsx
 * @description 4탭 공용 SA→FC→FA→FMEA작성 검증 바
 * - useImportSteps 훅 사용
 * - ParseStatisticsPanel 통계 표시
 * - "FMEA 작성 →" FA 완료 후에만 활성화
 * @created 2026-03-10
 */

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { useImportSteps } from '../hooks/useImportSteps';
import { buildCrossTab } from '../utils/template-delete-logic';

const BTN_DISABLED = 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';
const BTN_CONFIRMED = 'bg-green-50 text-green-700 border-green-300 cursor-default';

interface ImportStepBarProps {
  flatData: ImportedFlatData[];
  fmeaId: string;
  failureChains?: MasterFailureChain[];
  fmeaInfo?: {
    subject?: string;
    companyName?: string;
    customerName?: string;
    modelYear?: string;
    fmeaType?: string;
    engineeringLocation?: string;
    designResponsibility?: string;
    fmeaResponsibleName?: string;
    partName?: string;
    partNo?: string;
  };
  l1Name?: string;
}

export default function ImportStepBar({
  flatData, fmeaId, failureChains: propChains, fmeaInfo, l1Name,
}: ImportStepBarProps) {
  const router = useRouter();
  const [showVerification, setShowVerification] = useState(false);

  const crossTab = useMemo(() => buildCrossTab(flatData), [flatData]);
  const failureChains = useMemo(() => propChains ?? [], [propChains]);

  const onWorksheetSaved = useCallback(() => {
    router.push(`/pfmea/worksheet?id=${encodeURIComponent(fmeaId)}`);
  }, [router, fmeaId]);

  const {
    stepState, setActiveStep,
    canSA, canFC, canFA,
    confirmSA, confirmFC, confirmFA,
    resetToSA, resetToFC,
    fcComparison, isAnalysisImporting, isAnalysisComplete,
  } = useImportSteps({
    flatData,
    failureChains,
    crossTab,
    isSaved: true,
    missingTotal: 0,
    fmeaId,
    l1Name: l1Name || '',
    fmeaInfo,
    onWorksheetSaved,
  });

  // 통계 자동 생성 (parseStatistics 없이 flatData에서 역산)
  const statistics = useMemo(() => {
    if (flatData.length === 0) return undefined;
    const itemStats = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4']
      .map(code => {
        const items = flatData.filter(d => d.itemCode === code);
        return {
          itemCode: code,
          label: code,
          totalCount: items.length,
          rawCount: items.length,
          uniqueCount: items.length,
          duplicateCount: 0,
          dupSkipped: 0,
        };
      });
    return {
      source: 'import' as const,
      totalRows: flatData.length,
      itemStats,
      chainCount: failureChains.length,
      processStats: [],
    };
  }, [flatData, failureChains]);

  if (flatData.length === 0) return null;

  const handleSAConfirm = () => confirmSA();
  const handleSAReset = () => resetToSA();
  const handleFCConfirm = () => confirmFC();
  const handleFCReset = () => resetToFC();

  return (
    <div className="bg-white border border-blue-100 rounded-lg p-2 space-y-2">
      {/* 3단계 진행 표시 */}
      <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
        <span className={`px-1.5 py-0.5 rounded ${stepState.activeStep === 'SA' ? 'bg-blue-100 text-blue-700 font-bold' : stepState.saConfirmed ? 'bg-green-50 text-green-600' : ''}`}>
          SA 시스템분석 ({flatData.length})
        </span>
        <span>→</span>
        <span className={`px-1.5 py-0.5 rounded ${stepState.activeStep === 'FC' ? 'bg-blue-100 text-blue-700 font-bold' : stepState.fcConfirmed ? 'bg-green-50 text-green-600' : ''}`}>
          FC 고장사슬 ({failureChains.length})
        </span>
        <span>→</span>
        <span className={`px-1.5 py-0.5 rounded ${stepState.activeStep === 'FA' ? 'bg-blue-100 text-blue-700 font-bold' : stepState.faConfirmed ? 'bg-green-50 text-green-600' : ''}`}>
          FA 통합분석 ({failureChains.length})
        </span>
      </div>

      {/* 버튼 바 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* SA 확정 */}
        {stepState.saConfirmed ? (
          <button onClick={handleSAReset} disabled={isAnalysisComplete}
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
              isAnalysisComplete ? BTN_DISABLED : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100 cursor-pointer'
            }`}>SA 확정됨</button>
        ) : (
          <button onClick={handleSAConfirm} disabled={!canSA}
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
              canSA ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 cursor-pointer' : BTN_DISABLED
            }`}>SA 확정</button>
        )}

        {/* FC검증 토글 */}
        {failureChains.length > 0 && (
          <button onClick={() => setShowVerification(v => !v)}
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border cursor-pointer ${
              showVerification ? 'bg-teal-600 text-white border-teal-600' : 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100'
            }`}>FC검증</button>
        )}

        {/* FC 확정 */}
        {stepState.fcConfirmed ? (
          <button onClick={handleFCReset} disabled={isAnalysisComplete}
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
              isAnalysisComplete ? BTN_DISABLED : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100 cursor-pointer'
            }`}>FC 확정됨</button>
        ) : (
          <button onClick={handleFCConfirm} disabled={!canFC}
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
              canFC ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 cursor-pointer' : BTN_DISABLED
            }`}>FC 확정</button>
        )}

        {/* FA 확정 */}
        <button onClick={() => confirmFA()}
          disabled={!canFA || isAnalysisImporting || isAnalysisComplete}
          className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
            isAnalysisComplete ? BTN_CONFIRMED
            : canFA && !isAnalysisImporting ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 cursor-pointer'
            : BTN_DISABLED
          }`}>
          {isAnalysisImporting ? '생성중...' : isAnalysisComplete ? 'FA 완료' : 'FA 확정'}
        </button>

        {/* FMEA 작성 → (FA 완료 후에만 활성화) */}
        <button
          onClick={() => router.push(`/pfmea/worksheet?id=${encodeURIComponent(fmeaId)}`)}
          disabled={!isAnalysisComplete}
          className={`px-3 py-0.5 rounded text-[10px] font-bold border ${
            isAnalysisComplete
              ? 'border-orange-400 text-white bg-orange-500 hover:bg-orange-600 cursor-pointer'
              : BTN_DISABLED
          }`}>
          FMEA 작성 →
        </button>

        {isAnalysisComplete && (
          <span className="text-[10px] text-green-600 font-bold">✓ 검증 완료</span>
        )}
      </div>

    </div>
  );
}

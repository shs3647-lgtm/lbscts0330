/**
 * @file ImportStepBar.tsx
 * @description 4탭 공용 SA→FC→FA→FMEA작성 검증 바
 * - useImportSteps 훅 사용
 * - ParseStatisticsPanel 통계 표시
 * - "FMEA 작성 →" FA 완료 후에만 활성화
 * @created 2026-03-10
 */

'use client';

import React, { useMemo, useCallback } from 'react';
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

  const crossTab = useMemo(() => buildCrossTab(flatData), [flatData]);
  const failureChains = useMemo(() => propChains ?? [], [propChains]);

  const onWorksheetSaved = useCallback(() => {
    router.push(`/pfmea/worksheet?id=${encodeURIComponent(fmeaId)}`);
  }, [router, fmeaId]);

  const {
    canSA, canFC,
    confirmSA, confirmFC, confirmFA,
    isAnalysisImporting, isAnalysisComplete,
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

  if (flatData.length === 0) return null;

  return (
    <div className="bg-white border border-blue-100 rounded-lg p-2 space-y-2">
      {/* 간소화된 Import 바 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-gray-500">
          데이터: <b className="text-blue-700">{flatData.length}</b>건
          {failureChains.length > 0 && <> | 고장사슬: <b className="text-orange-600">{failureChains.length}</b>건</>}
        </span>

        {/* 원클릭 자동확정 */}
        <button
          onClick={async () => {
            if (!canSA) return;
            confirmSA();
            if (canFC) confirmFC();
            confirmFA();
          }}
          disabled={!canSA || isAnalysisImporting || isAnalysisComplete}
          className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
            isAnalysisComplete ? BTN_CONFIRMED
            : canSA && !isAnalysisImporting ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 cursor-pointer'
            : BTN_DISABLED
          }`}>
          {isAnalysisImporting ? '처리중...' : isAnalysisComplete ? '✓ 확정완료' : 'SA+FC+FA 자동확정'}
        </button>

        {/* 워크시트 이동 */}
        <button
          onClick={() => router.push(`/pfmea/worksheet?id=${encodeURIComponent(fmeaId)}`)}
          className="px-3 py-0.5 rounded text-[10px] font-bold border border-orange-400 text-white bg-orange-500 hover:bg-orange-600 cursor-pointer">
          워크시트 →
        </button>

        {isAnalysisComplete && (
          <span className="text-[10px] text-green-600 font-bold">✓ 검증 완료</span>
        )}

        <span className="ml-auto text-[9px] text-gray-400">
          상세 검증/편집: 워크시트 → Verify → STEP 0
        </span>
      </div>
    </div>
  );
}

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
  const crossTab = useMemo(() => buildCrossTab(flatData), [flatData]);
  const failureChains = useMemo(() => propChains ?? [], [propChains]);

  const onWorksheetSaved = useCallback(() => {
    // ★v5.2: 자동확정 후 자동이동 제거 — 통계 확인 후 사용자가 직접 "워크시트 →" 버튼으로 이동
    // (이전: 여기서 window.location.href 이동 → 파이프라인 검증/통계 확인 불가)
  }, [fmeaId]);

  const {
    canSA,
    quickCreateWorksheet,
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

  const [pipelineStatus, setPipelineStatus] = React.useState<string>('');
  const [isPipelineRunning, setIsPipelineRunning] = React.useState(false);

  const handleAutoConfirmAndVerify = React.useCallback(async () => {
    setPipelineStatus('SA+FC+FA 확정 중...');
    setIsPipelineRunning(true);

    try {
      await quickCreateWorksheet();

      // ★★★ 2026-03-21 FIX: POST(자동수정) → GET(읽기전용)
      // buildAtomicFromFlat이 FK 완전 확정한 Atomic DB를 POST 자동수정이 덮어쓰는 문제 방지
      setPipelineStatus('파이프라인 검증 중...');
      const pipeRes = await fetch(`/api/fmea/pipeline-verify?fmeaId=${encodeURIComponent(fmeaId)}`, {
        method: 'GET',
      });

      if (pipeRes.ok) {
        const data = await pipeRes.json();
        const statuses = (data.steps || []).map((s: { step: number; name: string; status: string }) =>
          `S${s.step}:${s.status}`).join(' ');
        const fixedCount = (data.steps || []).reduce((sum: number, s: { fixed?: string[] }) =>
          sum + (s.fixed?.length || 0), 0);

        if (data.allGreen) {
          setPipelineStatus(`ALL GREEN (Loop ${data.loopCount}) ${statuses}${fixedCount > 0 ? ` | 자동수정 ${fixedCount}건` : ''}`);
        } else {
          const issues = (data.steps || [])
            .filter((s: { status: string }) => s.status !== 'ok')
            .map((s: { name: string; issues?: string[] }) => `${s.name}: ${(s.issues || []).join(', ')}`)
            .join(' | ');
          setPipelineStatus(`수정필요 (Loop ${data.loopCount}) ${issues}`);
        }
      } else {
        setPipelineStatus('파이프라인 검증 실패');
      }
    } catch (err) {
      setPipelineStatus('오류: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsPipelineRunning(false);
    }
  }, [quickCreateWorksheet, fmeaId]);

  if (flatData.length === 0) return null;

  const isRunning = isAnalysisImporting || isPipelineRunning;

  return (
    <div className="bg-white border border-blue-100 rounded-lg p-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-gray-500">
          데이터: <b className="text-blue-700">{flatData.length}</b>건
          {failureChains.length > 0 && <> | 고장사슬: <b className="text-orange-600">{failureChains.length}</b>건</>}
        </span>

        {/* 원클릭 자동확정 + 파이프라인 자동수정 */}
        <button
          onClick={handleAutoConfirmAndVerify}
          disabled={!canSA || isRunning || isAnalysisComplete}
          className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
            isAnalysisComplete ? BTN_CONFIRMED
            : canSA && !isRunning ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 cursor-pointer'
            : BTN_DISABLED
          }`}>
          {isRunning ? '처리중...' : isAnalysisComplete ? '✓ 확정완료' : 'SA+FC+FA 자동확정'}
        </button>

        {/* 워크시트 이동 */}
        <button
          onClick={() => { window.location.href = `/pfmea/worksheet?id=${encodeURIComponent(fmeaId)}&fresh=1`; }}
          className="px-3 py-0.5 rounded text-[10px] font-bold border border-orange-400 text-white bg-orange-500 hover:bg-orange-600 cursor-pointer">
          워크시트 →
        </button>

        {isAnalysisComplete && !pipelineStatus && (
          <span className="text-[10px] text-green-600 font-bold">✓ 확정 완료</span>
        )}

        {pipelineStatus && (
          <span className={`text-[10px] font-bold ${
            pipelineStatus.includes('ALL GREEN') ? 'text-green-600'
            : pipelineStatus.includes('수정필요') ? 'text-orange-600'
            : pipelineStatus.includes('오류') ? 'text-red-600'
            : 'text-blue-600'
          }`}>
            {pipelineStatus}
          </span>
        )}

        <span className="ml-auto text-[9px] text-gray-400">
          상세 검증/편집: 워크시트 → Verify → STEP 0
        </span>
      </div>
    </div>
  );
}

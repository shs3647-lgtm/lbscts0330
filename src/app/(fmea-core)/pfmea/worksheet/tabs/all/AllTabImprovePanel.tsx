/**
 * @file AllTabImprovePanel.tsx
 * @description H→L 개선방향 패널 컴포넌트
 * AllTabEmpty.tsx에서 분리
 * @created 2026-02-10
 */

'use client';

import React from 'react';
import { getTargetScore, getImprovementRecommendation, getImprovementPriority } from './hooks/improvementMap';

interface APItem {
  id: string;
  processName: string;
  failureMode: string;
  failureCause: string;
  severity: number;
  occurrence: number;
  detection: number;
  ap: 'H' | 'M' | 'L';
  fmId: string;
  fcId: string;
  globalRowIdx: number;
}

interface AllTabImprovePanelProps {
  hItems: APItem[];
  improvedItems: Set<string>;
  onClose: () => void;
  onImprove: (fmId: string, fcId: string, type: 'O' | 'D', current: number, globalRowIdx: number) => void;
}

export function AllTabImprovePanel({ hItems, improvedItems, onClose, onImprove }: AllTabImprovePanelProps) {
  if (hItems.length === 0) return null;

  return (
    <div className="sticky top-[44px] z-30 bg-orange-50 border-b-2 border-orange-300 p-3 max-h-[250px] overflow-auto">
      <div className="text-[12px] font-bold text-orange-700 mb-2 flex justify-between items-center">
        <span>H/M→L 개선 제안 ({hItems.length}건)</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-lg">×</button>
      </div>
      <div className="grid gap-2">
        {hItems.map((item, idx) => {
          const oImproved = improvedItems.has(`${item.fmId}-${item.fcId}-O`);
          const dImproved = improvedItems.has(`${item.fmId}-${item.fcId}-D`);
          const targetO = getTargetScore(item.occurrence, 'O');
          const targetD = getTargetScore(item.detection, 'D');

          // AIAG-VDA 기반 개선 우선순위 판단
          const priority = getImprovementPriority(item.severity, item.occurrence, item.detection, item.ap as 'H' | 'M');

          // 추천 내용 툴팁 생성
          const oRec = getImprovementRecommendation(item.occurrence, 'O');
          const dRec = getImprovementRecommendation(item.detection, 'D');
          const oTooltip = oRec
            ? `[AIAG-VDA 표P2] O:${item.occurrence}→${targetO}\n${oRec.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n근거: ${oRec.rationale}`
            : `O:${item.occurrence}→${targetO}`;
          const dTooltip = dRec
            ? `[AIAG-VDA 표P3] D:${item.detection}→${targetD}\n${dRec.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n근거: ${dRec.rationale}`
            : `D:${item.detection}→${targetD}`;

          return (
            <div key={item.id} className="bg-white rounded p-2 border border-orange-200 text-[11px]">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-gray-700">
                  #{idx + 1} {item.processName} - {item.failureMode}
                </span>
                <span className="text-gray-500">
                  S:{item.severity} O:{item.occurrence} D:{item.detection}
                  {priority.priority === 'both' ? ' [O+D]' : priority.priority === 'prevention' ? ' [O우선]' : ' [D우선]'}
                </span>
              </div>
              <div className="text-gray-600 mb-2 text-[10px]">
                원인: {item.failureCause}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onImprove(item.fmId, item.fcId, 'O', item.occurrence, item.globalRowIdx)}
                  disabled={oImproved}
                  title={oTooltip}
                  className={`flex-1 py-1 px-2 rounded text-[10px] font-semibold transition-all ${oImproved
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : priority.prevention
                      ? 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer'
                      : 'bg-orange-300 text-white hover:bg-orange-400 cursor-pointer'
                    }`}
                >
                  {oImproved ? '✓ 예방개선 완료' : `예방관리 O:${item.occurrence}→${targetO}`}
                </button>
                <button
                  onClick={() => onImprove(item.fmId, item.fcId, 'D', item.detection, item.globalRowIdx)}
                  disabled={dImproved}
                  title={dTooltip}
                  className={`flex-1 py-1 px-2 rounded text-[10px] font-semibold transition-all ${dImproved
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : priority.detection
                      ? 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer'
                      : 'bg-orange-300 text-white hover:bg-orange-400 cursor-pointer'
                    }`}
                >
                  {dImproved ? '✓ 검출개선 완료' : `검출관리 D:${item.detection}→${targetD}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { getTargetScore } from './hooks/improvementMap';
export default AllTabImprovePanel;

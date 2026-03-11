/**
 * OverviewPanel - 전체보기 패널 (40열 미니맵)
 */

'use client';

import React from 'react';
import { L2Process } from './types';

interface OverviewPanelProps {
  l2List: L2Process[];
  progress: {
    structure: number;
    function: number;
    failure: number;
    linkage: number;
    risk: number;
    optimize: number;
  };
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  l2List,
  progress,
}) => {
  // 전체 진행률 계산
  const totalProgress = Math.round(
    (progress.structure + progress.function + progress.failure + 
     progress.linkage + progress.risk + progress.optimize) / 6
  );

  // 40열 미니맵 생성 (단계별 색상)
  const columns = [
    // 구조분석 (1-4)
    ...Array(4).fill({ step: 'structure', color: '#2196f3' }),
    // 기능분석 (5-12)
    ...Array(8).fill({ step: 'function', color: '#4caf50' }),
    // 고장분석 (13-24)
    ...Array(12).fill({ step: 'failure', color: '#ffeb3b' }),
    // 고장연결 (25-28)
    ...Array(4).fill({ step: 'linkage', color: '#ff9800' }),
    // 리스크분석 (29-36)
    ...Array(8).fill({ step: 'risk', color: '#f44336' }),
    // 최적화 (37-40)
    ...Array(4).fill({ step: 'optimize', color: '#9c27b0' }),
  ];

  const stepLabels = [
    { name: '구조', color: '#2196f3', progress: progress.structure },
    { name: '기능', color: '#4caf50', progress: progress.function },
    { name: '고장', color: '#ffeb3b', progress: progress.failure },
    { name: '연결', color: '#ff9800', progress: progress.linkage },
    { name: '리스크', color: '#f44336', progress: progress.risk },
    { name: '최적화', color: '#9c27b0', progress: progress.optimize },
  ];

  // 데이터 행 수 (최소 5행)
  const rowCount = Math.max(5, l2List.reduce((acc, p) => acc + p.l3.length, 0));

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">📊 전체 워크시트</span>
        </div>
        <span className="text-xs font-bold text-[#2b78c5]">진행률: {totalProgress}%</span>
      </div>

      {/* 진행률 바 */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#2196f3] via-[#4caf50] to-[#f44336] transition-all"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* 40열 미니맵 */}
      <div className="flex-1 overflow-auto px-3 py-2">
        <div className="text-xs text-gray-500 mb-2">40열 미리보기</div>
        
        {/* 컬럼 헤더 */}
        <div className="flex gap-[1px] mb-1">
          {columns.map((col, idx) => (
            <div
              key={idx}
              className="w-3 h-3 rounded-sm text-[6px] flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: col.color }}
              title={`열 ${idx + 1}`}
            >
              {idx + 1 <= 9 ? '' : ''}
            </div>
          ))}
        </div>

        {/* 데이터 행 */}
        {Array.from({ length: rowCount }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-[1px] mb-[1px]">
            {columns.map((col, colIdx) => {
              // 해당 단계의 진행률에 따라 채움 여부 결정
              const stepProgress = progress[col.step as keyof typeof progress] || 0;
              const isFilled = Math.random() * 100 < stepProgress;
              
              return (
                <div
                  key={colIdx}
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: isFilled ? col.color : '#e5e7eb',
                    opacity: isFilled ? 1 : 0.3,
                  }}
                />
              );
            })}
          </div>
        ))}

        {/* 범례 */}
        <div className="mt-4 space-y-1">
          {stepLabels.map((step) => (
            <div key={step.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: step.color }}
              />
              <span className="text-xs text-gray-600 flex-1">{step.name}</span>
              <span className="text-xs font-bold" style={{ color: step.color }}>
                {step.progress}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 통계 */}
      <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500">
          <div>총 공정: {l2List.length}개</div>
          <div>총 작업요소: {l2List.reduce((acc, p) => acc + p.l3.length, 0)}개</div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPanel;
















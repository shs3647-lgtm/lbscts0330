/**
 * @file SODCompareChart.tsx
 * @description S/O/D 개선 전후 고정형 버터플라이 차트
 * 참조: rpn_id_rect_chart.html 스타일
 */

'use client';

import React from 'react';

interface SODData {
  before: { s: number; o: number; d: number };
  after: { s: number; o: number; d: number };
}

interface SODCompareChartProps {
  data: SODData;
}

export function SODCompareChart({ data }: SODCompareChartProps) {
  const maxValue = 10; // S/O/D는 1-10 스케일
  
  const items = [
    { id: 'S', label: 'Severity', labelKr: '심각도', before: data.before.s, after: data.after.s },
    { id: 'O', label: 'Occurrence', labelKr: '발생도', before: data.before.o, after: data.after.o },
    { id: 'D', label: 'Detection', labelKr: '검출도', before: data.before.d, after: data.after.d },
  ];

  return (
    <div className="h-full bg-white rounded-lg p-4">
      {/* 헤더 */}
      <div className="flex justify-between items-end mb-4 pb-3 border-b border-slate-200">
        <div>
          <div className="text-base font-bold text-slate-800">S/O/D 개선 전후 비교</div>
          <div className="text-xs text-slate-500 mt-0.5">좌측: 개선 전 · 중앙: 항목 · 우측: 개선 후</div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-[#1976d2]" />
            <span className="font-semibold text-slate-600">개선 전</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-[#43a047]" />
            <span className="font-semibold text-slate-600">개선 후</span>
          </div>
        </div>
      </div>

      {/* 차트 행들 */}
      <div className="space-y-0">
        {items.map((item, idx) => {
          const beforePct = (item.before / maxValue) * 100;
          const afterPct = (item.after / maxValue) * 100;

          return (
            <div 
              key={item.id} 
              className={`grid items-center py-2 ${idx > 0 ? 'border-t border-dashed border-slate-200' : ''}`}
              style={{ gridTemplateColumns: '1.2fr 0.8fr 1.2fr', gap: '12px' }}
            >
              {/* 왼쪽: 개선 전 (바가 오른쪽에서 왼쪽으로) */}
              <div className="flex items-center gap-2 justify-end">
                <div className="flex-1 h-[22px] bg-[#e0e0e0] rounded-sm overflow-hidden relative">
                  <div 
                    className="absolute top-0 bottom-0 right-0 bg-[#1976d2]"
                    style={{ width: `${beforePct}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 min-w-[32px] text-center">
                  {item.before}
                </span>
              </div>

              {/* 중앙: 라벨 */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-base font-bold text-slate-800">{item.label}</div>
                <div className="text-[10px] text-slate-500">{item.labelKr}</div>
              </div>

              {/* 오른쪽: 개선 후 (바가 왼쪽에서 오른쪽으로) */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700 min-w-[32px] text-center">
                  {item.after}
                </span>
                <div className="flex-1 h-[22px] bg-[#e0e0e0] rounded-sm overflow-hidden relative">
                  <div 
                    className="absolute top-0 bottom-0 left-0 bg-[#43a047]"
                    style={{ width: `${afterPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 노트 */}
      <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed">
        · 값 범위: 1 ~ 10 (10이 최고 위험도)<br />
        · 개선 후 값이 낮을수록 위험도 감소
      </div>
    </div>
  );
}


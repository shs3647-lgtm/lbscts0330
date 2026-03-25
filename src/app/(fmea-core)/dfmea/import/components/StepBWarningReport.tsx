/**
 * @file StepBWarningReport.tsx
 * @description STEP B 전처리 경고 리포트 컴포넌트
 * 요약 바 + 레벨별 접이식 섹션 + 검증 결과
 * @created 2026-03-05
 */

'use client';

import { useState, useMemo } from 'react';
import type { StepBWarning } from '../stepb-parser/types';

interface StepBWarningReportProps {
  warnings: StepBWarning[];
}

const LEVEL_CONFIG = {
  ERROR: { label: 'ERROR', bg: 'bg-red-100', text: 'text-red-700', badge: 'bg-red-500' },
  WARN:  { label: 'WARN',  bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-500' },
  INFO:  { label: 'INFO',  bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-400' },
} as const;

/** 같은 code끼리 그룹핑 */
function groupByCode(items: StepBWarning[]): Map<string, StepBWarning[]> {
  const map = new Map<string, StepBWarning[]>();
  for (const item of items) {
    const list = map.get(item.code) || [];
    list.push(item);
    map.set(item.code, list);
  }
  return map;
}

export default function StepBWarningReport({ warnings }: StepBWarningReportProps) {
  const [expandedLevel, setExpandedLevel] = useState<string | null>('ERROR');

  const counts = useMemo(() => {
    const c = { ERROR: 0, WARN: 0, INFO: 0 };
    for (const w of warnings) c[w.level]++;
    return c;
  }, [warnings]);

  const grouped = useMemo(() => {
    const g: Record<string, StepBWarning[]> = { ERROR: [], WARN: [], INFO: [] };
    for (const w of warnings) g[w.level].push(w);
    return g;
  }, [warnings]);

  if (warnings.length === 0) {
    return (
      <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-[11px] text-green-700">
        경고 없음 — 변환이 정상 완료되었습니다.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* 요약 바 */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-bold text-gray-600">변환 리포트</span>
        {(['ERROR', 'WARN', 'INFO'] as const).map(level => (
          counts[level] > 0 && (
            <span
              key={level}
              className={`${LEVEL_CONFIG[level].badge} text-white px-1.5 py-0.5 rounded text-[10px] font-bold`}
            >
              {level} {counts[level]}
            </span>
          )
        ))}
      </div>

      {/* 레벨별 섹션 */}
      {(['ERROR', 'WARN', 'INFO'] as const).map(level => {
        const items = grouped[level];
        if (items.length === 0) return null;

        const config = LEVEL_CONFIG[level];
        const isExpanded = expandedLevel === level;
        const codeGroups = groupByCode(items);

        return (
          <div key={level} className={`rounded border ${config.bg}`}>
            <button
              onClick={() => setExpandedLevel(isExpanded ? null : level)}
              className={`w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold ${config.text} hover:opacity-80`}
            >
              <span>{config.label} ({items.length}건)</span>
              <span>{isExpanded ? '▲' : '▼'}</span>
            </button>
            {isExpanded && (
              <div className="px-2 pb-2 space-y-0.5">
                {[...codeGroups.entries()].map(([code, codeItems]) => (
                  <div key={code}>
                    {codeItems.slice(0, 3).map((item, idx) => (
                      <div key={idx} className={`text-[10px] ${config.text} pl-2`}>
                        <span className="font-mono">[{item.code}]</span>
                        {item.row && <span className="text-gray-500"> (행{item.row})</span>}
                        {' '}{item.message}
                        {item.value && <span className="text-gray-400"> → &apos;{item.value}&apos;</span>}
                      </div>
                    ))}
                    {codeItems.length > 3 && (
                      <div className={`text-[10px] ${config.text} pl-2 italic`}>
                        [{code}] ... 외 {codeItems.length - 3}건
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

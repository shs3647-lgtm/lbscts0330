/**
 * @file components/ImportStatusBar.tsx
 * @description PFD Import 상태바 컴포넌트 - CP와 동일한 UI
 * @created 2026-01-24
 */

import React from 'react';

export interface ImportStatusBarProps {
  stats: { full: number; group: number; item: number };
  missingCount?: number;
  version?: string;
}

/**
 * PFD Import 상태바 컴포넌트
 * - 통계 표시 (전체/그룹/개별 개수)
 * - 누락 건수 표시
 * - 버전 정보
 */
export default function ImportStatusBar({ stats, missingCount = 0, version = 'PFD Import v1.0' }: ImportStatusBarProps) {
  return (
    <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500 bg-white px-2 py-1 rounded border border-gray-300 w-full flex-shrink-0">
      <span>
        전체: {stats.full}개 | 그룹: {stats.group}개 | 개별: {stats.item}개
        {missingCount > 0 && (
          <span className="ml-2 text-red-500 font-bold">
            ⚠️ 누락: {missingCount}건
          </span>
        )}
      </span>
      <span>버전: {version}</span>
    </div>
  );
}

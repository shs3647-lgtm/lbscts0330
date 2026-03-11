/**
 * @file components/ImportStatusBar.tsx
 * @description Import 상태바 컴포넌트
 * @updated 2026-01-24 - 누락 건수 표시 추가
 */

import React from 'react';

export interface ImportStatusBarProps {
  stats: { full: number; group: number; item: number };
  missingCount?: number;  // 누락 건수
  version?: string;
}

/**
 * Import 상태바 컴포넌트
 * - 통계 표시 (전체/그룹/개별 개수)
 * - 누락 건수 표시
 * - 버전 정보
 */
export default function ImportStatusBar({ stats, missingCount = 0, version = 'Control Plan Import v2.4' }: ImportStatusBarProps) {
  return (
    <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500 bg-white px-2 py-1 rounded border border-gray-300 w-full flex-shrink-0">
      <span>
        전체(Full): {stats.full}개 | 그룹(Group): {stats.group}개 | 개별(Item): {stats.item}개
        {missingCount > 0 && (
          <span className="ml-2 text-red-500 font-bold">
            ⚠️ 누락(Missing): {missingCount}건
          </span>
        )}
      </span>
      <span>버전: {version}</span>
    </div>
  );
}


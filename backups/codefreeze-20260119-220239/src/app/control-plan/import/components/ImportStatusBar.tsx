/**
 * @file components/ImportStatusBar.tsx
 * @description Import 상태바 컴포넌트
 * @updated 2026-01-14
 */

import React from 'react';

export interface ImportStatusBarProps {
  stats: { full: number; group: number; item: number };
  version?: string;
}

/**
 * Import 상태바 컴포넌트
 * - 통계 표시 (전체/그룹/개별 개수)
 * - 버전 정보
 */
export default function ImportStatusBar({ stats, version = 'Control Plan Import v2.4' }: ImportStatusBarProps) {
  return (
    <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500 bg-white px-2 py-1 rounded border border-gray-300 w-full flex-shrink-0">
      <span>전체: {stats.full}개 | 그룹: {stats.group}개 | 개별: {stats.item}개</span>
      <span>버전: {version}</span>
    </div>
  );
}


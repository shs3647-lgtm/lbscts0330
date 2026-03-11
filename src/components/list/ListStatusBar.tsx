/**
 * @file ListStatusBar.tsx
 * @description 리스트 하단 상태바 공통 컴포넌트
 * @version 1.0.0
 * @created 2026-01-24
 */

import React from 'react';

interface ListStatusBarProps {
  filteredCount: number;
  totalCount: number;
  moduleName: string;  // 예: 'PFMEA', 'CP', 'PFD'
  version?: string;
}

export default function ListStatusBar({
  filteredCount,
  totalCount,
  moduleName,
  version = 'v1.0',
}: ListStatusBarProps) {
  return (
    <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
      <span>조회 결과: {filteredCount}건 / 전체: {totalCount}건</span>
      <span>버전: {moduleName} Suite {version} | 사용자: {moduleName} Lead</span>
    </div>
  );
}

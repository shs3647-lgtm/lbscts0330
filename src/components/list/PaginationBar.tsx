/**
 * @file PaginationBar.tsx
 * @description 서버사이드 페이지네이션 하단 바 공통 컴포넌트
 * @version 1.0.0
 * @created 2026-03-15
 */

'use client';

import React from 'react';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  moduleName: string;
  version?: string;
}

export default function PaginationBar({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  moduleName,
  version = 'v3.2',
}: PaginationBarProps) {
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  // 페이지 번호 범위 계산 (최대 7개)
  const maxVisible = 7;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  const pageNumbers: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="mt-1 px-2 py-1.5 bg-white rounded border border-gray-300 flex items-center justify-between text-xs text-gray-500">
      <span>
        조회 결과(Results): {startItem}-{endItem} / 전체(Total): {totalCount}건
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className="px-1.5 py-0.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-[10px]"
          >
            ◀◀
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-1.5 py-0.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-[10px]"
          >
            ◀
          </button>

          {startPage > 1 && (
            <span className="px-1 text-gray-400 text-[10px]">...</span>
          )}

          {pageNumbers.map(n => (
            <button
              key={n}
              onClick={() => onPageChange(n)}
              className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                n === page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 hover:bg-gray-100 text-gray-700'
              }`}
            >
              {n}
            </button>
          ))}

          {endPage < totalPages && (
            <span className="px-1 text-gray-400 text-[10px]">...</span>
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-1.5 py-0.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-[10px]"
          >
            ▶
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="px-1.5 py-0.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-[10px]"
          >
            ▶▶
          </button>
        </div>
      )}

      <span>
        버전(Version): {moduleName} Suite {version} | 사용자(User): {moduleName} Lead
      </span>
    </div>
  );
}

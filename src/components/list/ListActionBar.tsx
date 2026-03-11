/**
 * @file ListActionBar.tsx
 * @description 리스트 액션 바 공통 컴포넌트
 * @version 1.2.0
 * @created 2026-01-24
 * @updated 2026-02-05 신규 등록 버튼에 mode=new 파라미터 추가
 * 
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 *
 * ⚠️ 이 파일은 L4 코드프리즈 상태입니다. 절대 수정 금지.
 */

import React from 'react';

interface ListActionBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  onRefresh?: () => void;
  onSave?: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved';
  onEdit?: () => void;
  editDisabled?: boolean;
  onDelete: () => void;
  deleteDisabled: boolean;
  deleteCount?: number;
  registerUrl?: string;
  themeColor: string;
  showRegisterButton?: boolean;
  onRevision?: () => void;
  revisionDisabled?: boolean;
}

// 컴팩트 버튼 스타일 (도움말 배지 크기 통일)
const BTN = 'px-2.5 py-1 text-[11px] rounded flex items-center gap-1 cursor-pointer whitespace-nowrap';

export default function ListActionBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = '🔍 검색...',
  onSave,
  saveStatus = 'idle',
  onDelete,
  deleteDisabled,
  deleteCount,
  registerUrl,
  themeColor,
  showRegisterButton = false,
  onRevision,
  revisionDisabled = true,
}: ListActionBarProps) {
  return (
    <div className="flex items-center justify-between mb-3 gap-3">
      <div className="flex-1 max-w-md">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-400 rounded bg-white focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex gap-1.5">
        {onSave && (
          <button
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className={`${BTN} font-bold ${saveStatus === 'saved'
              ? 'bg-green-500 text-white border border-green-600'
              : 'bg-blue-100 border border-blue-400 text-blue-700 hover:bg-blue-200'
              }`}
          >
            {saveStatus === 'saved' ? '✓ 저장됨' : saveStatus === 'saving' ? '⏳ 저장중...' : '💾 저장'}
          </button>
        )}

        {/* ★ 개정 버튼 */}
        {onRevision && (
          <button
            onClick={onRevision}
            disabled={revisionDisabled}
            className={`${BTN} bg-blue-100 border border-blue-500 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            📋 개정
          </button>
        )}

        <button
          onClick={onDelete}
          disabled={deleteDisabled}
          className={`${BTN} bg-red-100 border border-red-400 text-red-600 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          🗑️ 삭제
        </button>

        {/* ★ 신규 등록 버튼 - showRegisterButton이 true일 때만 표시 */}
        {showRegisterButton && registerUrl && (
          <a
            href={`${registerUrl}?mode=new`}
            className={`${BTN} text-white font-bold hover:opacity-90`}
            style={{ backgroundColor: themeColor }}
          >
            ➕ 신규 등록
          </a>
        )}
      </div>
    </div>
  );
}

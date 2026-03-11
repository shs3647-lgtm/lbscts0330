/**
 * @file components/sync/SyncButton.tsx
 * @description 재사용 가능한 동기화 버튼 컴포넌트
 * @module sync/components
 */

'use client';

import React from 'react';
import type { SyncStatus } from '@/hooks/sync/types';

// ============================================================================
// 타입 정의
// ============================================================================

export type SyncButtonVariant = 
  | 'structure'     // 구조 연동
  | 'data'          // 데이터 동기화
  | 'navigate';     // 이동

export type SyncButtonDirection = 
  | 'fmea-to-cp' 
  | 'cp-to-fmea';

export interface SyncButtonProps {
  /** 버튼 변형 */
  variant: SyncButtonVariant;
  /** 동기화 방향 */
  direction?: SyncButtonDirection;
  /** 버튼 레이블 (자동 생성 오버라이드) */
  label?: string;
  /** 클릭 핸들러 */
  onClick: () => void;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 현재 동기화 상태 */
  status?: SyncStatus;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ============================================================================
// 상수
// ============================================================================

const STATUS_COLORS: Record<SyncStatus, string> = {
  idle: '',
  syncing: 'animate-pulse',
  success: 'bg-green-600 hover:bg-green-700',
  partial: 'bg-yellow-600 hover:bg-yellow-700',
  conflict: 'bg-orange-600 hover:bg-orange-700',
  error: 'bg-red-600 hover:bg-red-700',
};

const VARIANT_ICONS: Record<SyncButtonVariant, string> = {
  structure: '🔗',
  data: '🔄',
  navigate: '→',
};

// ============================================================================
// 레이블 생성 함수
// ============================================================================

const generateLabel = (
  variant: SyncButtonVariant,
  direction?: SyncButtonDirection
): string => {
  if (variant === 'navigate') {
    return direction === 'fmea-to-cp' ? 'CP 이동' : 'FMEA 이동';
  }

  if (variant === 'structure') {
    return direction === 'fmea-to-cp' ? 'CP 구조연동' : 'FMEA 구조연동';
  }

  if (variant === 'data') {
    return '데이터 동기화';
  }

  return '동기화';
};

// ============================================================================
// 컴포넌트
// ============================================================================

/**
 * 동기화 버튼 컴포넌트
 * 
 * @example
 * ```tsx
 * // 구조 연동 버튼
 * <SyncButton
 *   variant="structure"
 *   direction="fmea-to-cp"
 *   onClick={() => handleStructureSync()}
 *   status={syncState.status}
 * />
 * 
 * // 데이터 동기화 버튼
 * <SyncButton
 *   variant="data"
 *   onClick={() => handleDataSync()}
 *   disabled={!isLinked}
 * />
 * 
 * // 이동 버튼
 * <SyncButton
 *   variant="navigate"
 *   direction="fmea-to-cp"
 *   onClick={() => router.push('/control-plan/worksheet')}
 * />
 * ```
 */
export function SyncButton({
  variant,
  direction,
  label,
  onClick,
  disabled = false,
  status = 'idle',
  className = '',
}: SyncButtonProps) {
  const displayLabel = label || generateLabel(variant, direction);
  const icon = VARIANT_ICONS[variant];
  const statusClass = STATUS_COLORS[status];
  const isSyncing = status === 'syncing';

  // 기본 스타일
  const baseStyles = [
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
  ].join(' ');

  // 변형별 스타일
  const variantStyles: Record<SyncButtonVariant, string> = {
    structure: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    data: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
    navigate: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
  };

  // 비활성화 스타일
  const disabledStyles = disabled 
    ? 'opacity-50 cursor-not-allowed' 
    : 'cursor-pointer';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSyncing}
      className={[
        baseStyles,
        variantStyles[variant],
        statusClass,
        disabledStyles,
        className,
      ].filter(Boolean).join(' ')}
      title={displayLabel}
    >
      {/* 아이콘 */}
      <span className={isSyncing ? 'animate-spin' : ''}>
        {isSyncing ? '⏳' : icon}
      </span>
      
      {/* 레이블 */}
      <span>{displayLabel}</span>
      
      {/* 상태 인디케이터 */}
      {status === 'success' && (
        <span className="text-green-200">✓</span>
      )}
      {status === 'conflict' && (
        <span className="text-yellow-200">⚠</span>
      )}
      {status === 'error' && (
        <span className="text-red-200">✗</span>
      )}
    </button>
  );
}

export default SyncButton;

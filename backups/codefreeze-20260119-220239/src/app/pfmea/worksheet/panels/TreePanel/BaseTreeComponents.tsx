// @ts-nocheck
/**
 * @file BaseTreeComponents.tsx
 * @description 트리뷰 공통 컴포넌트 (표준화/모듈화/공용화)
 * @version 1.0.0
 * @created 2026-01-03
 * 
 * 공통 컴포넌트:
 * - TreeContainer: 전체 컨테이너
 * - TreeHeader: 헤더 (색상, 제목, 카운트)
 * - TreeContent: 내용 영역
 * - TreeFooter: 푸터
 * - TreeItem: 트리 아이템
 * - TreeBranch: 트리 가지 (들여쓰기)
 * - TreeBadge: 배지 (카운트, 4M 등)
 */

'use client';

import React from 'react';

// ============ 테마 색상 정의 ============
export interface TreeTheme {
  header: string;       // 헤더 배경색 (예: bg-[#1976d2])
  headerText: string;   // 헤더 텍스트 (기본 white)
  content: string;      // 내용 배경색 (예: bg-green-50)
  footer: string;       // 푸터 배경색
  footerText: string;   // 푸터 텍스트 색상
  branch: string;       // 가지 색상 (예: border-blue-300)
  itemBg: string;       // 아이템 배경색
  itemText: string;     // 아이템 텍스트 색상
}

// 사전 정의된 테마
export const TREE_THEMES: Record<string, TreeTheme> = {
  structure: {
    header: 'bg-[#1976d2]',
    headerText: 'text-white',
    content: 'bg-slate-50',
    footer: 'bg-gray-200 border-gray-300',
    footerText: 'text-gray-600',
    branch: 'border-blue-300',
    itemBg: 'bg-blue-50',
    itemText: 'text-blue-900',
  },
  function: {
    header: 'bg-[#2e7d32]',
    headerText: 'text-white',
    content: 'bg-green-50',
    footer: 'bg-gray-200 border-gray-300',
    footerText: 'text-gray-600',
    branch: 'border-green-500',
    itemBg: 'bg-green-100',
    itemText: 'text-green-900',
  },
  failure: {
    header: 'bg-[#1a237e]',
    headerText: 'text-white',
    content: 'bg-[#f5f6fc]',
    footer: 'bg-indigo-50 border-indigo-100',
    footerText: 'text-[#1a237e]',
    branch: 'border-indigo-300',
    itemBg: 'bg-indigo-50',
    itemText: 'text-indigo-900',
  },
  orange: {
    header: 'bg-[#e65100]',
    headerText: 'text-white',
    content: 'bg-orange-50',
    footer: 'bg-orange-100 border-orange-200',
    footerText: 'text-orange-800',
    branch: 'border-orange-400',
    itemBg: 'bg-orange-100',
    itemText: 'text-orange-900',
  },
};

// ============ 공통 스타일 ============
export const treeStyles = {
  // 컨테이너
  container: 'flex flex-col h-full',
  
  // 헤더
  header: 'shrink-0 px-3 py-2 text-xs font-bold',
  
  // 내용
  content: 'flex-1 overflow-auto p-2',
  
  // 푸터
  footer: 'shrink-0 py-1.5 px-2.5 border-t text-[10px]',
  
  // 트리 아이템
  item: 'flex items-center gap-1.5 p-1 rounded',
  
  // 트리 가지
  branch: 'mb-1.5 ml-2 border-l-2 pl-2',
  
  // 텍스트
  textXs: 'text-[10px]',
  textXxs: 'text-[9px]',
  text11: 'text-[11px]',
  fontBold: 'font-bold',
  fontSemibold: 'font-semibold',
  
  // 빈 상태
  empty: 'text-[11px] text-gray-500 p-4 text-center bg-gray-100 rounded',
  emptySmall: 'text-[9px] text-gray-400 italic ml-3',
};

// ============ 컴포넌트들 ============

/**
 * 트리 컨테이너
 */
interface TreeContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function TreeContainer({ children, className = '' }: TreeContainerProps) {
  return (
    <div className={`${treeStyles.container} ${className}`}>
      {children}
    </div>
  );
}

/**
 * 트리 헤더
 */
interface TreeHeaderProps {
  icon: string;
  title: string;
  counts?: { label: string; value: number }[];
  theme?: keyof typeof TREE_THEMES | TreeTheme;
  extra?: React.ReactNode;
}

export function TreeHeader({ icon, title, counts = [], theme = 'structure', extra }: TreeHeaderProps) {
  const colors = typeof theme === 'string' ? TREE_THEMES[theme] : theme;
  
  return (
    <div className={`${treeStyles.header} ${colors.header} ${colors.headerText}`}>
      <div className="flex items-center justify-between">
        <div>
          {icon} {title}{' '}
          {counts.length > 0 && (
            <span className="text-[10px] font-normal">
              {counts.map((c, i) => `${c.label}(${c.value})`).join(' ')}
            </span>
          )}
        </div>
        {extra}
      </div>
    </div>
  );
}

/**
 * 트리 서브헤더 (상위 항목 표시용)
 */
interface TreeSubHeaderProps {
  icon: string;
  label: string;
  bgColor?: string;
  textColor?: string;
}

export function TreeSubHeader({ icon, label, bgColor = 'bg-blue-50', textColor = 'text-blue-900' }: TreeSubHeaderProps) {
  return (
    <div className={`shrink-0 ${bgColor} py-1.5 px-2.5 border-b border-gray-200`}>
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{icon}</span>
        <span className={`text-xs font-bold ${textColor}`}>{label || '(미입력)'}</span>
      </div>
    </div>
  );
}

/**
 * 트리 내용 영역
 */
interface TreeContentProps {
  children: React.ReactNode;
  theme?: keyof typeof TREE_THEMES | TreeTheme;
  className?: string;
}

export function TreeContent({ children, theme = 'structure', className = '' }: TreeContentProps) {
  const colors = typeof theme === 'string' ? TREE_THEMES[theme] : theme;
  
  return (
    <div className={`${treeStyles.content} ${colors.content} ${className}`}>
      {children}
    </div>
  );
}

/**
 * 트리 푸터
 */
interface TreeFooterProps {
  children: React.ReactNode;
  theme?: keyof typeof TREE_THEMES | TreeTheme;
}

export function TreeFooter({ children, theme = 'structure' }: TreeFooterProps) {
  const colors = typeof theme === 'string' ? TREE_THEMES[theme] : theme;
  
  return (
    <div className={`${treeStyles.footer} ${colors.footer} ${colors.footerText}`}>
      {children}
    </div>
  );
}

/**
 * 트리 아이템
 */
interface TreeItemProps {
  icon: string;
  label: string;
  count?: number;
  badge?: React.ReactNode;
  bgColor?: string;
  textColor?: string;
  className?: string;
  onClick?: () => void;
}

export function TreeItem({ 
  icon, 
  label, 
  count, 
  badge,
  bgColor = 'bg-gray-50', 
  textColor = 'text-gray-900',
  className = '',
  onClick,
}: TreeItemProps) {
  return (
    <div 
      className={`${treeStyles.item} ${bgColor} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={onClick}
    >
      <span>{icon}</span>
      <span className={`${treeStyles.text11} ${treeStyles.fontSemibold} ${textColor} flex-1 truncate`}>
        {label}
      </span>
      {badge}
      {count !== undefined && (
        <span className="text-[9px] text-gray-500 ml-auto bg-white px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

/**
 * 트리 가지 (들여쓰기)
 */
interface TreeBranchProps {
  children: React.ReactNode;
  theme?: keyof typeof TREE_THEMES | TreeTheme;
  className?: string;
}

export function TreeBranch({ children, theme = 'structure', className = '' }: TreeBranchProps) {
  const colors = typeof theme === 'string' ? TREE_THEMES[theme] : theme;
  
  return (
    <div className={`${treeStyles.branch} ${colors.branch} ${className}`}>
      {children}
    </div>
  );
}

/**
 * 트리 배지 (카테고리, 4M 등)
 */
interface TreeBadgeProps {
  label: string;
  bgColor?: string;
  textColor?: string;
  size?: 'xs' | 'sm';
}

export function TreeBadge({ label, bgColor = '#e8f5e9', textColor = '#2e7d32', size = 'xs' }: TreeBadgeProps) {
  const sizeClass = size === 'xs' ? 'text-[8px] px-1 py-0.5' : 'text-[9px] px-1.5 py-0.5';
  
  return (
    <span 
      className={`${sizeClass} font-bold rounded shrink-0`}
      style={{ background: bgColor, color: textColor }}
    >
      {label}
    </span>
  );
}

/**
 * 트리 빈 상태
 */
interface TreeEmptyProps {
  message: string;
  small?: boolean;
}

export function TreeEmpty({ message, small = false }: TreeEmptyProps) {
  return (
    <div className={small ? treeStyles.emptySmall : treeStyles.empty}>
      {message}
    </div>
  );
}

/**
 * 트리 리프 아이템 (가장 말단)
 */
interface TreeLeafProps {
  icon: string;
  label: string;
  bgColor?: string;
  textColor?: string;
  badge?: React.ReactNode;
  indent?: number;
}

export function TreeLeaf({ icon, label, bgColor, textColor = '#333', badge, indent = 3 }: TreeLeafProps) {
  return (
    <div 
      className={`flex items-center gap-1 py-0.5 px-1 rounded text-[9px] ${bgColor ? '' : ''}`}
      style={{ 
        marginLeft: `${indent * 4}px`, 
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      <span className="text-[8px]">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge}
    </div>
  );
}

// ============ 색상 헬퍼 ============
export const LEVEL_COLORS = {
  l1: { bg: '#e3f2fd', text: '#1565c0', border: '#1976d2' },
  l2: { bg: '#e8f5e9', text: '#2e7d32', border: '#388e3c' },
  l3: { bg: '#fff3e0', text: '#e65100', border: '#f57c00' },
};

export const M4_COLORS: Record<string, { bg: string; text: string }> = {
  MN: { bg: '#ffebee', text: '#d32f2f' },
  MC: { bg: '#e3f2fd', text: '#1565c0' },
  IM: { bg: '#e8f5e9', text: '#2e7d32' },
  EN: { bg: '#fff3e0', text: '#f57c00' },
};






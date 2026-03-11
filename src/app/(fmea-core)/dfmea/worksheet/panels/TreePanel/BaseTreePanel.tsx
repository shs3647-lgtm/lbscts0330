/**
 * @file BaseTreePanel.tsx
 * @description 트리 패널 공통 베이스 컴포넌트 (표준화/모듈화/공용화)
 * @version 1.0.0
 * @created 2026-01-03
 * 
 * 모든 트리 패널의 공통 구조:
 * 1. 헤더 (색상, 아이콘, 제목, 카운트)
 * 2. 서브헤더 (옵션: 상위 항목 표시)
 * 3. 내용 (트리 아이템들)
 * 4. 푸터 (카운트 요약)
 * 
 * 커스터마이징:
 * - theme: 색상 테마 (structure, function, failure)
 * - renderItems: 트리 아이템 렌더링 함수
 */

'use client';

import React, { useState } from 'react';
import { TREE_HELP } from './treeHelpContent';

// ============ 테마 정의 ============
export interface TreeTheme {
  header: string;
  content: string;
  footer: string;
  branch: string;
}

export const TREE_THEMES: Record<string, TreeTheme> = {
  structure: {
    header: 'bg-[#1976d2]',
    content: 'bg-slate-50',
    footer: 'bg-gray-200 border-gray-300 text-gray-600',
    branch: 'border-blue-300',
  },
  'function-l1': {
    header: 'bg-[#1b5e20]',
    content: 'bg-green-50',
    footer: 'bg-gray-200 border-gray-300 text-gray-600',
    branch: 'border-green-600',
  },
  'function-l2': {
    header: 'bg-[#2e7d32]',
    content: 'bg-green-50',
    footer: 'bg-gray-200 border-gray-300 text-gray-600',
    branch: 'border-green-500',
  },
  'function-l3': {
    header: 'bg-[#388e3c]',
    content: 'bg-green-50',
    footer: 'bg-gray-200 border-gray-300 text-gray-600',
    branch: 'border-green-400',
  },
  'failure-l1': {
    header: 'bg-[#1976d2]',       // ★ 1L 표준: 파란색 (구조분석 레벨 색상)
    content: 'bg-[#e3f2fd]',      // ★ 파란색 배경
    footer: 'bg-blue-50 border-blue-100 text-[#1976d2]',
    branch: 'border-blue-300',
  },
  'failure-l2': {
    header: 'bg-[#283593]',
    content: 'bg-[#f5f6fc]',
    footer: 'bg-indigo-50 border-indigo-100 text-[#1a237e]',
    branch: 'border-indigo-400',
  },
  'failure-l3': {
    header: 'bg-[#303f9f]',
    content: 'bg-[#f5f6fc]',
    footer: 'bg-indigo-50 border-indigo-100 text-[#1a237e]',
    branch: 'border-indigo-500',
  },
};

// ============ 공통 스타일 ============
export const tw = {
  container: 'flex flex-col h-full',
  header: 'shrink-0 text-white px-3 py-2 text-xs font-bold',
  content: 'flex-1 overflow-auto p-2',
  footer: 'shrink-0 py-1.5 px-2.5 border-t text-[10px]',
  subHeader: 'shrink-0 py-1.5 px-2.5 border-b',

  // 트리
  branch: 'mb-1.5 ml-2 border-l-2 pl-2',
  item: 'flex items-center gap-1.5 p-1 rounded',

  // 텍스트
  textXs: 'text-[10px]',
  textXxs: 'text-[9px]',
  text11: 'text-[11px]',

  // 상태
  empty: 'text-[11px] text-gray-500 p-4 text-center bg-gray-100 rounded',
  emptySmall: 'text-[9px] text-gray-400 italic ml-3',

  // 배지
  countBadge: 'text-[9px] text-gray-500 ml-auto bg-white px-1.5 py-0.5 rounded-full',
};

// ============ Props ============
export interface TreePanelConfig {
  icon: string;
  title: string;
  counts: { label: string; value: number }[];
  theme: keyof typeof TREE_THEMES;
  subHeader?: {
    icon: string;
    label: string;
    bgColor: string;
    textColor?: string;
  };
  emptyMessage?: string;
  extra?: React.ReactNode;
}

export interface BaseTreePanelProps {
  config: TreePanelConfig;
  children: React.ReactNode;
}

// ============ 도움말 렌더링 ============
function HelpContent({ theme }: { theme: string }) {
  const help = TREE_HELP[theme];
  if (!help) return <div className="p-3 text-[11px] text-gray-500">도움말이 없습니다.</div>;

  return (
    <div className="p-3 space-y-3">
      <div className="text-[12px] font-bold text-gray-800">{help.title}</div>
      <div className="text-[11px] text-gray-600 leading-relaxed">{help.summary}</div>
      {help.sections.map((section, sIdx) => (
        <div key={sIdx}>
          <div className="text-[11px] font-bold text-blue-800 border-b border-blue-200 pb-0.5 mb-1.5">
            {section.label}
          </div>
          <div className="space-y-1.5">
            {section.items.map((item, iIdx) => (
              <div key={iIdx} className="ml-1">
                <span className="text-[11px] font-bold text-gray-700">{item.title}</span>
                <span className="text-[10px] text-gray-500 ml-1">- {item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ 메인 컴포넌트 ============
export default function BaseTreePanel({ config, children }: BaseTreePanelProps) {
  const theme = TREE_THEMES[config.theme] || TREE_THEMES.structure;
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className={tw.container}>
      {/* 헤더 */}
      <div className={`${tw.header} ${theme.header}`}>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
            <span className="text-yellow-300 text-[11px] font-bold shrink-0">트리뷰:</span>
            <span className="text-[10px] font-normal truncate">
              {config.counts.map(c => `${c.label}(${c.value})`).join(' ')}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {config.extra}
            <button
              type="button"
              onClick={() => setShowHelp(prev => !prev)}
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer border whitespace-nowrap ${
                showHelp
                  ? 'bg-yellow-400 text-gray-800 border-yellow-500 shadow-sm'
                  : 'bg-white/20 text-white border-white/40 hover:bg-white/30'
              }`}
              title="도움말 보기/닫기"
            >
              ?
            </button>
          </div>
        </div>
      </div>

      {/* 서브헤더 (옵션) */}
      {!showHelp && config.subHeader && (
        <div
          className={tw.subHeader}
          style={{ backgroundColor: config.subHeader.bgColor }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{config.subHeader.icon}</span>
            <span
              className="text-xs font-bold"
              style={{ color: config.subHeader.textColor || '#333' }}
            >
              {config.subHeader.label || '(미입력)'}
            </span>
          </div>
        </div>
      )}

      {/* 내용: 도움말 or 트리 */}
      <div className={`${tw.content} ${showHelp ? 'bg-white' : theme.content}`}>
        {showHelp ? <HelpContent theme={config.theme} /> : children}
      </div>

      {/* 푸터 */}
      <div className={`${tw.footer} ${theme.footer}`}>
        <span className="font-bold truncate block">
          {showHelp ? '「?」 클릭 → 트리뷰 복귀' : config.counts.map(c => `${c.label}(${c.value})`).join(' ')}
        </span>
      </div>
    </div>
  );
}

// ============ 헬퍼 컴포넌트들 ============

/** 트리 아이템 */
export function TreeItem({
  icon,
  label,
  count,
  bgColor = '#f0f0f0',
  textColor = '#333',
  badge,
  className = '',
}: {
  icon: string;
  label: string;
  count?: number;
  bgColor?: string;
  textColor?: string;
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${tw.item} ${className}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <span>{icon}</span>
      <span className={`${tw.text11} font-semibold flex-1 truncate`}>{label}</span>
      {badge}
      {count !== undefined && <span className={tw.countBadge}>{count}</span>}
    </div>
  );
}

/** 트리 가지 */
export function TreeBranch({
  children,
  borderColor = '#93c5fd',
  className = '',
}: {
  children: React.ReactNode;
  borderColor?: string;
  className?: string;
}) {
  return (
    <div
      className={`${tw.branch} ${className}`}
      style={{ borderColor }}
    >
      {children}
    </div>
  );
}

/** 트리 리프 (말단 아이템) */
export function TreeLeaf({
  icon,
  label,
  bgColor,
  textColor = '#333',
  badge,
  indent = 4,
}: {
  icon: string;
  label: string;
  bgColor?: string;
  textColor?: string;
  badge?: React.ReactNode;
  indent?: number;
}) {
  return (
    <div
      className={`flex items-center gap-1 py-0.5 px-1 rounded ${tw.textXxs}`}
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

/** 빈 상태 */
export function TreeEmpty({ message, small = false }: { message: string; small?: boolean }) {
  return <div className={small ? tw.emptySmall : tw.empty}>{message}</div>;
}

/** 배지 */
export function TreeBadge({
  label,
  bgColor = '#e8f5e9',
  textColor = '#2e7d32',
}: {
  label: string;
  bgColor?: string;
  textColor?: string;
}) {
  return (
    <span
      className="text-[8px] font-bold px-1 py-0.5 rounded shrink-0"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {label}
    </span>
  );
}






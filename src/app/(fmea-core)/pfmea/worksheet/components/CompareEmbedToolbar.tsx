'use client';

/**
 * 비교 뷰 iframe 전용: 상단 메뉴가 숨겨져도 Master(읽기) / 작업 FMEA(편집·저장) 구분 및 저장 가능
 */
import React, { useEffect } from 'react';

export interface CompareEmbedToolbarProps {
  readOnly: boolean;
  dirty: boolean;
  isSaving: boolean;
  lastSaved: string;
  fmeaLabel?: string;
  onSave: () => void;
}

export default function CompareEmbedToolbar({
  readOnly,
  dirty,
  isSaving,
  lastSaved,
  fmeaLabel,
  onSave,
}: CompareEmbedToolbarProps) {
  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly, onSave]);

  if (readOnly) {
    return (
      <div
        className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-[10px] text-slate-600"
        data-testid="compare-embed-toolbar"
      >
        <span className="font-semibold text-slate-800">Master 참조</span>
        <span className="text-slate-500">읽기 전용 · 행 추가/삭제·입력 불가</span>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-emerald-400 bg-emerald-50 px-2 py-1.5 text-[10px]"
      data-testid="compare-embed-toolbar"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-bold text-emerald-900">작업 FMEA 편집</span>
        {fmeaLabel ? (
          <span className="max-w-[min(280px,40vw)] truncate text-slate-700" title={fmeaLabel}>
            {fmeaLabel}
          </span>
        ) : null}
        {dirty ? (
          <span className="rounded bg-amber-200 px-1.5 py-0.5 font-semibold text-amber-900">수정됨</span>
        ) : (
          <span className="text-slate-500">저장됨</span>
        )}
        {lastSaved ? <span className="text-slate-500">· {lastSaved}</span> : null}
        <span className="hidden text-slate-400 sm:inline">Ctrl+S 저장</span>
      </div>
      <button
        type="button"
        onClick={() => onSave()}
        disabled={isSaving}
        className="shrink-0 rounded border border-emerald-700 bg-emerald-700 px-3 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
      >
        {isSaving ? '저장 중…' : '저장'}
      </button>
    </div>
  );
}

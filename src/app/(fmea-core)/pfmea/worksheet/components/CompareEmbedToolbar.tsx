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
  fmeaId,
  onSave,
}: CompareEmbedToolbarProps & { fmeaId?: string }) {
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
        className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-2 text-[9px] text-slate-600 w-full"
        style={{ height: 22 }}
        data-testid="compare-embed-toolbar"
      >
        <div className="flex shrink-0 items-center gap-1 min-w-0 overflow-hidden">
          <span className="font-semibold text-slate-800 shrink-0">Master 참조</span>
          {fmeaId && <span className="font-medium text-slate-700 ml-1 shrink-0 truncate max-w-[120px]" title={fmeaId}>[{fmeaId}]</span>}
          {fmeaLabel && fmeaId !== fmeaLabel && <span className="text-slate-500 truncate min-w-0 max-w-[200px]" title={fmeaLabel}>{fmeaLabel}</span>}
          <span className="text-slate-400 shrink-0">읽기 전용</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-1 border-b border-emerald-400 bg-emerald-50 px-2 text-[9px]"
      style={{ height: 22 }}
      data-testid="compare-embed-toolbar"
    >
      <div className="flex min-w-0 items-center gap-1 overflow-hidden">
        <span className="shrink-0 font-bold text-emerald-900">작업 FMEA 편집</span>
        {fmeaId && <span className="shrink-0 font-bold text-emerald-800 ml-1 truncate max-w-[120px]" title={fmeaId}>[{fmeaId}]</span>}
        {fmeaLabel && fmeaId !== fmeaLabel && <span className="text-emerald-700 truncate min-w-0 max-w-[200px]" title={fmeaLabel}>{fmeaLabel}</span>}
        {dirty ? (
          <span className="shrink-0 rounded bg-amber-200 px-1 font-semibold text-amber-900 ml-1">수정됨</span>
        ) : (
          <span className="shrink-0 text-slate-500 ml-1">저장됨</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onSave()}
        disabled={isSaving}
        className="shrink-0 rounded border border-emerald-700 bg-emerald-700 px-2 py-px text-[9px] font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {isSaving ? '저장…' : '저장'}
      </button>
    </div>
  );
}

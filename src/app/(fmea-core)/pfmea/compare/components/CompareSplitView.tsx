'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_COMPARE_MASTER_FMEA_ID, normalizeCompareTab } from '../constants';
import { FmeaSelector } from './FmeaSelector';
import { CompareTabBar } from './CompareTabBar';
import { PanelResizer } from './PanelResizer';
import { useCompareScrollSync } from '../hooks/useCompareScrollSync';

function buildWorksheetSrc(
  fmeaId: string,
  tab: string,
  opts: { readonly: boolean; side: 'left' | 'right' },
): string {
  const q = new URLSearchParams();
  q.set('id', fmeaId);
  q.set('tab', tab);
  q.set('compareEmbed', '1');
  q.set('compareSide', opts.side);
  if (opts.readonly) q.set('readonly', '1');
  return `/pfmea/worksheet?${q.toString()}`;
}

export default function CompareSplitView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const leftId = searchParams.get('left') || DEFAULT_COMPARE_MASTER_FMEA_ID;
  const rightId = searchParams.get('right') || '';
  const tab = normalizeCompareTab(searchParams.get('tab'));

  const [leftWidthPct, setLeftWidthPct] = useState(50);
  const [narrow, setNarrow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftIframeRef = useRef<HTMLIFrameElement>(null);
  const rightIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const q = () => setNarrow(typeof window !== 'undefined' && window.innerWidth < 900);
    q();
    window.addEventListener('resize', q);
    return () => window.removeEventListener('resize', q);
  }, []);

  const pushUrl = useCallback(
    (next: { left?: string; right?: string; tab?: string }) => {
      const q = new URLSearchParams(searchParams.toString());
      if (next.left !== undefined) q.set('left', next.left);
      if (next.right !== undefined) q.set('right', next.right);
      if (next.tab !== undefined) q.set('tab', next.tab);
      router.push(`/pfmea/compare?${q.toString()}`);
    },
    [router, searchParams],
  );

  const leftSrc = useMemo(
    () => buildWorksheetSrc(leftId, tab, { readonly: true, side: 'left' }),
    [leftId, tab],
  );
  const rightSrc = useMemo(() => {
    if (!rightId) return '';
    return buildWorksheetSrc(rightId, tab, { readonly: false, side: 'right' });
  }, [rightId, tab]);

  useCompareScrollSync(leftIframeRef, rightIframeRef, Boolean(rightId));

  const onFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  if (narrow) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-center text-sm text-slate-600">
        화면 너비 900px 이상에서 PFMEA 비교 뷰를 이용할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <h1 className="text-sm font-bold text-slate-800">PFMEA 비교 뷰</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] hover:bg-slate-100"
            onClick={() => router.push('/pfmea/list')}
          >
            비교 종료
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] hover:bg-slate-100"
            onClick={onFullscreen}
          >
            전체화면
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-white px-3 py-2">
        <FmeaSelector label="좌측 (Master·읽기전용)" value={leftId} onChange={(id) => pushUrl({ left: id })} />
        <FmeaSelector
          label="우측 (작업·편집)"
          value={rightId}
          onChange={(id) => pushUrl({ right: id })}
        />
      </div>

      <CompareTabBar activeTab={tab} onChange={(t) => pushUrl({ tab: t })} />

      <div ref={containerRef} className="flex min-h-0 flex-1 flex-row">
        <div
          className="min-h-0 min-w-[320px] overflow-hidden border-r border-slate-200 bg-white"
          style={{ flex: `0 0 ${leftWidthPct}%` }}
        >
          <iframe
            ref={leftIframeRef}
            title="PFMEA 비교 좌측"
            className="h-[calc(100vh-140px)] w-full border-0"
            src={leftSrc}
          />
        </div>

        <PanelResizer
          containerRef={containerRef}
          leftWidthPercent={leftWidthPct}
          onWidthPercentChange={setLeftWidthPct}
        />

        <div className="min-h-0 min-w-[320px] flex-1 overflow-hidden bg-white">
          {!rightId ? (
            <div className="flex h-[calc(100vh-140px)] items-center justify-center text-sm text-slate-500">
              우측 FMEA를 선택하세요.
            </div>
          ) : (
            <iframe
              ref={rightIframeRef}
              title="PFMEA 비교 우측"
              className="h-[calc(100vh-140px)] w-full border-0"
              src={rightSrc}
            />
          )}
        </div>
      </div>

      <p className="shrink-0 border-t border-slate-200 bg-amber-50 px-3 py-1 text-[10px] text-amber-900">
        좌측은 읽기 전용(참조), 우측만 편집·저장됩니다. (HTML 테이블 워크시트 — Handsontable 미사용)
      </p>
    </div>
  );
}

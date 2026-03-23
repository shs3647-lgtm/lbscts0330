'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PFMEATopNav from '@/components/layout/PFMEATopNav';
import { SidebarRouter } from '@/components/layout';
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

  const navSelectedId = rightId || leftId;

  const exitCompare = useCallback(() => {
    if (rightId) {
      router.push(`/pfmea/worksheet?id=${encodeURIComponent(rightId)}`);
    } else {
      router.push('/pfmea/list');
    }
  }, [rightId, router]);

  if (narrow) {
    return (
      <>
        <SidebarRouter />
        <div className="fixed z-40 h-screen bg-white" style={{ left: 48, width: 5 }} />
        <PFMEATopNav selectedFmeaId={navSelectedId} />
        <div
          className="fixed right-0 bottom-0 flex flex-col items-center justify-center gap-3 bg-slate-100 p-4 text-center text-sm text-slate-600"
          style={{ top: 36, left: 53 }}
        >
          <p>화면 너비 900px 이상에서 PFMEA 비교 뷰를 이용할 수 있습니다.</p>
          <button
            type="button"
            className="rounded border border-slate-400 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={exitCompare}
          >
            비교 종료
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <SidebarRouter />
      <div className="fixed z-40 h-screen bg-white" style={{ left: 48, width: 5 }} />
      <PFMEATopNav selectedFmeaId={navSelectedId} />

      <div
        className="fixed right-0 flex flex-col"
        style={{ top: 36, left: 53, bottom: 0, background: '#f5f7fb' }}
      >
        {/* 워크시트 TopMenuBar와 동일 인디고 그라데이션 */}
        <div
          className="flex h-9 min-h-9 shrink-0 flex-wrap items-center gap-2 border-b border-white/30 px-2"
          style={{ background: 'linear-gradient(to right, #1a237e, #283593, #1a237e)' }}
        >
          <span className="hidden shrink-0 text-[10px] font-bold text-white sm:inline">PFMEA 비교</span>
          <FmeaSelector variant="dark" label="좌측(Master·읽기)" value={leftId} onChange={(id) => pushUrl({ left: id })} />
          <FmeaSelector
            variant="dark"
            label="우측(편집)"
            value={rightId}
            onChange={(id) => pushUrl({ right: id })}
          />
          <button
            type="button"
            className="ml-auto shrink-0 rounded border border-white/40 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-white/20"
            onClick={exitCompare}
          >
            비교 종료
          </button>
        </div>

        <CompareTabBar activeTab={tab} onChange={(t) => pushUrl({ tab: t })} />

        {/* iframe 영역 — 남은 공간 전체 사용 */}
        <div ref={containerRef} className="relative flex min-h-0 flex-1 flex-row">
          {/* 좌측 (Master) */}
          <div
            className="relative min-h-0 bg-white"
            style={{ flex: `0 0 ${leftWidthPct}%`, minWidth: 200 }}
          >
            <iframe
              ref={leftIframeRef}
              title="PFMEA 비교 좌측"
              src={leftSrc}
              style={{ display: 'block', width: '100%', height: '100%', border: 'none' }}
            />
          </div>

          <PanelResizer
            containerRef={containerRef}
            leftWidthPercent={leftWidthPct}
            onWidthPercentChange={setLeftWidthPct}
          />

          {/* 우측 (편집) */}
          <div className="relative min-h-0 flex-1 bg-white" style={{ minWidth: 200 }}>
            {!rightId ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                우측 FMEA를 선택하세요.
              </div>
            ) : (
              <iframe
                ref={rightIframeRef}
                title="PFMEA 비교 우측"
                src={rightSrc}
                style={{ display: 'block', width: '100%', height: '100%', border: 'none' }}
              />
            )}
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-300 bg-slate-100 px-3 py-1">
          <p className="text-[10px] text-slate-600">
            좌측 읽기 전용(참조) · 우측 편집·저장
          </p>
          <button
            type="button"
            className="rounded border border-slate-500 bg-white px-3 py-1 text-[10px] font-semibold text-slate-900 hover:bg-slate-50"
            onClick={exitCompare}
          >
            비교 종료
          </button>
        </footer>
      </div>
    </>
  );
}

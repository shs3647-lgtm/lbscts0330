'use client';

import { useEffect, useRef } from 'react';

const SCROLL_IDS = ['worksheet-scroll-container', 'all-tab-scroll-wrapper'] as const;

/** 세로 스크롤이 가능한 주요 요소 (탭마다 실제 스크롤이 중첩 overflow-auto 에 있을 수 있음) */
function findPrimaryScrollEl(doc: Document | null): HTMLElement | null {
  if (!doc) return null;
  for (const id of SCROLL_IDS) {
    const el = doc.getElementById(id);
    if (el && el.scrollHeight > el.clientHeight + 1) return el;
  }
  for (const id of SCROLL_IDS) {
    const el = doc.getElementById(id);
    if (el) return el;
  }
  const root = doc.getElementById('fmea-worksheet-container');
  if (!root) return null;
  const candidates = root.querySelectorAll<HTMLElement>(
    '[class*="overflow-auto"],[class*="overflow-y-auto"],[class*="overflow-x-auto"]',
  );
  for (const c of candidates) {
    if (c.scrollHeight > c.clientHeight + 1) return c;
  }
  return null;
}

type CompareScrollPayload = {
  type: 'pfmea-compare-scroll';
  source: 'left' | 'right';
  scrollRatio?: number;
  scrollTop?: number;
};

/**
 * iframe 워크시트 간 세로 스크롤 동기화 (postMessage)
 * scrollRatio(0~1) 우선 — 좌우 문서 높이가 달라도 대략 같은 위치로 맞춤
 */
export function useCompareScrollSync(
  leftRef: React.RefObject<HTMLIFrameElement | null>,
  rightRef: React.RefObject<HTMLIFrameElement | null>,
  enabled: boolean,
): void {
  const syncing = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'pfmea-compare-scroll') return;
      const payload = e.data as CompareScrollPayload;
      if (syncing.current) return;
      const targetFrame = payload.source === 'left' ? rightRef.current : leftRef.current;
      if (!targetFrame?.contentWindow) return;
      const targetDoc = targetFrame.contentWindow.document;
      const sc = findPrimaryScrollEl(targetDoc);
      if (!sc) return;

      const denom = sc.scrollHeight - sc.clientHeight;
      let nextTop: number;
      if (typeof payload.scrollRatio === 'number' && Number.isFinite(payload.scrollRatio) && denom > 0) {
        nextTop = Math.round(Math.min(1, Math.max(0, payload.scrollRatio)) * denom);
      } else if (typeof payload.scrollTop === 'number' && Number.isFinite(payload.scrollTop)) {
        nextTop = payload.scrollTop;
      } else {
        return;
      }

      if (Math.abs(sc.scrollTop - nextTop) < 2) return;
      syncing.current = true;
      sc.scrollTop = nextTop;
      requestAnimationFrame(() => {
        syncing.current = false;
      });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [enabled, leftRef, rightRef]);
}

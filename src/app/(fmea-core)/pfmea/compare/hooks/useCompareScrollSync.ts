'use client';

import { useEffect, useRef } from 'react';

const SCROLL_IDS = ['worksheet-scroll-container', 'all-tab-scroll-wrapper'] as const;

function findScrollEl(doc: Document | null): HTMLElement | null {
  if (!doc) return null;
  for (const id of SCROLL_IDS) {
    const el = doc.getElementById(id);
    if (el) return el;
  }
  return null;
}

/**
 * iframe 워크시트 간 세로 스크롤 동기화 (postMessage)
 * 자식: `compareSide=left|right` + `compareEmbed=1` 일 때 스크롤 시 부모로 전달
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
      const payload = e.data as { scrollTop: number; source: 'left' | 'right' };
      if (syncing.current) return;
      const targetFrame =
        payload.source === 'left' ? rightRef.current : leftRef.current;
      if (!targetFrame?.contentWindow) return;
      const targetDoc = targetFrame.contentWindow.document;
      const sc = findScrollEl(targetDoc);
      if (!sc) return;
      if (Math.abs(sc.scrollTop - payload.scrollTop) < 2) return;
      syncing.current = true;
      sc.scrollTop = payload.scrollTop;
      requestAnimationFrame(() => {
        syncing.current = false;
      });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [enabled, leftRef, rightRef]);
}

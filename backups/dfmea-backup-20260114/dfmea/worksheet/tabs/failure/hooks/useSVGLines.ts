/**
 * @file useSVGLines.ts
 * @description SVG 연결선 계산 훅
 */

import { useState, useCallback, useEffect, RefObject } from 'react';

export function useSVGLines(
  chainAreaRef: RefObject<HTMLDivElement | null>,
  fmNodeRef: RefObject<HTMLDivElement | null>,
  feColRef: RefObject<HTMLDivElement | null>,
  fcColRef: RefObject<HTMLDivElement | null>,
  linkedFEs: Map<string, any>,
  linkedFCs: Map<string, any>,
  currentFM: any
) {
  const [svgPaths, setSvgPaths] = useState<string[]>([]);

  const drawLines = useCallback(() => {
    if (!chainAreaRef.current || !fmNodeRef.current) {
      setSvgPaths([]);
      return;
    }
    const area = chainAreaRef.current.getBoundingClientRect();
    const fmRect = fmNodeRef.current.getBoundingClientRect();
    const fmCenterY = fmRect.top + fmRect.height / 2 - area.top;
    const fmLeft = fmRect.left - area.left;
    const fmRight = fmRect.right - area.left;

    const paths: string[] = [];

    // FM → FE 곡선 (FM에서 FE로)
    if (feColRef.current) {
      const feCards = feColRef.current.querySelectorAll('.fe-card');
      feCards.forEach((card) => {
        const r = card.getBoundingClientRect();
        const x1 = fmLeft;
        const y1 = fmCenterY;
        const x2 = r.right - area.left;
        const y2 = r.top + r.height / 2 - area.top;
        const cx = (x1 + x2) / 2;
        paths.push(`M ${x1} ${y1} Q ${cx} ${y1}, ${cx} ${(y1 + y2) / 2} T ${x2} ${y2}`);
      });
    }

    // FM → FC 곡선 (FM에서 FC로)
    if (fcColRef.current) {
      const fcCards = fcColRef.current.querySelectorAll('.fc-card');
      fcCards.forEach((card) => {
        const r = card.getBoundingClientRect();
        const x1 = fmRight;
        const y1 = fmCenterY;
        const x2 = r.left - area.left;
        const y2 = r.top + r.height / 2 - area.top;
        const cx = (x1 + x2) / 2;
        paths.push(`M ${x1} ${y1} Q ${cx} ${y1}, ${cx} ${(y1 + y2) / 2} T ${x2} ${y2}`);
      });
    }

    setSvgPaths(paths);
  }, [chainAreaRef, fmNodeRef, feColRef, fcColRef]);

  useEffect(() => {
    const timer = setTimeout(drawLines, 100);
    window.addEventListener('resize', drawLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', drawLines);
    };
  }, [drawLines, linkedFEs, linkedFCs, currentFM]);

  return { svgPaths, drawLines };
}


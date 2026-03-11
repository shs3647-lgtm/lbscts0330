// @ts-nocheck
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
      console.log('[SVG] drawLines 스킵: ref가 null');
      setSvgPaths([]);
      return;
    }
    const area = chainAreaRef.current.getBoundingClientRect();
    const fmRect = fmNodeRef.current.getBoundingClientRect();
    
    // DOM이 아직 렌더링되지 않은 경우 (크기가 0인 경우)
    if (fmRect.width === 0 || fmRect.height === 0) {
      console.log('[SVG] drawLines 스킵: FM 노드 크기가 0');
      return;
    }
    
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
    console.log('[SVG] 화살표 그리기 완료:', paths.length, '개');
  }, [chainAreaRef, fmNodeRef, feColRef, fcColRef]);

  useEffect(() => {
    console.log('[SVG] useEffect 실행: linkedFEs=', linkedFEs.size, 'linkedFCs=', linkedFCs.size, 'currentFM=', !!currentFM);
    
    // 여러 타이밍에 drawLines 호출 (카드 렌더링 후 확실히 그리기)
    const timer1 = setTimeout(drawLines, 50);
    const timer2 = setTimeout(drawLines, 150);
    const timer3 = setTimeout(drawLines, 300);
    const timer4 = setTimeout(drawLines, 500);
    const timer5 = setTimeout(drawLines, 1000);
    const timer6 = setTimeout(drawLines, 2000);
    window.addEventListener('resize', drawLines);
    
    // MutationObserver로 DOM 변경 감지
    const observer = new MutationObserver(() => {
      setTimeout(drawLines, 50);
    });
    
    // ref.current가 있을 때 observe 등록
    const setupObserver = () => {
      if (chainAreaRef.current) {
        observer.observe(chainAreaRef.current, { childList: true, subtree: true });
        console.log('[SVG] MutationObserver 등록 완료');
      }
    };
    
    // 즉시 등록 시도
    setupObserver();
    
    // ref가 아직 null이면 나중에 다시 시도
    const observerTimer = setTimeout(setupObserver, 100);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timer6);
      clearTimeout(observerTimer);
      window.removeEventListener('resize', drawLines);
      observer.disconnect();
    };
  }, [drawLines, linkedFEs, linkedFCs, currentFM, chainAreaRef]);

  return { svgPaths, drawLines };
}


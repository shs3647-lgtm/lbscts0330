/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useSVGLines.ts
 * @description SVG 연결선 계산 훅
 *
 * 성능 최적화 (2026-02-11):
 * - 6개 연속 setTimeout → RAF 기반 재시도 루프로 통합
 * - MutationObserver 콜백 디바운스 (50ms)
 * - resize 핸들러 RAF 스로틀
 *
 * ★ 2026-03-24: ref 일시 null / FM 노드 0×0 레이아웃 프레임에서 setSvgPaths([]) 금지
 *   (연결확정·FM 전환 직후 화살표 영구 소실 방지 — 이전 경로 유지, 상위에서 재호출)
 */

import { useState, useCallback, useEffect, useRef, RefObject } from 'react';

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
  const rafIdRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drawLines = useCallback(() => {
    // ★ ref가 한 프레임 비거나 레이아웃 전이면 setSvgPaths([]) 금지 — 화살표 영구 소실 방지
    if (!chainAreaRef.current || !fmNodeRef.current) {
      return;
    }
    const area = chainAreaRef.current.getBoundingClientRect();
    const fmRect = fmNodeRef.current.getBoundingClientRect();

    // DOM이 아직 렌더링되지 않은 경우 (크기가 0) — 이전 경로 유지, 재시도는 MutationObserver·상위 effect
    if (fmRect.width === 0 || fmRect.height === 0) {
      return;
    }

    const fmCenterY = fmRect.top + fmRect.height / 2 - area.top;
    const fmLeft = fmRect.left - area.left;
    const fmRight = fmRect.right - area.left;

    const paths: string[] = [];
    const R = 6; // 직각 꺾임 라운드 반경

    /**
     * Backbone(등뼈) 직교 라우팅 — 가림 근본 해결
     * FM에서 수평→수직 척추선→수평 분기로 각 카드에 연결
     *
     *  FE1 ──┤         ┌── FC1
     *  FE2 ──┤         ├── FC2
     *        └── FM ───┤
     *                  ├── FC3
     *                  └── FC4
     */
    const makeSpinePath = (
      startX: number, startY: number,
      endX: number, endY: number,
      spineX: number
    ): string => {
      const dy = endY - startY;
      // 같은 높이면 직선
      if (Math.abs(dy) < 2) {
        return `M ${startX} ${startY} L ${endX} ${endY}`;
      }
      const signY = dy > 0 ? 1 : -1;
      const dirToSpine = spineX > startX ? 1 : -1;
      const dirToEnd = endX > spineX ? 1 : -1;
      const r = Math.min(R, Math.abs(dy) / 2, Math.abs(spineX - startX) / 2, Math.abs(endX - spineX) / 2);

      return [
        `M ${startX} ${startY}`,
        `L ${spineX - dirToSpine * r} ${startY}`,
        `Q ${spineX} ${startY} ${spineX} ${startY + signY * r}`,
        `L ${spineX} ${endY - signY * r}`,
        `Q ${spineX} ${endY} ${spineX + dirToEnd * r} ${endY}`,
        `L ${endX} ${endY}`,
      ].join(' ');
    };

    // FM → FE (왼쪽) — backbone 직교 라우팅
    if (feColRef.current) {
      const feCards = feColRef.current.querySelectorAll('.fe-card');
      if (feCards.length > 0) {
        const rects = Array.from(feCards).map(card => {
          const r = card.getBoundingClientRect();
          return { x: r.right - area.left, y: r.top + r.height / 2 - area.top };
        });
        const feMaxRight = Math.max(...rects.map(r => r.x));
        const spineX = feMaxRight + (fmLeft - feMaxRight) * 0.5;
        rects.forEach(r => {
          paths.push(makeSpinePath(fmLeft, fmCenterY, r.x, r.y, spineX));
        });
      }
    }

    // FM → FC (오른쪽) — backbone 직교 라우팅
    if (fcColRef.current) {
      const fcCards = fcColRef.current.querySelectorAll('.fc-card');
      if (fcCards.length > 0) {
        const rects = Array.from(fcCards).map(card => {
          const r = card.getBoundingClientRect();
          return { x: r.left - area.left, y: r.top + r.height / 2 - area.top };
        });
        const fcMinLeft = Math.min(...rects.map(r => r.x));
        const spineX = fmRight + (fcMinLeft - fmRight) * 0.5;
        rects.forEach(r => {
          paths.push(makeSpinePath(fmRight, fmCenterY, r.x, r.y, spineX));
        });
      }
    }

    setSvgPaths(paths);
  }, [chainAreaRef, fmNodeRef, feColRef, fcColRef]);

  /** drawLines를 RAF로 스케줄링 (중복 호출 방지) */
  const scheduleDrawLines = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(drawLines);
  }, [drawLines]);

  useEffect(() => {

    // RAF 기반 재시도 루프: 카드 렌더링 완료까지 주기적으로 drawLines 호출
    // (기존 6개 setTimeout 50/150/300/500/1000/2000ms를 대체)
    let retryCount = 0;
    const MAX_RETRIES = 10;         // 최대 10회 재시도
    const RETRY_INTERVAL_MS = 200;  // 200ms 간격
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const retryDraw = () => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        drawLines();
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          retryTimer = setTimeout(retryDraw, RETRY_INTERVAL_MS);
        }
      });
    };

    // 첫 번째 draw는 즉시 RAF로
    retryDraw();

    // resize 핸들러: RAF 스로틀 적용
    const handleResize = () => {
      scheduleDrawLines();
    };
    window.addEventListener('resize', handleResize);

    // MutationObserver로 DOM 변경 감지 (디바운스 50ms)
    const observer = new MutationObserver(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        scheduleDrawLines();
      }, 50);
    });

    // ref.current가 있을 때 observe 등록
    const setupObserver = () => {
      if (chainAreaRef.current) {
        observer.observe(chainAreaRef.current, { childList: true, subtree: true });
      }
    };

    // 즉시 등록 시도
    setupObserver();

    // ref가 아직 null이면 나중에 다시 시도
    const observerTimer = setTimeout(setupObserver, 100);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      cancelAnimationFrame(rafIdRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      clearTimeout(observerTimer);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [drawLines, scheduleDrawLines, chainAreaRef]);

  return { svgPaths, drawLines };
}


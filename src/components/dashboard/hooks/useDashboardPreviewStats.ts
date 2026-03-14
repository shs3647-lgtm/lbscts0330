/**
 * @file useDashboardPreviewStats.ts
 * @description FMEA 대시보드 통계 데이터 패칭 훅 (SRP 분리)
 *
 * 근본원인 수정:
 * React Strict Mode에서 double-mount 시 1차 마운트 cleanup이
 * AbortController.abort()를 호출 → AbortError catch → setError(true)
 * → 2차 마운트에서 데이터 정상 로드되어도 error 상태 잔존
 *
 * 해결: useRef(isMounted)로 cleanup 후 상태 업데이트 차단
 */
'use client';

import { useState, useEffect, useRef } from 'react';

export interface FmeaStats {
  total: number;
  pfmea: { master: number; family: number; part: number };
  dfmea: number;
  bd: number;
  linked: { cp: number; pfd: number };
}

const EMPTY: FmeaStats = {
  total: 0,
  pfmea: { master: 0, family: 0, part: 0 },
  dfmea: 0,
  bd: 0,
  linked: { cp: 0, pfd: 0 },
};

const TIMEOUT_MS = 5000;

export function useDashboardPreviewStats() {
  const [stats, setStats] = useState<FmeaStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    // ★ 매 마운트 시 에러 상태 초기화 (double-mount 대응)
    setError(false);
    setLoading(true);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    fetch('/api/fmea/dashboard-stats', { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => {
        if (!isMounted.current) return;
        if (d.success) setStats(d.stats);
      })
      .catch((err) => {
        // ★ cleanup abort일 경우 상태 업데이트 하지 않음
        if (!isMounted.current) return;

        if (err instanceof DOMException && err.name === 'AbortError') {
          console.error('[Dashboard] API 타임아웃 (5초)');
        } else {
          console.error('[Dashboard] 통계 로드 실패:', err);
        }
        setError(true);
      })
      .finally(() => {
        clearTimeout(timer);
        if (isMounted.current) setLoading(false);
      });

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  return { stats, loading, error };
}

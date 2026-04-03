/**
 * @file LazyApqpName.tsx
 * @description APQP 프로젝트명을 지연 로딩하는 경량 컴포넌트
 *
 * ★★★ 설계 원칙 ★★★
 * 1. FMEA/CP/PFD 리스트의 메인 렌더링을 차단하지 않음
 * 2. IntersectionObserver로 뷰포트에 들어올 때만 fetch
 * 3. 전역 캐시(Map)로 동일 apqpNo 중복 요청 방지
 * 4. 실패 시 graceful fallback ("-")
 *
 * @created 2026-04-03
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// ★ 전역 캐시: 세션 동안 APQP 프로젝트명 유지 (중복 API 호출 방지)
const apqpNameCache = new Map<string, string | null>();
const pendingFetches = new Map<string, Promise<string | null>>();

/**
 * 단일 apqpNo에 대한 프로젝트명 fetch (중복제거 + 캐시)
 */
async function fetchApqpName(apqpNo: string): Promise<string | null> {
  const key = apqpNo.toLowerCase();

  // 캐시 히트
  if (apqpNameCache.has(key)) return apqpNameCache.get(key) || null;

  // 이미 진행 중인 요청이 있으면 대기
  if (pendingFetches.has(key)) return pendingFetches.get(key)!;

  // 새 요청 (dedup)
  const promise = (async () => {
    try {
      const res = await fetch(`/api/apqp?apqpNo=${encodeURIComponent(key)}`);
      if (!res.ok) { apqpNameCache.set(key, null); return null; }
      const data = await res.json();
      const name = data.apqp?.subject || data.apqp?.productName || null;
      apqpNameCache.set(key, name);
      return name;
    } catch {
      apqpNameCache.set(key, null);
      return null;
    } finally {
      pendingFetches.delete(key);
    }
  })();

  pendingFetches.set(key, promise);
  return promise;
}

// ★ 배치 로딩: 여러 apqpNo를 한 번에 캐시 프리로드
export async function preloadApqpNames(apqpNos: string[]): Promise<void> {
  const uncached = [...new Set(apqpNos.filter(n => n && !apqpNameCache.has(n.toLowerCase())))];
  if (uncached.length === 0) return;

  try {
    const res = await fetch(`/api/apqp`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.apqps) {
      for (const a of data.apqps) {
        apqpNameCache.set(a.apqpNo.toLowerCase(), a.subject || a.productName || a.apqpNo);
      }
    }
  } catch { /* silent */ }
}

interface LazyApqpNameProps {
  apqpNo: string | null | undefined;
  /** 이미 서버에서 받아온 이름이 있으면 캐시 프라이밍 + 즉시 렌더 */
  preloadedName?: string | null;
}

/**
 * 가상화된 APQP 프로젝트명 셀
 * - 뷰포트에 보이면 → 캐시 / fetch로 이름 로드
 * - 안 보이면 → placeholder만 렌더 (React 부하 0)
 */
export default function LazyApqpName({ apqpNo, preloadedName }: LazyApqpNameProps) {
  const [name, setName] = useState<string | null>(preloadedName || null);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // 프리로드된 이름이 있으면 캐시에 저장
  useEffect(() => {
    if (preloadedName && apqpNo) {
      apqpNameCache.set(apqpNo.toLowerCase(), preloadedName);
      setName(preloadedName);
    }
  }, [preloadedName, apqpNo]);

  // IntersectionObserver: 뷰포트에 보일 때만 fetch
  useEffect(() => {
    if (!apqpNo || name) return; // 이미 이름 있으면 skip
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '100px' } // 100px 미리 로드
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [apqpNo, name]);

  // 뷰포트 진입 시 fetch
  useEffect(() => {
    if (!isVisible || !apqpNo || name) return;
    fetchApqpName(apqpNo).then(n => { if (n) setName(n); });
  }, [isVisible, apqpNo, name]);

  if (!apqpNo) return <span className="text-gray-300 text-[8px]">-</span>;

  return (
    <span ref={ref}>
      {name ? (
        <Link
          href={`/apqp/register?id=${apqpNo.toLowerCase()}`}
          prefetch={false}
          className="text-emerald-700 hover:underline text-[9px] font-semibold"
          onClick={e => e.stopPropagation()}
          title={name}
        >
          {name}
        </Link>
      ) : (
        <span className="text-gray-300 text-[8px]">{isVisible ? '...' : '-'}</span>
      )}
    </span>
  );
}

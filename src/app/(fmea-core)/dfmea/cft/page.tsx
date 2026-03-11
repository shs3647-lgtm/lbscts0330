/**
 * @file page.tsx
 * @description CFT 페이지 → FMEA 등록 화면의 CFT 섹션으로 이동 (FMEA ID 전달)
 */

'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CFTRedirectPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fmeaId = searchParams.get('id');

  useEffect(() => {
    // FMEA 등록 화면의 CFT 섹션으로 이동 (FMEA ID 전달)
    if (fmeaId) {
      router.replace(`/dfmea/register?id=${fmeaId}#cft-section`);
    } else {
      router.replace('/dfmea/register#cft-section');
    }
  }, [router, fmeaId]);

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl mb-2">🔄</div>
        <p className="text-sm text-gray-600">CFT 리스트로 이동 중...</p>
      </div>
    </div>
  );
}

export default function CFTRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-sm text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <CFTRedirectPageInner />
    </Suspense>
  );
}

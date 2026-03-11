/**
 * @file page.tsx
 * @description /pfmea/import → /pfmea/import/legacy 리다이렉트
 * 기존 Import 페이지는 legacy/page.tsx로 이전됨
 * @created 2026-02-26
 */

'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ImportRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('id');
    const qs = id ? `?id=${encodeURIComponent(id)}` : '';
    router.replace(`/pfmea/import/legacy${qs}`);
  }, [router, searchParams]);

  return (
    <div className="h-screen flex items-center justify-center text-gray-400 text-sm">
      리다이렉트 중...
    </div>
  );
}

export default function PFMEAImportPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-gray-400 text-sm">Loading...</div>}>
      <ImportRedirect />
    </Suspense>
  );
}

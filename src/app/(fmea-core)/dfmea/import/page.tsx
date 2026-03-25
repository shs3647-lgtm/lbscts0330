/**
 * @file page.tsx
 * @description /dfmea/import -> /dfmea/import/legacy 리다이렉트
 * @created 2026-03-26
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
    router.replace(`/dfmea/import/legacy${qs}`);
  }, [router, searchParams]);

  return (
    <div className="h-screen flex items-center justify-center text-gray-400 text-sm">
      리다이렉트 중...
    </div>
  );
}

export default function DFMEAImportPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-gray-400 text-sm">Loading...</div>}>
      <ImportRedirect />
    </Suspense>
  );
}

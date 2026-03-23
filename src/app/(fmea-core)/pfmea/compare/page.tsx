'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const CompareSplitView = dynamic(() => import('./components/CompareSplitView'), { ssr: false });

export default function PfmeaComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">비교 뷰 로딩…</div>
      }
    >
      <CompareSplitView />
    </Suspense>
  );
}

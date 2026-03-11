/**
 * @file layout.tsx
 * @description DFMEA Import 공유 레이아웃
 * - FixedLayout + DFMEATopNav (상단)
 * - ImportModeMenuBar (수동/자동/기존데이터 고정 메뉴)
 * @created 2026-02-26
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DFMEATopNav from '@/components/layout/DFMEATopNav';
import FixedLayout from '@/components/layout/FixedLayout';

function ImportLayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const selectedFmeaId = searchParams.get('id') || '';

  return (
    <FixedLayout
      topNav={<DFMEATopNav selectedFmeaId={selectedFmeaId} />}
      topNavHeight={48}
      showSidebar={true}
      contentPadding="px-3 py-3"
    >
      <div className="bg-gray-100">
        {children}
      </div>
    </FixedLayout>
  );
}

export default function DFMEAImportLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-gray-400 text-sm">Loading...</div>}>
      <ImportLayoutContent>{children}</ImportLayoutContent>
    </Suspense>
  );
}

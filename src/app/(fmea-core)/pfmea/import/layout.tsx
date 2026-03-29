/**
 * @file layout.tsx
 * @description PFMEA Import 공유 레이아웃
 * - FixedLayout + PFMEATopNav (상단)
 * - ImportModeMenuBar (수동/자동/기존데이터 고정 메뉴)
 * @created 2026-02-26
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PFMEATopNav from '@/components/layout/PFMEATopNav';
import FixedLayout from '@/components/layout/FixedLayout';
import ImportModeMenuBar from './components/ImportModeMenuBar';
import { useRouter, usePathname } from 'next/navigation';

function ImportLayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedFmeaId = searchParams.get('id') || '';

  // URL 경로에서 현재 모드 판단
  const activeMode: 'manual' | 'legacy' = pathname?.includes('/manual') ? 'manual' : 'legacy';

  return (
    <FixedLayout
      topNav={<PFMEATopNav selectedFmeaId={selectedFmeaId} />}
      topNavHeight={48}
      showSidebar={true}
      contentPadding="px-3 py-3"
    >
      <div className="bg-gray-100">
        <ImportModeMenuBar
          activeMode={activeMode}
          fmeaId={selectedFmeaId}
        />
        {children}
      </div>
    </FixedLayout>
  );
}

export default function PFMEAImportLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-gray-400 text-sm">Loading...</div>}>
      <ImportLayoutContent>{children}</ImportLayoutContent>
    </Suspense>
  );
}

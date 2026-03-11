/**
 * @file page.tsx
 * @description CFT 페이지 → PFD 등록 화면으로 리다이렉트
 * CFT 기능은 PFD 등록 화면에 통합됨
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PFDCFTRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // PFD 등록 화면으로 리다이렉트
    router.replace('/pfd/register');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl mb-2">🔄</div>
        <p className="text-sm text-gray-600">PFD 등록 화면으로 이동 중...</p>
      </div>
    </div>
  );
}

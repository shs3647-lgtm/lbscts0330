/**
 * @file page.tsx
 * @description Control Plan 메인 페이지 → worksheet로 리다이렉트
 * PFMEA와 동일한 구조 유지
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ControlPlanRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Control Plan 워크시트 화면으로 리다이렉트
    router.replace('/control-plan/worksheet');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl mb-2">🔄</div>
        <p className="text-sm text-gray-600">CP 작성화면으로 이동 중...</p>
      </div>
    </div>
  );
}

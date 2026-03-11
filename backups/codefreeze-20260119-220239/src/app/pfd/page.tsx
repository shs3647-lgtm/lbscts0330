'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PFDRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pfd/worksheet');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl mb-2">🔄</div>
        <p className="text-sm text-gray-600">PFD 작성 화면으로 이동 중...</p>
      </div>
    </div>
  );
}




















/**
 * @file page.tsx
 * @description DFMEA 리스트 페이지 (placeholder)
 * @version 0.1.0
 * Phase 1: 라우팅 껍데기 - 추후 PFMEA 리스트 클론 + DFMEA 용어 적용
 */

'use client';

import React from 'react';
import { FixedLayout } from '@/components/layout';

export default function DFMEAListPage() {
  return (
    <FixedLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <div className="text-6xl mb-4">D</div>
        <h1 className="text-2xl font-bold text-white mb-2">DFMEA 리스트</h1>
        <p className="text-sm">DFMEA(Design FMEA) 프로젝트 목록 - 개발 예정</p>
        <div className="mt-6 px-4 py-2 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300 text-xs">
          Phase 4 워크시트 개발 후 활성화됩니다
        </div>
      </div>
    </FixedLayout>
  );
}

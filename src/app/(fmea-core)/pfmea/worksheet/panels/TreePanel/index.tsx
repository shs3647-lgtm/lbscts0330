/**
 * TreePanel - 레이지 로딩 래퍼
 * 
 * 이 파일은 레이지 로딩을 위한 진입점
 * 실제 컴포넌트는 TreePanel.tsx에 구현
 */

'use client';

import dynamic from 'next/dynamic';

// 레이지 로딩: 이 패널이 활성화될 때만 로드됨
const TreePanel = dynamic(() => import('./TreePanel'), {
  loading: () => (
    <div className="flex justify-center items-center h-full text-sm text-gray-500">
      ⏳ 트리 로딩 중...
    </div>
  ),
  ssr: false,
});

export default TreePanel;





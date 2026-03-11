/**
 * @file /approval/complete/page.tsx
 * @description 결재 완료 페이지
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function ApprovalCompletePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
        <div className="text-center">
          <span className="text-6xl">✅</span>
          <h1 className="text-2xl font-bold text-green-600 mt-4">
            결재가 완료되었습니다!
          </h1>
          <p className="text-gray-600 mt-2">
            결재 처리가 성공적으로 완료되었습니다.<br/>
            요청자에게 결과가 통보되었습니다.
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => router.push('/welcomeboard')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              메인으로 이동
            </button>
            <button
              onClick={() => window.close()}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              창 닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
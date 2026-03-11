/**
 * @file /src/app/myjob/page.tsx
 * @description MyJob 서버 페이지 — Suspense 래핑으로 useSearchParams 빌드 오류 해결
 * @created 2026-02-02
 * @updated 2026-03-07 Suspense boundary 적용 (Next.js 16 빌드 요구사항)
 */

import { Suspense } from 'react';
import MyJobClient from './MyJobClient';

export default function MyJobPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-400">로딩 중...</div>}>
            <MyJobClient />
        </Suspense>
    );
}

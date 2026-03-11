/**
 * @file page.tsx
 * @description APQP 루트 페이지 → /apqp/worksheet로 리다이렉트
 */

import { redirect } from 'next/navigation';

export default function APQPPage() {
  redirect('/apqp/worksheet');
}









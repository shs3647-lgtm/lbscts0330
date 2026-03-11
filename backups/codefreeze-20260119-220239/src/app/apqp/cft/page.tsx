/**
 * @file page.tsx
 * @description APQP CFT 페이지 → register로 리다이렉트
 */

import { redirect } from 'next/navigation';

export default function APQPCFTPage() {
  redirect('/apqp/register');
}









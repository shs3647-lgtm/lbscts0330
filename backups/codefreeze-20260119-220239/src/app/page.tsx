/**
 * @file page.tsx
 * @description 루트 페이지 - Welcome Board로 리다이렉트
 */

import { redirect } from 'next/navigation';

export default function Home() {
  // Welcome Board로 자동 리다이렉트
  redirect('/welcomeboard');
}

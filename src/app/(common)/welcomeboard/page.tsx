/**
 * @file page.tsx
 * @description 웰컴보드 페이지 - 메인 페이지로 리다이렉트
 * @deprecated 2026-02-02 메인 페이지(/)로 통합됨
 */

import { redirect } from 'next/navigation';

export default function WelcomeBoardPage() {
  redirect('/');
}

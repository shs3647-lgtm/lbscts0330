/**
 * @file dfmea/register/page.tsx
 * @description DFMEA 등록 — PFMEA 등록 페이지 공유 (fmeaType=F로 자동 설정)
 */
import { redirect } from 'next/navigation';

export default function DFMEARegisterPage() {
  redirect('/pfmea/register?fmeaType=F');
}
